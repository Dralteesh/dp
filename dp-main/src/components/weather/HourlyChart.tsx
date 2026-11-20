import { useEffect, useRef } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { Text } from "@/components/ui/Text";
import { fmt12, hourOf, type HourPoint, type Theme } from "@/lib/weather";

const COL = 62;
const CH = 120; // ارتفاع المنحنى
const PAD = 22;

/** منحنى حرارة ساعة بساعة: اضغط أي ساعة لتنتقل الشاشة إليها، ويمكن التمرير أفقيًا */
export function HourlyChart({
  hours,
  selected,
  onSelect,
  theme,
}: {
  hours: HourPoint[];
  selected: number;
  onSelect: (i: number) => void;
  theme: Theme;
}) {
  const ref = useRef<ScrollView>(null);
  const n = hours.length;
  const W = n * COL;
  const temps = hours.map((h) => h.temp);
  const lo = Math.min(...temps);
  const hi = Math.max(...temps);
  const span = Math.max(hi - lo, 4);
  const X = (i: number) => i * COL + COL / 2;
  const Y = (t: number) => PAD + (CH - PAD * 2) * (1 - (t - lo) / span);

  // منحنى ناعم (Catmull-Rom → Bézier)
  let d = "";
  for (let i = 0; i < n; i++) {
    const p = [X(i), Y(hours[i].temp)];
    if (i === 0) d += `M ${p[0]} ${p[1]}`;
    else {
      const p0 = [X(i - 2 < 0 ? 0 : i - 2), Y(hours[Math.max(0, i - 2)].temp)];
      const p1 = [X(i - 1), Y(hours[i - 1].temp)];
      const p3 = [X(Math.min(n - 1, i + 1)), Y(hours[Math.min(n - 1, i + 1)].temp)];
      const c1 = [p1[0] + (p[0] - p0[0]) / 6, p1[1] + (p[1] - p0[1]) / 6];
      const c2 = [p[0] - (p3[0] - p1[0]) / 6, p[1] - (p3[1] - p1[1]) / 6];
      d += ` C ${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${p[0]} ${p[1]}`;
    }
  }

  useEffect(() => {
    const x = Math.max(0, X(selected) - 150);
    const t = setTimeout(() => ref.current?.scrollTo({ x, animated: true }), 30);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const sx = X(selected);
  const sy = Y(hours[selected]?.temp ?? lo);

  return (
    <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} style={{ direction: "ltr" }} contentContainerStyle={{ direction: "ltr" }}>
      <View style={{ width: W, direction: "ltr" }}>
        <Svg width={W} height={CH + 60} style={{ position: "absolute", top: 0, left: 0 }}>
          <Path d={d} stroke={theme.ink} strokeWidth={2.2} fill="none" strokeLinecap="round" />
          <Line x1={sx} y1={sy + 8} x2={sx} y2={CH + 6} stroke={theme.ink} strokeWidth={1.5} />
          <Circle cx={sx} cy={sy} r={7} fill={theme.bg} stroke={theme.ink} strokeWidth={2.2} />
        </Svg>
        <View style={{ height: CH }} />
        <View style={{ flexDirection: "row", direction: "ltr" }}>
          {hours.map((h, i) => {
            const on = i === selected;
            return (
              <Pressable key={h.time} onPress={() => onSelect(i)} style={{ width: COL, alignItems: "center", paddingVertical: 6 }} hitSlop={4}>
                <Text w={on ? "bold" : "semi"} style={{ fontSize: 11, color: theme.ink, opacity: on ? 1 : 0.5 }}>
                  {i === 0 ? "الآن" : fmt12(hourOf(h.time))}
                </Text>
                <Text w="bold" style={{ fontSize: 13, color: theme.ink, opacity: on ? 1 : 0.75, marginTop: 2 }}>
                  {Math.round(h.temp)}°
                </Text>
                {h.pop >= 20 ? (
                  <Text w="semi" style={{ fontSize: 10, color: theme.accent, marginTop: 1 }}>
                    {Math.round(h.pop)}%
                  </Text>
                ) : (
                  <View style={{ height: 15 }} />
                )}
              </Pressable>
            );
          })}
        </View>
        {/* مناطق اللمس فوق المنحنى */}
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: CH, flexDirection: "row", direction: "ltr" }}>
          {hours.map((h, i) => (
            <Pressable key={h.time} onPress={() => onSelect(i)} style={{ width: COL, height: CH }} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
