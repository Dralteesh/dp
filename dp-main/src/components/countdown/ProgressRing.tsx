import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Text } from "@/components/ui/Text";

/** حلقة تقدّم الوقت المنقضي مع النسبة في الوسط */
export function ProgressRing({ progress, size = 64, color, label }: { progress: number; size?: number; color: string; label?: string }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeOpacity={0.25} strokeWidth={5} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} />
      </Svg>
      <Text w="bold" style={{ color, fontSize: size * 0.26 }}>
        {label ?? `${Math.floor(p * 100)}%`}
      </Text>
    </View>
  );
}
