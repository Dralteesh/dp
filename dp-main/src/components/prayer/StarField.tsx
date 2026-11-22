import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const STARS = Array.from({ length: 22 }, (_, i) => ({
  x: (i * 37) % 90 + 5,
  y: (i * 53) % 34 + 8,
  s: 2 + (i % 3 === 0 ? 1 : 0),
  o: 0.35 + (i % 4) * 0.15,
}));

/** نجوم ثابتة المواضع تلمع ببطء (للفجر والعشاء وشاشة الرنين) */
export function StarField({ count = 16 }: { count?: number }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(0.45, { duration: 2400 }), withTiming(1, { duration: 2400 })),
      -1,
    );
  }, [pulse]);
  const anim = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, anim]}>
      {STARS.slice(0, count).map((st, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: `${st.x}%`,
            top: `${st.y}%`,
            width: st.s,
            height: st.s,
            borderRadius: st.s,
            backgroundColor: "#FFFFFF",
            opacity: st.o,
          }}
        />
      ))}
    </Animated.View>
  );
}
