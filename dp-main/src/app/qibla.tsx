import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { Accelerometer, Magnetometer } from "expo-sensors";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { CITY } from "@/lib/prayer";
import { angleDiff, qiblaBearing, tiltCompensatedHeading } from "@/lib/qibla";

const SIZE = 280;
const C = SIZE / 2;

export default function QiblaScreen() {
  const bearing = useMemo(() => qiblaBearing(), []);
  const [heading, setHeading] = useState<number | null>(null);
  const [available, setAvailable] = useState(true);
  const mag = useRef({ x: 0, y: 0, z: 0 });
  const acc = useRef({ x: 0, y: 0, z: 1 });
  const smooth = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    Magnetometer.isAvailableAsync().then((ok) => alive && setAvailable(ok));
    Magnetometer.setUpdateInterval(80);
    Accelerometer.setUpdateInterval(80);
    const sm = Magnetometer.addListener((d) => (mag.current = d));
    const sa = Accelerometer.addListener((d) => {
      acc.current = d;
      const h = tiltCompensatedHeading(mag.current, acc.current);
      if (h == null) return;
      // تنعيم دائري لتخفيف الاهتزاز
      smooth.current = smooth.current == null ? h : (smooth.current + angleDiff(h, smooth.current) * 0.15 + 360) % 360;
      setHeading(smooth.current);
    });
    return () => {
      alive = false;
      sm.remove();
      sa.remove();
    };
  }, []);

  const rel = heading == null ? null : (bearing - heading + 360) % 360; // زاوية القبلة بالنسبة لرأس الهاتف
  const err = rel == null ? null : Math.abs(angleDiff(rel, 0));
  const aligned = err != null && err < 4;
  const col = aligned ? "#16A34A" : "#0B4F73";

  return (
    <Screen title="القبلة" back>
      <Card>
        <View className="items-center">
          {!available ? (
            <Text className="text-center text-muted">هذا الجهاز لا يحتوي مستشعر بوصلة.</Text>
          ) : (
            <Svg width={SIZE} height={SIZE}>
              {/* القرص يدور عكس اتجاه الهاتف ليبقى الشمال ثابتًا */}
              <Circle cx={C} cy={C} r={C - 6} stroke={col} strokeWidth={3} fill="#F2F8FC" />
              {[0, 90, 180, 270].map((a, i) => {
                const r = ((a - (heading ?? 0)) * Math.PI) / 180;
                return (
                  <SvgText key={a} x={C + Math.sin(r) * (C - 28)} y={C - Math.cos(r) * (C - 28) + 6} fontSize={16} fill="#0B4F73" textAnchor="middle">
                    {["N", "E", "S", "W"][i]}
                  </SvgText>
                );
              })}
              {/* مؤشر القبلة */}
              {rel != null && (
                <>
                  <Line
                    x1={C}
                    y1={C}
                    x2={C + Math.sin((rel * Math.PI) / 180) * (C - 50)}
                    y2={C - Math.cos((rel * Math.PI) / 180) * (C - 50)}
                    stroke={col}
                    strokeWidth={6}
                    strokeLinecap="round"
                  />
                  <Circle
                    cx={C + Math.sin((rel * Math.PI) / 180) * (C - 50)}
                    cy={C - Math.cos((rel * Math.PI) / 180) * (C - 50)}
                    r={11}
                    fill={col}
                  />
                </>
              )}
              {/* رأس الهاتف */}
              <Path d={`M ${C - 8} 18 L ${C} 4 L ${C + 8} 18 Z`} fill="#DC2626" />
              <Circle cx={C} cy={C} r={5} fill={col} />
            </Svg>
          )}
          <Text w="bold" className="text-xl mt-3" style={{ color: col }}>
            {rel == null ? "حرّك الهاتف ببطء على شكل ∞ لمعايرة البوصلة" : aligned ? "أنت باتجاه القبلة ✓" : `أدِر الهاتف ${Math.round(err!)}° ${angleDiff(rel, 0) > 0 ? "يمينًا" : "يسارًا"}`}
          </Text>
          <Text className="text-xs text-muted mt-1">
            زاوية القبلة من {CITY.name}: {Math.round(bearing)}° عن الشمال الحقيقي
          </Text>
        </View>
      </Card>
      <Text className="text-xs text-muted mt-3 px-2">
        تعمل بلا إنترنت. ضع الهاتف أفقيًا وأبعده عن المعادن والمغانط. تتجاهل البوصلة الانحراف المغناطيسي (نحو 5° في سوريا)، فتحقق من اتجاه مسجد أو علامة قريبة عند الحاجة.
      </Text>
    </Screen>
  );
}
