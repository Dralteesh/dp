import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { runSmartAction } from "@/lib/smartRun";
import type { SmartLevel, Suggestion } from "@/lib/smart";
import { useSmart } from "@/store/useSmart";

export const LEVEL_LOOK: Record<SmartLevel, { hex: string; soft: string; label: string }> = {
  urgent: { hex: "#DC2626", soft: "#FEE2E2", label: "عاجل" },
  important: { hex: "#D97706", soft: "#FEF3C7", label: "مهم" },
  info: { hex: "#2563EB", soft: "#DBEAFE", label: "للعلم" },
};

/** صف اقتراح: أيقونة بلون الأهمية + عنوان + زر إجراء + تجاهل لليوم */
export function SuggestionRow({ s, compact }: { s: Suggestion; compact?: boolean }) {
  const router = useRouter();
  const dismiss = useSmart((st) => st.dismiss);
  const look = LEVEL_LOOK[s.level];

  const run = () => {
    if (!s.action) return;
    runSmartAction(router as never, s.action);
    // الإجراءات التي تُنجز الأمر فعلًا تُخفي الاقتراح
    if (s.action.kind !== "route") dismiss(s.id);
  };

  return (
    <View className="flex-row items-start gap-3 rounded-2xl p-3" style={{ backgroundColor: look.soft }}>
      <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: look.hex }}>
        <Ionicons name={s.icon as never} size={18} color="#FFFFFF" />
      </View>
      <View className="flex-1">
        <Text w="semi" className="text-sm" style={{ color: "#0F1B3D" }} numberOfLines={compact ? 2 : undefined}>
          {s.title}
        </Text>
        {s.detail ? (
          <Text className="text-xs mt-0.5" style={{ color: "#475569" }} numberOfLines={compact ? 2 : undefined}>
            {s.detail}
          </Text>
        ) : null}
        {s.action ? (
          <Pressable
            onPress={run}
            hitSlop={6}
            className="self-start mt-2 rounded-full px-3 py-1.5"
            style={{ backgroundColor: look.hex }}
            accessibilityLabel={s.action.label}
          >
            <Text w="semi" className="text-xs" style={{ color: "#FFFFFF" }}>
              {s.action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable onPress={() => dismiss(s.id)} hitSlop={10} accessibilityLabel="تجاهل اليوم">
        <Ionicons name="close" size={18} color="#64748B" />
      </Pressable>
    </View>
  );
}
