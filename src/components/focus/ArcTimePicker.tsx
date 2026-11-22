import { useRef } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Svg, { Circle, Path } from "react-native-svg";
import { Text } from "@/components/ui/Text";

const MIN = 5;
const MAX = 180;
const STEP = 5;

const toFrac = (m: number) => (m - MIN) / (MAX - MIN);
const fromFrac = (f: number) => Math.min(MAX, Math.max(MIN, Math.round((MIN + f * (MAX - MIN)) / STEP) * STEP));

type Props = {
  value: number;
  onChange: (m: number) => void;
  size?: number;
  color?: string;
  track?: string;
  textColor?: string;
};

/** مؤشر دائري: اسحب المقبض حول الدائرة لاختيار المدة من 5 إلى 180 دقيقة بخطوة 5 */
export function ArcTimePicker({ value, onChange, size = 250, color = "#FFFFFF", track = "rgba(255,255,255,0.28)", textColor = "#FFFFFF" }: Props) {
  const c = size / 2;
  const stroke = 16;
  const R = c - stroke - 4;
  const frac = toFrac(value);
  const prev = useRef(frac);
  const last = useRef(value);

  const point = (fr: number): [number, number] => {
    const a = fr * Math.PI * 2;
    return [c + R * Math.sin(a), c - R * Math.cos(a)];
  };
  const [tx, ty] = point(frac);
  const [sx, sy] = point(0);
  const large = frac > 0.5 ? 1 : 0;
  const arc = frac >= 0.9999 ? null : `M${sx} ${sy} A${R} ${R} 0 ${large} 1 ${tx} ${ty}`;

  const update = (x: number, y: number) => {
    let ang = Math.atan2(x - c, -(y - c)); // 0 في الأعلى، باتجاه عقارب الساعة
    if (ang < 0) ang += Math.PI * 2;
    let fr = ang / (Math.PI * 2);
    // منع القفز بين 180 و5 عند عبور أعلى الدائرة
    if (prev.current > 0.8 && fr < 0.2) fr = 1;
    else if (prev.current < 0.2 && fr > 0.8) fr = 0;
    prev.current = fr;
    const m = fromFrac(fr);
    if (m !== last.current) {
      last.current = m;
      onChange(m);
    }
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => {
      prev.current = toFrac(value);
      update(e.x, e.y);
    })
    .onUpdate((e) => update(e.x, e.y));

  const h = Math.floor(value / 60);
  const m = value % 60;
  const label = h > 0 ? (m ? `${h}:${String(m).padStart(2, "0")}` : `${h}`) : `${m}`;
  const unit = h > 0 ? "ساعة" : "دقيقة";

  return (
    <GestureHandlerRootView style={{ width: size, height: size }}>
      <GestureDetector gesture={pan}>
        <View style={{ width: size, height: size }}>
          <Svg width={size} height={size}>
            <Circle cx={c} cy={c} r={R} stroke={track} strokeWidth={stroke} fill="none" />
            {arc ? (
              <Path d={arc} stroke={color} strokeWidth={stroke} strokeLinecap="round" fill="none" />
            ) : (
              <Circle cx={c} cy={c} r={R} stroke={color} strokeWidth={stroke} fill="none" />
            )}
            <Circle cx={tx} cy={ty} r={stroke * 0.95} fill="#FFFFFF" stroke={color} strokeWidth={3} />
          </Svg>
          <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <Text w="bold" style={{ fontSize: 56, lineHeight: 66, color: textColor, fontVariant: ["tabular-nums"] }}>
              {label}
            </Text>
            <Text style={{ color: textColor, opacity: 0.85 }}>{unit}</Text>
          </View>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
