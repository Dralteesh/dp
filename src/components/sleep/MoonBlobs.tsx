import { useEffect } from "react";
import Animated, { Easing, useAnimatedProps, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);

const SIZE = 280;
const C = SIZE / 2;

/** مسار منحنٍ مغلق «عضوي»: نصف قطر يتموّج حول الدائرة، يتغيّر مع الزمن */
function blob(t: number, R: number, amp: number, k: number, speed: number, phase: number): string {
  "worklet";
  const N = 72;
  let d = "";
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = R + amp * Math.sin(k * a + t * speed + phase) + amp * 0.5 * Math.sin((k + 2) * a - t * speed * 0.7);
    const x = C + r * Math.cos(a);
    const y = C + r * Math.sin(a);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return d + "Z";
}

/** قمر هلال تحيط به خطوط متموّجة تتحرك ببطء */
export function MoonBlobs({ color = "#FFFFFF" }: { color?: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(Math.PI * 2 * 12, { duration: 60000, easing: Easing.linear }), -1, false);
  }, [t]);

  const p1 = useAnimatedProps(() => ({ d: blob(t.value, 112, 7, 3, 1.0, 0) }));
  const p2 = useAnimatedProps(() => ({ d: blob(t.value, 108, 9, 4, -0.8, 1.7) }));
  const p3 = useAnimatedProps(() => ({ d: blob(t.value, 118, 6, 2, 0.6, 3.1) }));
  const p4 = useAnimatedProps(() => ({ d: blob(t.value, 104, 8, 5, -1.2, 4.4) }));

  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <AnimatedPath animatedProps={p3} stroke={color} strokeOpacity={0.35} strokeWidth={1.2} fill="none" />
      <AnimatedPath animatedProps={p4} stroke={color} strokeOpacity={0.5} strokeWidth={1.2} fill="none" />
      <AnimatedPath animatedProps={p2} stroke={color} strokeOpacity={0.7} strokeWidth={1.4} fill="none" />
      <AnimatedPath animatedProps={p1} stroke={color} strokeWidth={1.8} fill="none" />
      {/* الهلال: قوسان يتقاطعان في نقطتين */}
      <Path d="M 153.5 61.2 A 80 80 0 1 0 205.1 186.5 A 68 68 0 1 1 153.5 61.2 Z" fill={color} />
      <Circle cx={C + 86} cy={C - 70} r={2} fill={color} opacity={0.8} />
    </Svg>
  );
}
