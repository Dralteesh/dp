import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, TextInput, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { HourlyChart } from "@/components/weather/HourlyChart";
import { PurpleToday } from "@/components/weather/PurpleToday";
import { WeatherGlyph } from "@/components/weather/WeatherGlyph";
import { Glass } from "@/components/ui/Glass";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { DAYS } from "@/constants/arabic";
import { DS } from "@/design/tokens";
import { inputAlign } from "@/lib/rtl";
import { kindOf, labelOf, searchCities, timeOf, type City, type DayPoint, type Kind, type Theme, type Weather } from "@/lib/weather";
import {
  aqiBreakdown,
  aqiInfo,
  buildAdvice,
  compass,
  dayBrief,
  fmtClock,
  fmtDist,
  fmtMm,
  fmtTemp,
  fmtWind,
  moonPhase,
  rainSoon,
  severeAlerts,
  whenText,
} from "@/lib/weatherInsights";
import { useWeather } from "@/store/useWeather";

const HOURS_SHOWN = 48;
const W = "#FFFFFF";

/** ألوان السماء (تدرّج أعلى/أسفل) بحسب الحالة: كلها من عائلة الكحلي/النيلي لتنسجم مع بقية الشاشات */
function skyOf(k: Kind, isDay: boolean): [string, string] {
  if (!isDay) return k === "clear" || k === "partly" ? ["#2E40A8", "#16206B"] : ["#2A3677", "#141B4A"];
  switch (k) {
    case "clear":
      return ["#4F8DFF", "#2757E0"];
    case "partly":
      return ["#4C87F5", "#3361D4"];
    case "cloudy":
      return ["#6F86BC", "#42558C"];
    case "fog":
      return ["#7D8CAE", "#4D5A7E"];
    case "drizzle":
    case "rain":
      return ["#4263B0", "#26397A"];
    case "snow":
      return ["#7FA8EA", "#5078C8"];
    case "storm":
      return ["#6A55D6", "#2F2678"];
  }
}

/** ثيم الصفحات الداكنة (يُمرَّر لمنحنى الساعات) */
const DARK: Theme = { bg: DS.night, ink: "#FFFFFF", soft: DS.glass, shape: DS.accent, shape2: "#93C5FD", accent: "#93C5FD", dark: true };

const isDayAt = (iso: string, days: DayPoint[], fallback: boolean) => {
  const d = days.find((x) => x.date === iso.slice(0, 10));
  if (!d || !d.sunrise || !d.sunset) return fallback;
  return iso >= d.sunrise && iso < d.sunset;
};

const dayName = (date: string, i: number) => (i === 0 ? "اليوم" : i === 1 ? "غدًا" : DAYS[new Date(`${date}T12:00:00`).getDay()]);

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};
const arc = (cx: number, cy: number, r: number, from: number, to: number) => {
  const a = polar(cx, cy, r, from);
  const b = polar(cx, cy, r, to);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
};

/** عدّاد الحرارة الدائري: قوس يبيّن موضع الحرارة الحالية بين صغرى اليوم وعظماه */
function TempDial({ temp, cur, lo, hi, label, sub, size = 250 }: { temp: string; cur: number; lo: number; hi: number; label: string; sub: string; size?: number }) {
  const C = size / 2;
  const R = C - 22;
  const START = 225;
  const END = 495;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center", alignSelf: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        {Array.from({ length: 48 }, (_, i) => {
          const deg = i * 7.5;
          const a = polar(C, C, C - 4, deg);
          const b = polar(C, C, C - (i % 4 === 0 ? 14 : 9), deg);
          return <Line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#FFFFFF" strokeOpacity={i % 4 === 0 ? 0.55 : 0.25} strokeWidth={2} strokeLinecap="round" />;
        })}
        <Path d={arc(C, C, R - 10, START, END)} stroke="#FFFFFF" strokeOpacity={0.18} strokeWidth={12} strokeLinecap="round" fill="none" />
      </Svg>
      <DialArc size={size} C={C} R={R - 10} START={START} END={END} cur={cur} lo={lo} hi={hi} />
      <View style={{ width: size * 0.56, height: size * 0.56, borderRadius: size * 0.28, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10 }}>
        <Text style={{ fontSize: 12, color: "#6B7280" }}>{label}</Text>
        <Text w="bold" style={{ fontSize: 44, lineHeight: 54, color: DS.night, fontVariant: ["tabular-nums"] }}>
          {temp}
        </Text>
        <Text style={{ fontSize: 11, color: "#6B7280" }}>{sub}</Text>
      </View>
    </View>
  );
}

