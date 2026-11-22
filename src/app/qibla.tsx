import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Vibration, View } from "react-native";
import { Accelerometer, Magnetometer } from "expo-sensors";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { GlassCard, NightShell } from "@/design/kit";
import { DS } from "@/design/tokens";
import { CITY } from "@/lib/prayer";
import { angleDiff, qiblaBearing, tiltCompensatedHeading } from "@/lib/qibla";
import { useSettings } from "@/store/useSettings";

const SIZE = 300;
const C = SIZE / 2;
const R = C - 10;
const MECCA = { lat: 21.4225, lng: 39.8262 };
const rad = (d: number) => (d * Math.PI) / 180;

/** المسافة بالكيلومتر (هافرساين) */
function distanceKm(lat: number, lng: number) {
  const dLat = rad(MECCA.lat - lat);
  const dLng = rad(MECCA.lng - lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(MECCA.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const pt = (deg: number, r: number) => ({ x: C + Math.sin(rad(deg)) * r, y: C - Math.cos(rad(deg)) * r });

export default function QiblaScreen() {
  const location = useSettings((s) => s.location);
  const bearing = useMemo(() => qiblaBearing(CITY.lat, CITY.lng), [location]);
  const km = useMemo(() => Math.round(distanceKm(CITY.lat, CITY.lng)), [location]);

  const [heading, setHeading] = useState<number | null>(null);
  const [available, setAvailable] = useState(true);
  const [weak, setWeak] = useState(false);
  const mag = useRef({ x: 0, y: 0, z: 0 });
  const acc = useRef({ x: 0, y: 0, z: 1 });
  const smooth = useRef<number | null>(null);
  const cum = useRef(0);
  const dial = useSharedValue(0);
  const wasAligned = useRef(false);

  useEffect(() => {
    let alive = true;
    Magnetometer.isAvailableAsync().then((ok) => alive && setAvailable(ok));
    Magnetometer.setUpdateInterval(80);
    Accelerometer.setUpdateInterval(80);
    const sm = Magnetometer.addListener((d) => {
      mag.current = d;
      // شدة المجال الأرضي الطبيعية ~25–65 µT؛ خارجها = تشويش أو معايرة سيئة
      const f = Math.hypot(d.x, d.y, d.z);
      setWeak((w) => {
        const bad = f < 18 || f > 75;
        return w === bad ? w : bad;
      });
    });
    const sa = Accelerometer.addListener((d) => {
      acc.current = d;
      const h = tiltCompensatedHeading(mag.current, acc.current);
      if (h == null) return;
      smooth.current = smooth.current == null ? h : (smooth.current + angleDiff(h, smooth.current) * 0.15 + 360) % 360;
      const delta = angleDiff(smooth.current, ((cum.current % 360) + 360) % 360);
      cum.current += delta;
      dial.value = withTiming(-cum.current, { duration: 90 });
      setHeading(smooth.current);
    });
    return () => {
      alive = false;
      sm.remove();
      sa.remove();
    };
  }, [dial]);

  const rel = heading == null ? null : (bearing - heading + 360) % 360;
  const err = rel == null ? null : Math.abs(angleDiff(rel, 0));
  const aligned = err != null && err < 3;

  // اهتزاز خفيف عند التطابق (مرة عند الدخول فقط)
  useEffect(() => {
    if (aligned && !wasAligned.current) Vibration.vibrate(40);
    wasAligned.current = aligned;
  }, [aligned]);

  const dialStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${dial.value}deg` }] }));
  const col = aligned ? DS.good : "#fff";

  return (
    <NightShell title="القبلة">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {weak ? (
          <GlassCard style={{ flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: "rgba(251,191,36,0.16)" }}>
            <Ionicons name="warning" size={22} color={DS.warn} />
            <Text style={{ color: DS.warn, flex: 1, fontSize: 13 }}>الحساس ضعيف أو متأثر بمعدن قريب. حرّك الهاتف على شكل ∞ لمعايرته وابعده عن المغانط.</Text>
          </GlassCard>
        ) : null}

        <GlassCard style={{ alignItems: "center", paddingVertical: 22, borderColor: aligned ? DS.good : DS.glassBorder, borderWidth: 1.5 }}>
          {!available ? (
            <Text style={{ color: DS.onNightSoft, textAlign: "center" }}>هذا الجهاز لا يحتوي مستشعر بوصلة.</Text>
          ) : (
            <View style={{ width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" }}>
              {/* توهّج أخضر عند التطابق */}
              {aligned ? <View style={{ position: "absolute", width: SIZE - 8, height: SIZE - 8, borderRadius: SIZE, backgroundColor: "rgba(52,211,153,0.16)", shadowColor: DS.good, shadowOpacity: 0.9, shadowRadius: 24 }} /> : null}

              {/* القرص الدوّار */}
              <Animated.View style={[{ position: "absolute", width: SIZE, height: SIZE }, dialStyle]}>
                <Svg width={SIZE} height={SIZE}>
                  <Circle cx={C} cy={C} r={R} stroke={aligned ? DS.good : "rgba(255,255,255,0.35)"} strokeWidth={3} fill="rgba(255,255,255,0.05)" />
                  {Array.from({ length: 36 }, (_, i) => i * 10).map((a) => {
                    const long = a % 90 === 0;
                    const p1 = pt(a, R - 2);
                    const p2 = pt(a, R - (long ? 16 : 8));
                    return <Line key={a} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(255,255,255,0.55)" strokeWidth={long ? 2.5 : 1.2} />;
                  })}
                  {[0, 90, 180, 270].map((a, i) => {
                    const p = pt(a, R - 32);
                    return (
                      <SvgText key={a} x={p.x} y={p.y + 6} fontSize={17} fontWeight="bold" fill={a === 0 ? DS.bad : "#fff"} textAnchor="middle">
                        {["N", "E", "S", "W"][i]}
                      </SvgText>
                    );
                  })}
                  {/* الكعبة على اتجاه القبلة (تدور مع القرص) */}
                  <G rotation={bearing} origin={`${C}, ${C}`}>
                    <Rect x={C - 15} y={C - (R - 34) - 15} width={30} height={30} rx={5} fill="#111" stroke="#E0B552" strokeWidth={2.5} />
                    <Rect x={C - 15} y={C - (R - 34) - 6} width={30} height={5} fill="#E0B552" />
                  </G>
                </Svg>
              </Animated.View>

              {/* مؤشر ثابت برأس الهاتف */}
              <Svg width={SIZE} height={SIZE} style={{ position: "absolute" }} pointerEvents="none">
                <Path d={`M ${C - 10} 16 L ${C} 2 L ${C + 10} 16 Z`} fill={col} />
              </Svg>

              {/* الزاوية في المنتصف */}
              <View style={{ alignItems: "center" }}>
                <Text w="bold" style={{ color: col, fontSize: 56, lineHeight: 66, fontVariant: ["tabular-nums"] }}>{Math.round(bearing)}°</Text>
                <Text style={{ color: DS.onNightSoft, fontSize: 12 }}>{km.toLocaleString("ar")} كم إلى مكة</Text>
              </View>
            </View>
          )}
          <Text w="bold" style={{ color: col, fontSize: 17, marginTop: 14, textAlign: "center" }}>
            {rel == null ? "حرّك الهاتف ببطء لبدء المعايرة" : aligned ? "أنت باتجاه القبلة ✓" : `أدِر الهاتف ${Math.round(err!)}° ${angleDiff(rel, 0) > 0 ? "يمينًا" : "يسارًا"}`}
          </Text>
        </GlassCard>

        <GlassCard style={{ gap: 6 }}>
          <Text w="semi" style={{ color: "#fff" }}>من {CITY.name}</Text>
          <Text style={{ color: DS.onNightSoft, fontSize: 12, lineHeight: 20 }}>
            تعمل بلا إنترنت. ضع الهاتف أفقيًا وأبعده عن المعادن والمغانط. تتجاهل البوصلة الانحراف المغناطيسي (نحو 5° في سوريا)، فتحقق من اتجاه مسجد أو علامة قريبة عند الحاجة.
          </Text>
        </GlassCard>
      </ScrollView>
    </NightShell>
  );
}
