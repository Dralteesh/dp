import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { useTicker } from "@/hooks/useTicker";
import { nearestUpcoming } from "@/lib/countdown/engine";
import { compactOf } from "@/lib/countdown/format";
import { gradientColors } from "@/lib/countdown/presets";
import { useCountdowns } from "@/store/useCountdowns";

/** مدخل «لحظاتي» في الرئيسية: يعرض أقرب لحظة قادمة */
export function HomeCountdownCard() {
  const router = useRouter();
  const items = useCountdowns((s) => s.items);
  const now = useTicker(60_000);
  const near = nearestUpcoming(items, now);
  const c = near ? compactOf(near.cd, now) : null;
  const tint = near ? (near.cd.bg.kind === "gradient" ? gradientColors(near.cd)[0] : near.cd.color) : "#6366F1";

  return (
    <Pressable
      onPress={() => router.push("/countdowns")}
      accessibilityLabel="لحظاتي"
      className="flex-row items-center gap-3 bg-surface border border-line rounded-[24px] p-3"
    >
      <View className="w-14 h-14 rounded-2xl items-center justify-center" style={{ backgroundColor: tint }}>
        <Text style={{ fontSize: 26, lineHeight: 36 }}>{near?.cd.emoji ?? "⏳"}</Text>
      </View>
      <View className="flex-1">
        <Text w="bold" className="text-base">
          لحظاتي
        </Text>
        <Text className="text-xs text-muted" numberOfLines={1}>
          {near && c ? `${near.cd.title || "لحظة"} • ${c.caption} ${c.value} ${c.unit}`.trim() : "عدّادات تنازلية وتصاعدية لأهم مواعيدك"}
        </Text>
      </View>
      <Ionicons name="chevron-back" size={20} color="#94A3B8" />
    </Pressable>
  );
}