/** قوس التقدّم (منفصل ليبقى TempDial بسيطًا) */
function DialArc({ size, C, R, START, END, cur, lo, hi }: { size: number; C: number; R: number; START: number; END: number; cur: number; lo: number; hi: number }) {
  const frac = hi > lo ? Math.min(Math.max((cur - lo) / (hi - lo), 0), 1) : 0.5;
  const ang = START + (END - START) * frac;
  const k = polar(C, C, R, ang);
  return (
    <Svg width={size} height={size} style={{ position: "absolute" }}>
      <Path d={arc(C, C, R, START, Math.max(ang, START + 1))} stroke="#FBC8A0" strokeWidth={12} strokeLinecap="round" fill="none" />
      <Circle cx={k.x} cy={k.y} r={9} fill="#FFFFFF" />
      <Circle cx={k.x} cy={k.y} r={4} fill={DS.accent} />
    </Svg>
  );
}

export default function WeatherScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const units = useWeather((s) => s.units);
  const rainAlert = useWeather((s) => s.rainAlert);
  const severeAlert = useWeather((s) => s.severeAlert);
  const setUnits = useWeather((s) => s.setUnits);
  const setAlerts = useWeather((s) => s.setAlerts);
  const cities = useWeather((s) => s.cities);
  const index = useWeather((s) => s.index);
  const cache = useWeather((s) => s.cache);
  const loading = useWeather((s) => s.loading);
  const error = useWeather((s) => s.error);
  const refresh = useWeather((s) => s.refresh);
  const setIndex = useWeather((s) => s.setIndex);
  const addCity = useWeather((s) => s.addCity);
  const removeCity = useWeather((s) => s.removeCity);

  const city = cities[index] ?? cities[0];
  const w: Weather | undefined = cache[city.id];

  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      refresh();
      return () => setFocused(false);
    }, [refresh]),
  );

  const [sel, setSel] = useState(0);
  const [tab, setTab] = useState<"today" | "tomorrow">("today");
  const [sheet, setSheet] = useState(false);
  const [optSheet, setOptSheet] = useState(false);
  const [daysCount, setDaysCount] = useState(7);
  const [H, setH] = useState(0);
  const [page, setPage] = useState(0);
  const pager = useRef<ScrollView>(null);
  useEffect(() => {
    setSel(0);
    setTab("today");
  }, [city.id]);
  const T = (c: number) => fmtTemp(c, units);

  // الساعات من الساعة الحالية فصاعدًا
  const hours = useMemo(() => {
    if (!w) return [];
    const key = w.now.time.slice(0, 13);
    let i = w.hours.findIndex((h) => h.time.slice(0, 13) === key);
    if (i < 0) i = 0;
    return w.hours.slice(i, i + HOURS_SHOWN);
  }, [w]);

  const todayKey = w?.now.time.slice(0, 10) ?? "";
  const tomorrowKey = w?.days[1]?.date ?? "";
  const hourList = useMemo(
    () => hours.map((h, i) => ({ h, i })).filter(({ h }) => h.time.slice(0, 10) === (tab === "today" ? todayKey : tomorrowKey)),
    [hours, tab, todayKey, tomorrowKey],
  );

  const pick = hours[Math.min(sel, Math.max(hours.length - 1, 0))];
  const showNow = !w || sel === 0 || !pick;
  const code = w ? (showNow ? w.now.code : pick.code) : 0;
  const temp = w ? (showNow ? w.now.temp : pick.temp) : 0;
  const isDay = w ? (showNow ? w.now.isDay : isDayAt(pick.time, w.days, w.now.isDay)) : true;
  const pop = w ? (showNow ? (hours[0]?.pop ?? 0) : pick.pop) : 0;
  const sky = skyOf(kindOf(code), isDay);
  const today = w?.days[0];
  const tmr = w?.days[1];

  const shownDays = w ? w.days.slice(0, daysCount) : [];
  const weekLo = shownDays.length ? Math.min(...shownDays.map((d) => d.min)) : 0;
  const weekHi = shownDays.length ? Math.max(...shownDays.map((d) => d.max)) : 1;
  const alerts = w ? severeAlerts(w) : [];
  const rain = w ? rainSoon(w) : null;
  const advice = w ? buildAdvice(w, T, city.name) : [];
  const moon = moonPhase(new Date());
  const hasBanner = alerts.length > 0 || (rain != null && rain.state !== "none");

  const goPage = (p: number) => {
    pager.current?.scrollTo({ y: p * H, animated: true });
    setPage(p);
  };
  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (H > 0) setPage(Math.round(e.nativeEvent.contentOffset.y / H));
  };

  const pickTab = (t: "today" | "tomorrow") => {
    setTab(t);
    if (t === "today") setSel(0);
    else {
      const first = hours.findIndex((h) => h.time.slice(0, 10) === tomorrowKey && h.time.slice(11, 13) >= "12");
      const any = hours.findIndex((h) => h.time.slice(0, 10) === tomorrowKey);
      setSel(first >= 0 ? first : Math.max(any, 0));
    }
  };

  const topPad = insets.top + 62;
  const botPad = Math.max(insets.bottom, 10) + 96;

  const stat = (icon: string, value: string, label: string) => (
    <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
      <Ionicons name={icon as never} size={20} color={W} style={{ opacity: 0.85 }} />
      <Text w="bold" style={{ fontSize: 15, color: W }}>
        {value}
      </Text>
      <Text style={{ fontSize: 11, color: W, opacity: 0.7 }}>{label}</Text>
    </View>
  );

  const tile = (icon: string, label: string, value: string) => (
    <Glass style={{ width: "48.5%", padding: 14, gap: 4 }} radius={22}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons name={icon as never} size={16} color={W} style={{ opacity: 0.7 }} />
        <Text style={{ fontSize: 12, color: W, opacity: 0.65 }}>{label}</Text>
      </View>
      <Text w="bold" style={{ fontSize: 19, color: W }}>
        {value}
      </Text>
    </Glass>
  );

  const roundBtn = (icon: string, label: string, on: () => void, busy = false) => (
    <Pressable onPress={on} accessibilityLabel={label} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: DS.glassStrong, alignItems: "center", justifyContent: "center" }}>
      {busy ? <ActivityIndicator size="small" color={W} /> : <Ionicons name={icon as never} size={20} color={W} />}
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: DS.night }}>
      {focused ? <StatusBar style="light" /> : null}
      {/* توهّج السماء خلف الشاشة */}
      <View pointerEvents="none" style={{ position: "absolute", top: -170, alignSelf: "center", width: 520, height: 420, borderRadius: 260, backgroundColor: sky[0], opacity: 0.28 }} />

      {/* الترويسة (ثابتة فوق الصفحات) */}
      <View style={{ position: "absolute", top: insets.top + 8, start: 16, end: 16, zIndex: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        {roundBtn("options-outline", "الوحدات والتنبيهات", () => setOptSheet(true))}
        <View style={{ alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {cities.length > 1 ? (
              <Pressable hitSlop={10} onPress={() => setIndex(index + 1)} accessibilityLabel="المدينة التالية">
                <Ionicons name="chevron-back" size={18} color={W} style={{ opacity: 0.7 }} />
              </Pressable>
            ) : null}
            <Pressable onPress={() => setSheet(true)} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Ionicons name="location" size={16} color={W} />
              <Text w="bold" numberOfLines={1} style={{ fontSize: 18, color: W, maxWidth: 170 }}>
                {city.name}
              </Text>
            </Pressable>
            {cities.length > 1 ? (
              <Pressable hitSlop={10} onPress={() => setIndex(index - 1)} accessibilityLabel="المدينة السابقة">
                <Ionicons name="chevron-forward" size={18} color={W} style={{ opacity: 0.7 }} />
              </Pressable>
            ) : null}
          </View>
          <Text style={{ fontSize: 11, color: W, opacity: 0.6, marginTop: 1 }}>
            {loading ? "جارٍ التحديث…" : w ? `آخر تحديث ${new Date(w.fetchedAt).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}` : "الطقس"}
          </Text>
        </View>
        {roundBtn("add", "المدن", () => setSheet(true))}
      </View>

      {!w ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 30 }}>
          {loading ? (
            <ActivityIndicator color={W} />
          ) : (
            <>
              <Ionicons name="cloud-offline-outline" size={44} color={W} />
              <Text style={{ color: W, textAlign: "center" }}>{error ?? "لا بيانات بعد"}</Text>
              <Pressable onPress={() => refresh(true)} style={{ backgroundColor: DS.accent, borderRadius: 20, paddingHorizontal: 22, paddingVertical: 10 }}>
                <Text w="bold" style={{ color: W }}>
                  إعادة المحاولة
                </Text>
              </Pressable>
            </>
          )}
        </View>
      ) : (
        <View style={{ flex: 1 }} onLayout={(e) => setH(Math.round(e.nativeEvent.layout.height))}>
          {H > 0 ? (
            <ScrollView ref={pager} pagingEnabled showsVerticalScrollIndicator={false} onMomentumScrollEnd={onEnd} bounces={false} decelerationRate="fast">
              {/* ───────── الصفحة 1: الآن + الساعات ───────── */}
              <View style={{ height: H, paddingTop: topPad, paddingBottom: botPad, paddingHorizontal: 16, gap: 12 }}>
                {hasBanner ? (
                  <View style={{ gap: 6 }}>
                    {alerts.slice(0, 1).map((a) => (
                      <View key={a.kind} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: a.level === 2 ? "#DC2626" : "#F59E0B", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 }}>
                        <Ionicons name="warning" size={20} color={W} />
                        <Text w="bold" numberOfLines={1} style={{ color: W, fontSize: 13, flex: 1 }}>
                          {a.title} · {whenText(w, a.time)}
                        </Text>
                      </View>
                    ))}
                    {rain && rain.state !== "none" ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: DS.glassStrong, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 }}>
                        <Ionicons name="rainy-outline" size={20} color={W} />
                        <Text w="semi" numberOfLines={1} style={{ color: W, fontSize: 13, flex: 1 }}>
                          {rain.text}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* بطاقة البطل */}
                <Glass colors={sky} style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 16, justifyContent: "space-between" }} radius={34}>
                  <View style={{ alignItems: "center" }}>
                    <WeatherGlyph code={code} isDay={isDay} size={H < 700 ? 130 : 168} />
                    <Text style={{ fontSize: H < 700 ? 84 : 104, lineHeight: H < 700 ? 92 : 112, color: W, fontVariant: ["tabular-nums"], marginTop: -4 }}>{T(temp)}</Text>
                    <Text w="bold" style={{ fontSize: 22, color: W }}>
                      {labelOf(code, isDay)}
                    </Text>
                    <Text style={{ fontSize: 12.5, color: W, opacity: 0.75, marginTop: 2 }}>
                      {showNow ? `يُحسّ كـ ${T(w.now.feels)}` : `${pick.time.slice(0, 10) === todayKey ? "اليوم" : "غدًا"} · الساعة ${timeOf(pick.time)}`}
                      {today ? ` · العظمى ${T(today.max)} · الصغرى ${T(today.min)}` : ""}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.18)", paddingTop: 12 }}>
                    {stat("flag-outline", fmtWind(w.now.wind, units), "الرياح")}
                    {stat("water-outline", `${Math.round(w.now.humidity)}%`, "الرطوبة")}
                    {stat("umbrella-outline", `${Math.round(pop)}%`, "احتمال المطر")}
                  </View>
                </Glass>

                {/* لوحة الساعات: اليوم / غدًا / 7 أيام */}
                <Glass style={{ padding: 12, gap: 10 }} radius={28}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {(
                      [
                        { k: "today", label: "اليوم" },
                        { k: "tomorrow", label: "غدًا" },
                      ] as const
                    ).map((t) => (
                      <Pressable key={t.k} onPress={() => pickTab(t.k)} style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, backgroundColor: tab === t.k ? W : "transparent" }}>
                        <Text w={tab === t.k ? "bold" : "semi"} style={{ fontSize: 13, color: tab === t.k ? DS.night : W, opacity: tab === t.k ? 1 : 0.75 }}>
                          {t.label}
                        </Text>
                      </Pressable>
                    ))}
                    <View style={{ flex: 1 }} />
                    <Pressable onPress={() => goPage(2)} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Text w="semi" style={{ fontSize: 12.5, color: W, opacity: 0.75 }}>
                        7 أيام
                      </Text>
                      <Ionicons name="chevron-down" size={14} color={W} style={{ opacity: 0.75 }} />
                    </Pressable>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {hourList.length === 0 ? (
                      <Text style={{ color: W, opacity: 0.6, paddingVertical: 20 }}>لا بيانات لهذا اليوم</Text>
                    ) : (
                      hourList.map(({ h, i }) => {
                        const on = i === sel;
                        const hrDay = isDayAt(h.time, w.days, true);
                        return (
                          <Pressable
                            key={h.time}
                            onPress={() => setSel(i)}
                            style={{ width: 64, paddingVertical: 10, borderRadius: 22, alignItems: "center", gap: 3, backgroundColor: on ? W : DS.glass, borderWidth: on ? 0 : 1, borderColor: DS.glassBorder }}
                          >
                            <Text style={{ fontSize: 11, color: on ? DS.night : W, opacity: on ? 0.8 : 0.7 }}>{i === 0 ? "الآن" : timeOf(h.time)}</Text>
                            <WeatherGlyph code={h.code} isDay={hrDay} size={34} />
                            <Text w="bold" style={{ fontSize: 15, color: on ? DS.night : W }}>
                              {T(h.temp)}
                            </Text>
                          </Pressable>
                        );
                      })
                    )}
                  </ScrollView>
                </Glass>
              </View>

              {/* ───────── الصفحة 2: اليوم (نيلي) ───────── */}
              <View style={{ height: H }}>
                <PurpleToday
                  w={w}
                  cityName={city.name}
                  units={units}
                  T={T}
                  hours={hours}
                  sel={sel}
                  setSel={setSel}
                  code={code}
                  temp={temp}
                  isDay={isDay}
                  dayAt={(iso) => isDayAt(iso, w.days, true)}
                  onWeek={() => goPage(2)}
                  topPad={topPad}
                  botPad={botPad}
                />
              </View>

              {/* ───────── الصفحة 3: غدًا + الأسبوع ───────── */}
              <View style={{ height: H, paddingTop: topPad, paddingBottom: botPad, paddingHorizontal: 16, gap: 12 }}>
                {tmr ? (
                  <Glass colors={skyOf(kindOf(tmr.code), true)} style={{ padding: 16 }} radius={32}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <WeatherGlyph code={tmr.code} isDay size={92} />
                      <View style={{ flex: 1, alignItems: "flex-end" }}>
                        <Text style={{ fontSize: 14, color: W, opacity: 0.8 }}>غدًا</Text>
                        <Text style={{ fontSize: 46, lineHeight: 54, color: W, fontVariant: ["tabular-nums"] }}>
                          {T(tmr.max)}
                          <Text style={{ fontSize: 22, color: W, opacity: 0.65 }}> / {T(tmr.min)}</Text>
                        </Text>
                        <Text w="semi" style={{ fontSize: 13, color: W, opacity: 0.8 }}>
                          {labelOf(tmr.code, true)}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.18)", marginTop: 12, paddingTop: 12 }}>
                      {stat("umbrella-outline", `${Math.round(tmr.pop)}%`, "احتمال المطر")}
                      {stat("sunny-outline", String(Math.round(tmr.uv)), "مؤشر UV")}
                      {stat("rainy-outline", tmr.precipSum != null ? fmtMm(tmr.precipSum) : "—", "الهطول")}
                    </View>
                  </Glass>
                ) : null}

                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text w="bold" style={{ fontSize: 16, color: W }}>
                    الأيام القادمة
                  </Text>
                  {w.days.length > 7 ? (
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {[7, 10, 14].map((n) => (
                        <Pressable key={n} onPress={() => setDaysCount(n)} style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: daysCount === n ? W : DS.glass }}>
                          <Text w="bold" style={{ fontSize: 12, color: daysCount === n ? DS.night : W }}>
                            {n}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>

                <Glass style={{ flex: 1 }} radius={28}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 4 }}>
                    {shownDays.map((d, i) => {
                      const span = Math.max(weekHi - weekLo, 1);
                      const left = ((d.min - weekLo) / span) * 100;
                      const width = Math.max(((d.max - d.min) / span) * 100, 8);
                      return (
                        <View key={d.date} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: DS.glassBorder }}>
                          <Text w="semi" style={{ width: 54, fontSize: 14, color: W }}>
                            {dayName(d.date, i)}
                          </Text>
                          <WeatherGlyph code={d.code} isDay size={34} />
                          <Text style={{ width: 34, fontSize: 11, color: "#93C5FD", textAlign: "center" }}>{d.pop >= 20 ? `${Math.round(d.pop)}%` : ""}</Text>
                          <Text style={{ width: 30, fontSize: 13, color: W, opacity: 0.6, textAlign: "right", direction: "ltr" }}>{T(d.min)}</Text>
                          <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.14)", direction: "ltr" }}>
                            <View style={{ position: "absolute", left: `${left}%`, width: `${Math.min(width, 100 - left)}%`, top: 0, bottom: 0, borderRadius: 3, backgroundColor: "#A5B4FC" }} />
                          </View>
                          <Text w="bold" style={{ width: 30, fontSize: 13, color: W, direction: "ltr" }}>
                            {T(d.max)}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </Glass>
              </View>

              {/* ───────── الصفحة 4: العدّاد والتفاصيل ───────── */}
              <View style={{ height: H, paddingTop: topPad, paddingBottom: botPad }}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 14 }}>
                  <Glass colors={["#6D5BF0", "#3A2E9E"]} style={{ paddingVertical: 18, paddingHorizontal: 12, alignItems: "center", gap: 12 }} radius={34}>
                    <Text w="bold" style={{ fontSize: 18, color: W }}>
                      الحرارة · {city.name}
                    </Text>
                    <TempDial temp={T(w.now.temp)} cur={w.now.temp} lo={today?.min ?? w.now.temp - 5} hi={today?.max ?? w.now.temp + 5} label="الآن" sub={`يُحسّ كـ ${T(w.now.feels)}`} />
                    <View style={{ flexDirection: "row", gap: 28 }}>
                      <Text style={{ fontSize: 12.5, color: W, opacity: 0.8 }}>الصغرى {today ? T(today.min) : "—"}</Text>
                      <Text style={{ fontSize: 12.5, color: W, opacity: 0.8 }}>العظمى {today ? T(today.max) : "—"}</Text>
                    </View>
                    <Pressable onPress={() => refresh(true)} style={{ alignSelf: "stretch", backgroundColor: "#FFF8EE", borderRadius: 22, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}>
                      {loading ? <ActivityIndicator size="small" color={DS.night} /> : <Ionicons name="refresh" size={18} color={DS.night} />}
                      <Text w="bold" style={{ color: DS.night, fontSize: 15 }}>
                        تحديث الطقس
                      </Text>
                    </Pressable>
                  </Glass>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10 }}>
                    {tile("sunny-outline", "شروق الشمس", today?.sunrise ? fmtClock(timeOf(today.sunrise), units) : "—")}
                    {tile("moon-outline", "غروب الشمس", today?.sunset ? fmtClock(timeOf(today.sunset), units) : "—")}
                    {tile("sunny", "مؤشر UV", today ? String(Math.round(today.uv)) : "—")}
                    {tile("speedometer-outline", "الضغط", `${Math.round(w.now.pressure)} hPa`)}
                    {tile("compass-outline", "اتجاه الرياح", w.now.windDir != null ? compass(w.now.windDir) : "—")}
                    {tile("thunderstorm-outline", "هبّات الرياح", w.now.gust != null ? fmtWind(w.now.gust, units) : "—")}
                    {tile("eye-outline", "الرؤية", w.now.vis != null ? fmtDist(w.now.vis, units) : "—")}
                    {tile("thermometer-outline", "نقطة الندى", w.now.dew != null ? T(w.now.dew) : "—")}
                    {tile("rainy-outline", "هطول اليوم", today?.precipSum != null ? fmtMm(today.precipSum) : "—")}
                    {tile(moon.icon, "القمر", `${moon.label} · ${Math.round(moon.illum * 100)}%`)}
                  </View>

                  {/* طقس اليوم في دقيقة */}
                  <Glass style={{ padding: 16, gap: 10 }}>
                    <Text w="bold" style={{ fontSize: 15, color: W }}>
                      طقس اليوم في دقيقة
                    </Text>
                    <Text style={{ fontSize: 13.5, lineHeight: 23, color: W, opacity: 0.88 }}>{dayBrief(w, city.name, T)}</Text>
                    <View style={{ gap: 6, marginTop: 2 }}>
                      {advice.map((a, i) => (
                        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Ionicons name={a.icon as never} size={17} color={a.tone === "warn" ? DS.bad : W} style={{ opacity: a.tone === "ok" ? 0.6 : 1 }} />
                          <Text w="semi" style={{ fontSize: 12.5, color: W, flex: 1 }}>
                            {a.text}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </Glass>

                  {/* منحنى الساعات */}
                  <Glass style={{ padding: 14 }}>
                    <Text w="bold" style={{ fontSize: 15, color: W, marginBottom: 8 }}>
                      ساعة بساعة · 48 ساعة
                    </Text>
                    {hours.length > 1 ? <HourlyChart hours={hours} selected={Math.min(sel, hours.length - 1)} onSelect={setSel} theme={DARK} units={units} /> : null}
                    {sel !== 0 ? (
                      <Pressable onPress={() => { setSel(0); setTab("today"); }} hitSlop={8} style={{ alignSelf: "flex-start", marginTop: 4 }}>
                        <Text w="bold" style={{ fontSize: 12, color: "#93C5FD" }}>
                          العودة إلى الآن
                        </Text>
                      </Pressable>
                    ) : null}
                  </Glass>

                  {/* جودة الهواء */}
                  {w.aqi ? (
                    <Glass style={{ padding: 16, gap: 10 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <Text w="bold" style={{ fontSize: 15, color: W }}>
                          جودة الهواء
                        </Text>
                        <View style={{ backgroundColor: aqiInfo(w.aqi.us).color, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4 }}>
                          <Text w="bold" style={{ color: W, fontSize: 13 }}>
                            {Math.round(w.aqi.us)} · {aqiInfo(w.aqi.us).label}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, color: W, opacity: 0.75 }}>{aqiInfo(w.aqi.us).hint}</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {aqiBreakdown(w.aqi).map((x) => (
                          <View key={x.label} style={{ backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
                            <Text style={{ fontSize: 10.5, color: W, opacity: 0.6 }}>{x.label}</Text>
                            <Text w="bold" style={{ fontSize: 12.5, color: W }}>
                              {x.value}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </Glass>
                  ) : null}

                  {/* اختصارات */}
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {[
                      { icon: "earth-outline", label: "الرادار والخرائط", on: () => router.push({ pathname: "/weather-map", params: { lat: String(city.lat), lng: String(city.lng), name: city.name } }) },
                      { icon: "git-compare-outline", label: "مقارنة المدن", on: () => router.push("/weather-compare") },
                    ].map((b) => (
                      <Pressable key={b.label} onPress={b.on} accessibilityLabel={b.label} style={{ flex: 1, backgroundColor: DS.glassStrong, borderRadius: 20, paddingVertical: 12, alignItems: "center", gap: 4 }}>
                        <Ionicons name={b.icon as never} size={20} color={W} />
                        <Text w="semi" style={{ fontSize: 11.5, color: W }}>
                          {b.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {error ? <Text style={{ fontSize: 11, color: W, opacity: 0.6, textAlign: "center" }}>{error}</Text> : null}
                </ScrollView>
              </View>
            </ScrollView>
          ) : null}

          {/* مؤشر الصفحات العمودي */}
          <View pointerEvents="box-none" style={{ position: "absolute", end: 6, top: 0, bottom: 0, justifyContent: "center", gap: 8, zIndex: 15 }}>
            {[0, 1, 2, 3].map((p) => (
              <Pressable key={p} hitSlop={8} onPress={() => goPage(p)}>
                <View style={{ width: 5, height: page === p ? 22 : 7, borderRadius: 3, backgroundColor: W, opacity: page === p ? 0.95 : 0.35 }} />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Sheet visible={optSheet} onClose={() => setOptSheet(false)} title="الوحدات والتنبيهات">
        {(
          [
            { title: "الحرارة", opts: [["c", "°م مئوية"], ["f", "°ف فهرنهايت"]], cur: units.temp, set: (v: string) => setUnits({ temp: v as "c" | "f" }) },
            { title: "الرياح والمسافة", opts: [["kmh", "كم/س"], ["mph", "ميل/س"], ["ms", "م/ث"]], cur: units.wind, set: (v: string) => setUnits({ wind: v as "kmh" | "mph" | "ms" }) },
            { title: "الوقت", opts: [["12", "12 ساعة"], ["24", "24 ساعة"]], cur: units.clock24 ? "24" : "12", set: (v: string) => setUnits({ clock24: v === "24" }) },
          ] as { title: string; opts: string[][]; cur: string; set: (v: string) => void }[]
        ).map((g) => (
          <View key={g.title} style={{ marginBottom: 14 }}>
            <Text w="bold" className="text-sm mb-2">
              {g.title}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {g.opts.map(([k, label]) => (
                <Pressable key={k} onPress={() => g.set(k)} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#E3E6EB", backgroundColor: g.cur === k ? "#0F1B3D" : "#FFFFFF" }}>
                  <Text w="semi" style={{ color: g.cur === k ? "#FFFFFF" : "#0F1B3D" }}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
        <Text w="bold" className="text-sm mb-2">
          التنبيهات (لمدينتك الأولى)
        </Text>
        {[
          { label: "تنبيه «مطر بعد X دقيقة»", on: rainAlert, set: (v: boolean) => setAlerts({ rain: v }) },
          { label: "تنبيه الطقس الخطير (عواصف، حرارة، رياح…)", on: severeAlert, set: (v: boolean) => setAlerts({ severe: v }) },
        ].map((r) => (
          <Pressable key={r.label} onPress={() => r.set(!r.on)} className="flex-row items-center gap-3 py-3 border-b border-line">
            <Ionicons name={r.on ? "checkbox" : "square-outline"} size={22} color="#0E6FA5" />
            <Text w="semi" className="flex-1">
              {r.label}
            </Text>
          </Pressable>
        ))}
        <Text className="text-xs text-muted mt-3">تُحسب التنبيهات عند فتح التطبيق وتحديث الطقس، فافتحه صباحًا على الأقل.</Text>
      </Sheet>

      <CitiesSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        cities={cities}
        index={index}
        onPick={(i) => {
          setIndex(i);
          setSheet(false);
        }}
        onAdd={(c) => {
          addCity(c);
          setSheet(false);
        }}
        onRemove={removeCity}
      />
    </View>
  );
}

function CitiesSheet({
  visible,
  onClose,
  cities,
  index,
  onPick,
  onAdd,
  onRemove,
}: {
  visible: boolean;
  onClose: () => void;
  cities: City[];
  index: number;
  onPick: (i: number) => void;
  onAdd: (c: City) => void;
  onRemove: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<City[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setRes([]);
      setErr(null);
      return;
    }
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        setRes(await searchCities(q));
        setErr(null);
      } catch {
        setErr("تعذّر البحث. تحقق من الإنترنت.");
      } finally {
        setBusy(false);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <Sheet visible={visible} onClose={onClose} title="المدن">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 2, borderColor: "#E3E6EB", borderRadius: 16, paddingHorizontal: 12, marginBottom: 12 }}>
        <Ionicons name="search" size={18} color="#94A3B8" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="ابحث عن مدينة…"
          placeholderTextColor="#94A3B8"
          style={{ flex: 1, paddingVertical: 10, fontFamily: "Cairo_600SemiBold", fontSize: 15, textAlign: inputAlign(), color: "#0F172A" }}
        />
        {busy ? <ActivityIndicator size="small" /> : null}
      </View>
      {err ? <Text className="text-xs text-muted mb-2">{err}</Text> : null}
      {res.map((c) => (
        <Pressable key={c.id} onPress={() => { setQ(""); onAdd(c); }} className="flex-row items-center gap-3 py-3 border-b border-line">
          <Ionicons name="add-circle-outline" size={22} color="#0E6FA5" />
          <View className="flex-1">
            <Text w="semi">{c.name}</Text>
            {c.sub ? <Text className="text-xs text-muted">{c.sub}</Text> : null}
          </View>
        </Pressable>
      ))}
      {res.length === 0 ? (
        <>
          <Text w="bold" className="text-sm mb-1 mt-1">
            مدنك المحفوظة
          </Text>
          {cities.map((c, i) => (
            <View key={c.id} className="flex-row items-center gap-3 py-3 border-b border-line">
              <Pressable onPress={() => onPick(i)} className="flex-1 flex-row items-center gap-3">
                <Ionicons name={i === index ? "radio-button-on" : "radio-button-off"} size={20} color="#0E6FA5" />
                <Text w={i === index ? "bold" : "semi"}>{c.name}</Text>
              </Pressable>
              {cities.length > 1 ? (
                <Pressable onPress={() => onRemove(c.id)} hitSlop={10} accessibilityLabel="حذف المدينة">
                  <Ionicons name="trash-outline" size={20} color="#B91C1C" />
                </Pressable>
              ) : null}
            </View>
          ))}
        </>
      ) : null}
    </Sheet>
  );
}
