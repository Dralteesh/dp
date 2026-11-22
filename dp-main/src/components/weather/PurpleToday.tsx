import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Illustration } from "@/components/weather/Illustration";
import { WeatherGlyph } from "@/components/weather/WeatherGlyph";
import { Glass } from "@/components/ui/Glass";
import { Text } from "@/components/ui/Text";
import { DAYS } from "@/constants/arabic";
import { kindOf, labelOf, timeOf, type HourPoint, type Weather } from "@/lib/weather";
import type { Units } from "@/lib/weatherInsights";

const W = "#FFFFFF";
const INK = "#2A2780";

type Props = {
  w: Weather;
  cityName: string;
  units: Units;
  T: (c: number) => string;
  hours: HourPoint[];
  sel: number;
  setSel: (i: number) => void;
  code: number;
  temp: number;
  isDay: boolean;
  dayAt: (iso: string) => boolean;
  onWeek: () => void;
  topPad: number;
  botPad: number;
};

/** صفحة «اليوم» بالنمط النيلي: رسمة كبيرة + ورقة كريمية بتبويبات (اليوم/غدًا/الأسبوع) وكبسولات */
export function PurpleToday({ w, cityName, units, T, hours, sel, setSel, code, temp, isDay, dayAt, onWeek, topPad, botPad }: Props) {
  const [tab, setTab] = useState<"today" | "tomorrow" | "week">("today");
  const todayKey = w.now.time.slice(0, 10);
  const tomorrowKey = w.days[1]?.date ?? "";
  const hourList = useMemo(
    () => hours.map((h, i) => ({ h, i })).filter(({ h }) => tab !== "week" && h.time.slice(0, 10) === (tab === "today" ? todayKey : tomorrowKey)),
    [hours, tab, todayKey, tomorrowKey],
  );
  const kind = kindOf(code);
  const tabs: Array<["today" | "tomorrow" | "week", string]> = [["today", "اليوم"], ["tomorrow", "غدًا"], ["week", "الأسبوع"]];
  const now = new Date();
  return (
    <View style={{ height: "100%", paddingTop: topPad, paddingBottom: botPad, paddingHorizontal: 16, gap: 12 }}>
      <Glass colors={["#4F46E5", "#2A2780"]} radius={34} style={{ flex: 1, padding: 20 }}>
        <Text w="bold" style={{ fontSize: 30, color: W }}>اليوم</Text>
        <Text style={{ fontSize: 13, color: W, opacity: 0.7 }}>{now.toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long" })}</Text>
        <View style={{ flexDirection: "row", alignItems: "flex-start", direction: "ltr", alignSelf: "flex-start", marginTop: 8 }}>
          <Text style={{ fontSize: 88, lineHeight: 96, color: W, fontVariant: ["tabular-nums"] }}>{T(temp).replace("°", "")}</Text>
          <Text style={{ fontSize: 30, color: W, marginTop: 10 }}>°{units.temp === "f" ? "F" : "C"}</Text>
        </View>
        <Text style={{ fontSize: 15, color: W, opacity: 0.85 }}>{cityName} · {labelOf(code, isDay)}</Text>
        <View pointerEvents="none" style={{ position: "absolute", end: -6, bottom: -4 }}>
          <Illustration kind={kind} isDay={isDay} size={236} />
        </View>
      </Glass>

      <View style={{ backgroundColor: "#FBF6EE", borderRadius: 32, paddingTop: 16, paddingBottom: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 12 }}>
          {tabs.map(([k, label]) => (
            <Pressable key={k} onPress={() => setTab(k)} hitSlop={6}>
              <Text w={tab === k ? "bold" : "regular"} style={{ fontSize: 15, color: tab === k ? INK : "#6B6B80" }}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
          {tab === "week"
            ? w.days.slice(0, 10).map((d, i) => (
                <Pressable key={d.date} onPress={onWeek} style={{ width: 60, paddingVertical: 12, borderRadius: 30, alignItems: "center", gap: 4, backgroundColor: "#E4E2FA" }}>
                  <Text style={{ fontSize: 11, color: "#4338CA" }}>{i === 0 ? "اليوم" : i === 1 ? "غدًا" : DAYS[new Date(`${d.date}T12:00:00`).getDay()]}</Text>
                  <WeatherGlyph code={d.code} isDay size={34} />
                  <Text w="bold" style={{ fontSize: 14, color: INK }}>{T(d.max)}</Text>
                </Pressable>
              ))
            : hourList.map(({ h, i }) => {
                const on = i === sel;
                return (
                  <Pressable key={h.time} onPress={() => setSel(i)} style={{ width: 60, paddingVertical: 12, borderRadius: 30, alignItems: "center", gap: 4, backgroundColor: on ? INK : "#E4E2FA" }}>
                    <Text style={{ fontSize: 11, color: on ? W : "#4338CA" }}>{i === 0 ? "الآن" : timeOf(h.time)}</Text>
                    <WeatherGlyph code={h.code} isDay={dayAt(h.time)} size={34} />
                    <Text w="bold" style={{ fontSize: 14, color: on ? W : INK }}>{T(h.temp)}</Text>
                  </Pressable>
                );
              })}
        </ScrollView>
        <View style={{ width: 110, height: 5, borderRadius: 3, backgroundColor: "#D3CFEA", alignSelf: "center", marginTop: 12 }} />
      </View>
    </View>
  );
}
