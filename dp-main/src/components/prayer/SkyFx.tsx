import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { SkyGradient } from "@/components/prayer/PrayerScene";

type Sky3 = [string, string, string];

/**
 * سماء بتلاشٍ متقاطع: عند تغيّر الألوان (حلول وقت صلاة أو تبدّل الطقس) يذوب التدرّج الجديد فوق القديم
 * بدل أن يقفز فجأة. التلاشي على خيط الواجهة فلا يُحدث إعادة رسم.
 */
export function CrossSky({ colors, ms = 1600 }: { colors: Sky3; ms?: number }) {
  const key = colors.join("|");
  const [pair, setPair] = useState<{ key: string; from: Sky3; to: Sky3 }>({ key, from: colors, to: colors });
  const op = useSharedValue(1);

  useEffect(() => {
    setPair((p) => (p.key === key ? p : { key, from: p.to, to: colors }));
    op.value = 0;
    op.value = withTiming(1, { duration: ms, easing: Easing.inOut(Easing.quad) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const top = useAnimatedStyle(() => ({ opacity: op.value }));
  return (
    <>
      <SkyGradient colors={pair.from} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, top]}>
        <SkyGradient colors={pair.to} />
      </Animated.View>
    </>
  );
}

/** يملأ الحاوية ويحرّك شفافيته بسلاسة نحو القيمة الجديدة (تخفيت الشمس/النجوم عند الغيوم) */
export function Fade({ to, ms = 1400, style, children }: { to: number; ms?: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const v = useSharedValue(to);
  useEffect(() => {
    v.value = withTiming(to, { duration: ms, easing: Easing.inOut(Easing.quad) });
  }, [to, ms, v]);
  const a = useAnimatedStyle(() => ({ opacity: v.value }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style, a]}>
      {children}
    </Animated.View>
  );
}
