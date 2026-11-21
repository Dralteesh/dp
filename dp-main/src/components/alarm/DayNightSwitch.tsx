import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { Text } from "@/components/ui/Text";

const W = 112;
const H = 48;
const K = 40; // قطر الشمس/القمر
const PAD = 4;

const star = (x: number, y: number, r: number) =>
  `M${x} ${y - r}L${x + r * 0.28} ${y - r * 0.28}L${x + r} ${y}L${x + r * 0.28} ${y + r * 0.28}L${x} ${y + r}L${x - r * 0.28} ${y + r * 0.28}L${x - r} ${y}L${x - r * 0.28} ${y - r * 0.28}Z`;

/** مفتاح صباح/مساء: سماء زرقاء وغيوم وشمس، أو ليل ونجوم وقمر (تصميم Day/Night toggle) */
export function DayNightSwitch({ pm, onToggle }: { pm: boolean; onToggle: () => void }) {
  const t = useRef(new Animated.Value(pm ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: pm ? 1 : 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [pm, t]);

  const x = t.interpolate({ inputRange: [0, 1], outputRange: [PAD, W - K - PAD] });
  const dayOpacity = t.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <View style={{ alignItems: "center", direction: "ltr" }}>
      <Pressable
        onPress={onToggle}
        hitSlop={10}
        accessibilityRole="switch"
        accessibilityLabel={pm ? "مساءً" : "صباحًا"}
        accessibilityState={{ checked: pm }}
        style={{
          width: W,
          height: H,
          borderRadius: H / 2,
          overflow: "hidden",
          borderWidth: 2,
          borderColor: "#CBD5E1",
          backgroundColor: "#16203A",
        }}
      >
        {/* الليل */}
        <Svg width={W} height={H} style={{ position: "absolute" }}>
          <Defs>
            <LinearGradient id="night" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#141A2B" />
              <Stop offset="1" stopColor="#3B4156" />
            </LinearGradient>
          </Defs>
          <Rect width={W} height={H} fill="url(#night)" />
          <Path d={star(22, 14, 4)} fill="#fff" />
          <Path d={star(48, 32, 3.4)} fill="#fff" />
          <Circle cx={13} cy={32} r={1.4} fill="#fff" />
          <Circle cx={36} cy={22} r={1.1} fill="#fff" opacity={0.8} />
          <Circle cx={58} cy={13} r={1.3} fill="#fff" opacity={0.9} />
        </Svg>

        {/* النهار فوق الليل ويخفت عند التبديل */}
        <Animated.View style={{ position: "absolute", width: W, height: H, opacity: dayOpacity }}>
          <Svg width={W} height={H}>
            <Defs>
              <LinearGradient id="day" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#3B8FE6" />
                <Stop offset="1" stopColor="#9CD0F8" />
              </LinearGradient>
            </Defs>
            <Rect width={W} height={H} fill="url(#day)" />
            <Circle cx={96} cy={44} r={15} fill="#EAF5FD" opacity={0.9} />
            <Circle cx={78} cy={46} r={13} fill="#D6EBFB" opacity={0.95} />
            <Circle cx={104} cy={30} r={10} fill="#EAF5FD" opacity={0.9} />
            <Circle cx={60} cy={50} r={11} fill="#C9E4FA" opacity={0.9} />
          </Svg>
        </Animated.View>

        {/* الشمس / القمر */}
        <Animated.View style={{ position: "absolute", top: (H - 4 - K) / 2, width: K, height: K, transform: [{ translateX: x }] }}>
          <Animated.View style={{ position: "absolute", width: K, height: K, opacity: dayOpacity }}>
            <Svg width={K} height={K}>
              <Circle cx={K / 2} cy={K / 2} r={K / 2 - 1} fill="#FFD02E" stroke="#F2B705" strokeWidth={2} />
            </Svg>
          </Animated.View>
          <Animated.View style={{ position: "absolute", width: K, height: K, opacity: t }}>
            <Svg width={K} height={K}>
              <Circle cx={K / 2} cy={K / 2} r={K / 2 - 1} fill="#D9DCE3" stroke="#B9BECB" strokeWidth={2} />
              <Circle cx={15} cy={17} r={5} fill="#A9B0C4" />
              <Circle cx={27} cy={13} r={3} fill="#A9B0C4" />
              <Circle cx={26} cy={27} r={4} fill="#A9B0C4" />
            </Svg>
          </Animated.View>
        </Animated.View>
      </Pressable>
      <Text w="semi" style={{ fontSize: 11, color: "#64748B", marginTop: 3 }}>
        {pm ? "مساءً" : "صباحًا"}
      </Text>
    </View>
  );
}
