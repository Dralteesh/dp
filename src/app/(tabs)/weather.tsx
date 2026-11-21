import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { HourlyChart } from "@/components/weather/HourlyChart";
import { WeatherArt } from "@/components/weather/WeatherArt";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { DAYS } from "@/constants/arabic";
import { inputAlign } from "@/lib/rtl";
import { ICON_OF, kindOf, labelOf, searchCities, themeOf, timeOf, type City, type DayPoint, type Weather } from "@/lib/weather";
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

const isDayAt = (iso: string, days: DayPoint[], fallback: boolean) => {
  const d = days.find((x) => x.date === iso.slice(0, 10));
  if (!d || !d.sunrise || !d.sunset) return fallback;
  return iso >= d.sunrise && iso < d.sunset;
};

const dayName = (date: string, i: number) => (i === 0 ? "اليوم" : i === 1 ? "غدًا" : DAYS[new Date(`${date}T12:00:00`).getDay()]);

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
  const [sheet, setSheet] = useState(false);
  const [optSheet, setOptSheet] = useState(false);
  const [daysCount, setDaysCount] = useState(7);
  useEffect(() => setSel(0), [city.id]);
  const T = (c: number) => fmtTemp(c, units);

  // الساعات من الساعة الحالية فصاعدًا
  const hours = useMemo(() => {
    if (!w) return [];
    const key = w.now.time.slice(0, 13);
    let i = w.hours.findIndex((h) => h.time.slice(0, 13) === key);
    if (i < 0) i = 0;
    return w.hours.slice(i, i + HOURS_SHOWN);
  }, [w]);

  const pick = hours[Math.min(sel, Math.max(hours.length - 1, 0))];
  const showNow = !w || sel === 0 || !pick;
  const code = w ? (showNow ? w.now.code : pick.code) : 0;
  const temp = w ? (showNow ? w.now.temp : pick.temp) : 0;
  const isDay = w ? (showNow ? w.now.isDay : isDayAt(pick.time, w.days, w.now.isDay)) : true;
  const pop = w ? (showNow ? (hours[0]?.pop ?? 0) : pick.pop) : 0;
  const theme = themeOf(code, isDay);
  const today = w?.days[0];

  const shownDays = w ? w.days.slice(0, daysCount) : [];
  const weekLo = shownDays.length ? Math.min(...shownDays.map((d) => d.min)) : 0;
  const weekHi = shownDays.length ? Math.max(...shownDays.map((d) => d.max)) : 1;
  const alerts = w ? severeAlerts(w) : [];
  const rain = w ? rainSoon(w) : null;
  const advice = w ? buildAdvice(w, T, city.name) : [];
  const moon = moonPhase(new Date());

  const stat = (icon: string, value: string, label: string) => (
    <View style={{ flex: 1, alignItems: "center", gap: 6 }}>
      <View style={{ width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: theme.ink, opacity: 0.9, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon as never} size={20} color={theme.ink} />
      </View>
      <Text w="bold" style={{ fontSize: 14, color: theme.ink }}>
        {value}
      </Text>
      <Text style={{ fontSize: 11, color: theme.ink, opacity: 0.6 }}>{label}</Text>
    </View>
  );

  const mini = (icon: string, label: string, value: string) => (
    <View style={{ width: "48.5%", backgroundColor: theme.soft, borderRadius: 22, padding: 14, gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons name={icon as never} size={16} color={theme.ink} style={{ opacity: 0.7 }} />
        <Text style={{ fontSize: 12, color: theme.ink, opacity: 0.65 }}>{label}</Text>
      </View>
      <Text w="bold" style={{ fontSize: 20, color: theme.ink }}>
        {value}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {focused ? <StatusBar style={theme.dark ? "light" : "dark"} /> : null}
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 230 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && !!w} onRefresh={() => refresh(true)} tintColor={theme.ink} />}
      >
        {/* الشريط العلوي */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text w="bold" style={{ fontSize: 15, color: theme.ink }}>
              الطقس
            </Text>
            {w ? (
              <Text style={{ fontSize: 11, color: theme.ink, opacity: 0.55 }}>
                آخر تحديث {new Date(w.fetchedAt).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
              </Text>
            ) : null}
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={() => refresh(true)} accessibilityLabel="تحديث" style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: theme.soft, alignItems: "center", justifyContent: "center" }}>
              {loading ? <ActivityIndicator size="small" color={theme.ink} /> : <Ionicons name="refresh" size={19} color={theme.ink} />}
            </Pressable>
            <Pressable onPress={() => setSheet(true)} accessibilityLabel="المدن" style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: theme.soft, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="add" size={24} color={theme.ink} />
            </Pressable>
          </View>
        </View>

        {/* اختصارات */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          {[
            { icon: "earth-outline", label: "الرادار والخرائط", on: () => router.push({ pathname: "/weather-map", params: { lat: String(city.lat), lng: String(city.lng), name: city.name } }) },
            { icon: "git-compare-outline", label: "مقارنة المدن", on: () => router.push("/weather-compare") },
            { icon: "options-outline", label: "الوحدات والتنبيهات", on: () => setOptSheet(true) },
          ].map((b) => (
            <Pressable key={b.label} onPress={b.on} accessibilityLabel={b.label} style={{ flex: 1, backgroundColor: theme.soft, borderRadius: 18, paddingVertical: 10, alignItems: "center", gap: 4 }}>
              <Ionicons name={b.icon as never} size={19} color={theme.ink} />
              <Text w="semi" style={{ fontSize: 10.5, color: theme.ink }}>
                {b.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {!w ? (
          <View style={{ alignItems: "center", paddingTop: 120, gap: 12 }}>
            {loading ? (
              <ActivityIndicator color={theme.ink} />
            ) : (
              <>
                <Ionicons name="cloud-offline-outline" size={44} color={theme.ink} />
                <Text style={{ color: theme.ink, textAlign: "center" }}>{error ?? "لا بيانات بعد"}</Text>
                <Pressable onPress={() => refresh(true)} style={{ backgroundColor: theme.ink, borderRadius: 20, paddingHorizontal: 22, paddingVertical: 10 }}>
                  <Text w="bold" style={{ color: theme.bg }}>
                    إعادة المحاولة
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        ) : (
          <>
            {/* البطل: رقم ضخم + رسمة الحالة + اسم المدينة */}
            <View style={{ height: 330, marginTop: 6 }}>
              <View style={{ position: "absolute", top: 18, right: -30, direction: "ltr" }}>
                <WeatherArt code={code} isDay={isDay} theme={theme} size={290} />
              </View>
              <Text style={{ fontSize: 132, lineHeight: 142, color: theme.ink, textAlign: "left", direction: "ltr", fontVariant: ["tabular-nums"], marginTop: 10 }}>
                {T(temp)}
              </Text>
              <Text w="bold" numberOfLines={1} style={{ fontSize: 58, lineHeight: 74, color: theme.ink, textAlign: "left", direction: "rtl", marginTop: 54 }}>
                {city.name}
              </Text>
              <Text w="semi" style={{ fontSize: 15, color: theme.ink, opacity: 0.75, textAlign: "left" }}>
                {labelOf(code, isDay)}
                {showNow ? ` · يُحسّ كـ ${Math.round(w.now.feels)}°` : ` · الساعة ${timeOf(pick.time)}`}
              </Text>
              {today ? (
                <Text style={{ fontSize: 12, color: theme.ink, opacity: 0.55, textAlign: "left" }}>
                  العظمى {T(today.max)} · الصغرى {T(today.min)}
                </Text>
              ) : null}
            </View>

            {/* ثلاث دوائر: رطوبة، رياح، احتمال المطر */}
            <View style={{ flexDirection: "row", marginTop: 6 }}>
              {stat("water-outline", `${Math.round(w.now.humidity)}%`, "الرطوبة")}
              {stat("flag-outline", fmtWind(w.now.wind, units), "الرياح")}
              {stat("umbrella-outline", `${Math.round(pop)}%`, "احتمال المطر")}
            </View>

            {/* تنبيهات الطقس الخطير + مطر قريب */}
            {alerts.length > 0 || (rain && rain.state !== "none") ? (
              <View style={{ gap: 8, marginTop: 18 }}>
                {alerts.map((a) => (
                  <View key={a.kind} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: a.level === 2 ? "#DC2626" : "#F59E0B", borderRadius: 18, padding: 12 }}>
                    <Ionicons name="warning" size={22} color="#fff" />
                    <View style={{ flex: 1 }}>
                      <Text w="bold" style={{ color: "#fff", fontSize: 14 }}>
                        {a.title}
                      </Text>
                      <Text style={{ color: "#fff", opacity: 0.9, fontSize: 11 }}>{whenText(w, a.time)}</Text>
                    </View>
                  </View>
                ))}
                {rain && rain.state !== "none" ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.soft, borderRadius: 18, padding: 12 }}>
                    <Ionicons name="rainy-outline" size={22} color={theme.ink} />
                    <Text w="bold" style={{ color: theme.ink, fontSize: 14, flex: 1 }}>
                      {rain.text}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* طقس اليوم في دقيقة + التوصيات */}
            <View style={{ backgroundColor: theme.soft, borderRadius: 24, padding: 16, marginTop: 18, gap: 10 }}>
              <Text w="bold" style={{ fontSize: 15, color: theme.ink }}>
                طقس اليوم في دقيقة
              </Text>
              <Text style={{ fontSize: 13.5, lineHeight: 23, color: theme.ink, opacity: 0.9 }}>{dayBrief(w, city.name, T)}</Text>
              <View style={{ gap: 6, marginTop: 2 }}>
                {advice.map((a, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name={a.icon as never} size={17} color={a.tone === "warn" ? "#DC2626" : theme.ink} style={{ opacity: a.tone === "ok" ? 0.6 : 1 }} />
                    <Text w="semi" style={{ fontSize: 12.5, color: theme.ink, flex: 1 }}>
                      {a.text}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* منحنى الساعات */}
            <View style={{ marginTop: 26 }}>
              <Text w="bold" style={{ fontSize: 15, color: theme.ink, marginBottom: 8 }}>
                ساعة بساعة · 48 ساعة
              </Text>
              {hours.length > 1 ? <HourlyChart hours={hours} selected={Math.min(sel, hours.length - 1)} onSelect={setSel} theme={theme} units={units} /> : null}
              {sel !== 0 ? (
                <Pressable onPress={() => setSel(0)} hitSlop={8} style={{ alignSelf: "flex-start", marginTop: 4 }}>
                  <Text w="bold" style={{ fontSize: 12, color: theme.accent }}>
                    العودة إلى الآن
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {/* تفاصيل */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10, marginTop: 22 }}>
              {mini("sunny-outline", "شروق الشمس", today?.sunrise ? fmtClock(timeOf(today.sunrise), units) : "—")}
              {mini("moon-outline", "غروب الشمس", today?.sunset ? fmtClock(timeOf(today.sunset), units) : "—")}
              {mini("sunny", "مؤشر UV", today ? String(Math.round(today.uv)) : "—")}
              {mini("speedometer-outline", "الضغط", `${Math.round(w.now.pressure)} hPa`)}
              {mini("compass-outline", "اتجاه الرياح", w.now.windDir != null ? compass(w.now.windDir) : "—")}
              {mini("thunderstorm-outline", "هبّات الرياح", w.now.gust != null ? fmtWind(w.now.gust, units) : "—")}
              {mini("eye-outline", "الرؤية", w.now.vis != null ? fmtDist(w.now.vis, units) : "—")}
              {mini("thermometer-outline", "نقطة الندى", w.now.dew != null ? T(w.now.dew) : "—")}
              {mini("rainy-outline", "هطول اليوم", today?.precipSum != null ? fmtMm(today.precipSum) : "—")}
              {mini(moon.icon, "القمر", `${moon.label} · ${Math.round(moon.illum * 100)}%`)}
            </View>

            {/* جودة الهواء */}
            {w.aqi ? (
              <View style={{ backgroundColor: theme.soft, borderRadius: 24, padding: 16, marginTop: 14, gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text w="bold" style={{ fontSize: 15, color: theme.ink }}>
                    جودة الهواء
                  </Text>
                  <View style={{ backgroundColor: aqiInfo(w.aqi.us).color, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4 }}>
                    <Text w="bold" style={{ color: "#fff", fontSize: 13 }}>
                      {Math.round(w.aqi.us)} · {aqiInfo(w.aqi.us).label}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: theme.ink, opacity: 0.75 }}>{aqiInfo(w.aqi.us).hint}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {aqiBreakdown(w.aqi).map((x) => (
                    <View key={x.label} style={{ backgroundColor: theme.ink + "12", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
                      <Text style={{ fontSize: 10.5, color: theme.ink, opacity: 0.6 }}>{x.label}</Text>
                      <Text w="bold" style={{ fontSize: 12.5, color: theme.ink }}>
                        {x.value}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* التوقعات اليومية */}
            <Text w="bold" style={{ fontSize: 15, color: theme.ink, marginTop: 26, marginBottom: 8 }}>
              الأيام القادمة · {daysCount} يومًا
            </Text>
            <View style={{ backgroundColor: theme.soft, borderRadius: 26, paddingVertical: 6, paddingHorizontal: 14 }}>
              {shownDays.map((d, i) => {
                const k = kindOf(d.code);
                const span = Math.max(weekHi - weekLo, 1);
                const left = ((d.min - weekLo) / span) * 100;
                const width = Math.max(((d.max - d.min) / span) * 100, 8);
                return (
                  <View key={d.date} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: theme.ink + "14" }}>
                    <Text w="semi" style={{ width: 62, fontSize: 14, color: theme.ink }}>
                      {dayName(d.date, i)}
                    </Text>
                    <Ionicons name={ICON_OF[k] as never} size={20} color={theme.ink} />
                    <Text style={{ width: 34, fontSize: 11, color: theme.accent, textAlign: "center" }}>{d.pop >= 20 ? `${Math.round(d.pop)}%` : ""}</Text>
                    <Text style={{ width: 30, fontSize: 13, color: theme.ink, opacity: 0.6, textAlign: "right", direction: "ltr" }}>{T(d.min)}</Text>
                    <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.ink + "1F", direction: "ltr" }}>
                      <View style={{ position: "absolute", left: `${left}%`, width: `${Math.min(width, 100 - left)}%`, top: 0, bottom: 0, borderRadius: 3, backgroundColor: theme.ink }} />
                    </View>
                    <Text w="bold" style={{ width: 30, fontSize: 13, color: theme.ink, direction: "ltr" }}>
                      {T(d.max)}
                    </Text>
                  </View>
                );
              })}
            </View>
            {w.days.length > 7 ? (
              <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 12 }}>
                {[7, 10, 14].map((n) => (
                  <Pressable key={n} onPress={() => setDaysCount(n)} style={{ paddingHorizontal: 18, paddingVertical: 8, borderRadius: 16, backgroundColor: daysCount === n ? theme.ink : theme.soft }}>
                    <Text w="bold" style={{ fontSize: 12.5, color: daysCount === n ? theme.bg : theme.ink }}>
                      {n} أيام
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {error ? (
              <Text style={{ fontSize: 11, color: theme.ink, opacity: 0.6, textAlign: "center", marginTop: 12 }}>{error}</Text>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* مبدّل المدن (فوق شريط التنقل) */}
      <View pointerEvents="box-none" style={{ position: "absolute", left: 20, right: 20, bottom: Math.max(insets.bottom, 10) + 96, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable onPress={() => setIndex(index + 1)} accessibilityLabel="المدينة التالية" style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: theme.soft, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="play-skip-back" size={20} color={theme.ink} />
        </Pressable>
        <Pressable onPress={() => setSheet(true)} style={{ paddingHorizontal: 18, paddingVertical: 8, alignItems: "center" }}>
          <Text w="bold" style={{ fontSize: 14, color: theme.ink }}>
            {city.name}
          </Text>
          <View style={{ flexDirection: "row", gap: 5, marginTop: 4 }}>
            {cities.map((c, i) => (
              <View key={c.id} style={{ width: i === index ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: theme.ink, opacity: i === index ? 1 : 0.3 }} />
            ))}
          </View>
        </Pressable>
        <Pressable onPress={() => setIndex(index - 1)} accessibilityLabel="المدينة السابقة" style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: theme.soft, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="play-skip-forward" size={20} color={theme.ink} />
        </Pressable>
      </View>

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
                <Pressable key={k} onPress={() => g.set(k)} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#0B4F73", backgroundColor: g.cur === k ? "#0A3A57" : "#FFFFFF" }}>
                  <Text w="semi" style={{ color: g.cur === k ? "#FFFFFF" : "#0A3A57" }}>
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
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 2, borderColor: "#0B4F73", borderRadius: 16, paddingHorizontal: 12, marginBottom: 12 }}>
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
