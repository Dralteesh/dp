import { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { DAYS_SHORT } from "@/constants/arabic";
import { addDays, fmtDateFull, fmtTime, toISO, weekdayOf } from "@/lib/dates";
import { sleepHours, sleepScore, useSleep } from "@/store/useSleep";

const NAVY = "#0F1B3D";
const BLUE = "#0E6FA5";
const hm = (h: number) => `${Math.floor(h)}س ${String(Math.round((h % 1) * 60)).padStart(2, "0")}د`;
const scoreColor = (s: number) => (s >= 80 ? "#16A34A" : s >= 60 ? "#D97706" : "#DC2626");

function Ring({ value }: { value: number }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <View style={{ width: 128, height: 128, alignItems: "center", justifyContent: "center" }}>
      <Svg width={128} height={128} style={{ position: "absolute" }}>
        <Circle cx={64} cy={64} r={R} stroke="#E2E8F0" strokeWidth={8} fill="none" />
        <Circle cx={64} cy={64} r={R} stroke={scoreColor(value)} strokeWidth={8} fill="none" strokeLinecap="round" strokeDasharray={`${(C * value) / 100} ${C}`} transform="rotate(-90 64 64)" />
      </Svg>
      <Text w="bold" style={{ fontSize: 30, color: NAVY }}>
        {value}%
      </Text>
    </View>
  );
}

/** منحنى ناعم يمرّ بالنقاط (Catmull-Rom → Bézier) */
function smooth(pts: Array<{ x: number; y: number }>): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** تقرير النوم: الجودة والمدة ومعلومات الليلة ومنحنى آخر 7 أيام */
export default function SleepReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const logs = useSleep((s) => s.logs);
  const last = logs[0];

  const week = useMemo(() => {
    const today = toISO(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i - 6);
      const l = logs.find((x) => x.date === date);
      return { date, h: l ? sleepHours(l.bed, l.wake) : null };
    });
  }, [logs]);

  const W = 320;
  const H = 120;
  const known = week.filter((d) => d.h != null);
  const maxH = Math.max(9, ...known.map((d) => d.h!));
  const minH = Math.min(5, ...known.map((d) => d.h!));
  const pts = week
    .map((d, i) => (d.h == null ? null : { x: 14 + (i * (W - 28)) / 6, y: 10 + (1 - (d.h - minH) / (maxH - minH || 1)) * (H - 24) }))
    .filter(Boolean) as Array<{ x: number; y: number }>;
  const line = smooth(pts);

  const hours = last ? sleepHours(last.bed, last.wake) : 0;
  const score = last ? sleepScore(last) : 0;
  const cycles = Math.floor(hours / 1.5);

  return (
    <View style={{ flex: 1, backgroundColor: "#F1F5F9", paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }} accessibilityLabel="رجوع">
          <Ionicons name="chevron-forward" size={22} color={NAVY} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text w="bold" style={{ fontSize: 20, color: NAVY }}>
            تقرير النوم
          </Text>
          {last ? <Text className="text-xs text-muted">{fmtDateFull(last.date)}</Text> : null}
        </View>
        <Pressable onPress={() => router.push("/sleep-track")} style={{ backgroundColor: NAVY, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text w="semi" style={{ color: "#fff" }}>
            تعقّب الليلة
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}>
        {!last ? (
          <View style={{ backgroundColor: "#fff", borderRadius: 24, padding: 24, alignItems: "center" }}>
            <Ionicons name="moon-outline" size={36} color={BLUE} />
            <Text w="bold" style={{ marginTop: 8 }}>
              لا بيانات بعد
            </Text>
            <Text className="text-xs text-muted" style={{ textAlign: "center", marginTop: 4 }}>
              ابدأ تعقّب الليلة وسيظهر هنا تقرير نومك.
            </Text>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 24, padding: 16, alignItems: "center" }}>
                <Text className="text-xs text-muted" style={{ alignSelf: "flex-start", marginBottom: 6 }}>
                  الجودة
                </Text>
                <Ring value={score} />
              </View>
              <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 24, padding: 16, justifyContent: "center" }}>
                <Text className="text-xs text-muted">المدة</Text>
                <Text w="bold" style={{ fontSize: 24, color: NAVY, marginTop: 6 }}>
                  {hm(hours)}
                </Text>
                <Text className="text-xs text-muted">إجمالي النوم</Text>
                <Text className="text-xs mt-3" style={{ color: hours < 7 ? "#DC2626" : "#16A34A" }}>
                  {hours < 7 ? "أقل من الموصى به (7–9 س)" : hours > 9 ? "أكثر من الموصى به" : "ضمن الموصى به"}
                </Text>
              </View>
            </View>

            <View style={{ backgroundColor: "#fff", borderRadius: 24, padding: 16 }}>
              <Text className="text-xs text-muted" style={{ marginBottom: 10 }}>
                معلومات النوم
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 14 }}>
                {[
                  { i: "bed-outline", v: fmtTime(last.bed), l: "ذهبتَ للنوم" },
                  { i: "sunny-outline", v: fmtTime(last.wake), l: "استيقظتَ" },
                  { i: "repeat-outline", v: `${cycles}`, l: "دورات نوم (تقدير)" },
                  { i: "time-outline", v: hm(hours), l: "الوقت في السرير" },
                ].map((x) => (
                  <View key={x.l} style={{ width: "50%", flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Ionicons name={x.i as never} size={24} color={NAVY} />
                    <View>
                      <Text w="bold" style={{ color: NAVY }}>
                        {x.v}
                      </Text>
                      <Text className="text-[11px] text-muted">{x.l}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ backgroundColor: "#fff", borderRadius: 24, padding: 16 }}>
              <Text className="text-xs text-muted" style={{ marginBottom: 6 }}>
                الوقت في السرير (آخر 7 أيام)
              </Text>
              <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
                <Defs>
                  <LinearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={BLUE} stopOpacity="0.25" />
                    <Stop offset="1" stopColor={BLUE} stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                {[7, 9].map((g) => {
                  const y = 10 + (1 - (g - minH) / (maxH - minH || 1)) * (H - 24);
                  return <Path key={g} d={`M 0 ${y} L ${W} ${y}`} stroke="#E2E8F0" strokeWidth={1} />;
                })}
                {pts.length > 1 ? <Path d={`${line} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`} fill="url(#g)" /> : null}
                {pts.length > 1 ? <Path d={line} stroke={NAVY} strokeWidth={2.5} fill="none" strokeLinecap="round" /> : null}
                {pts.map((p, i) => (
                  <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={NAVY} />
                ))}
              </Svg>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 6 }}>
                {week.map((d) => (
                  <Text key={d.date} className="text-[10px] text-muted">
                    {DAYS_SHORT[weekdayOf(d.date)]}
                  </Text>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
