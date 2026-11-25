import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SuggestionRow } from "@/components/smart/SuggestionRow";
import { Text } from "@/components/ui/Text";
import { useSmartSuggestions } from "@/hooks/useSmartSuggestions";

const VIOLET = "#6366F1";

/** المساعد الذكي في الرئيسية: ملخص اليوم + أهم ما يحتاج انتباهك الآن */
export function SmartCard({ now }: { now: Date }) {
  const router = useRouter();
  const { list, summary } = useSmartSuggestions(now);
  const top = list.slice(0, 3);

  return (
    <View className="bg-surface rounded-[28px] border border-line p-4">
      <Pressable onPress={() => router.push("/smart" as never)} className="flex-row items-center gap-3 mb-3" accessibilityLabel="المساعد الذكي">
        <View className="w-10 h-10 rounded-2xl items-center justify-center" style={{ backgroundColor: VIOLET }}>
          <Ionicons name="sparkles" size={20} color="#FFFFFF" />
        </View>
        <View className="flex-1">
          <Text w="bold" className="text-lg">
            المساعد الذكي
          </Text>
          <Text className="text-xs text-muted" numberOfLines={2}>
            {summary}
          </Text>
        </View>
        <Ionicons name="chevron-back" size={20} color="#94A3B8" />
      </Pressable>

      {top.length === 0 ? (
        <View className="flex-row items-center gap-2 rounded-2xl p-3" style={{ backgroundColor: "#DCFCE7" }}>
          <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
          <Text w="semi" className="text-sm" style={{ color: "#166534" }}>
            كل شيء على ما يرام، لا شيء يحتاج انتباهك
          </Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {top.map((s) => (
            <SuggestionRow key={s.id} s={s} compact />
          ))}
          {list.length > top.length ? (
            <Pressable onPress={() => router.push("/smart" as never)} className="self-center py-1">
              <Text w="semi" className="text-xs" style={{ color: VIOLET }}>
                عرض {list.length - top.length} اقتراحات أخرى
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <Pressable
        onPress={() => router.push("/smart" as never)}
        className="flex-row items-center gap-2 mt-3 rounded-2xl border border-line px-3 py-2.5"
        accessibilityLabel="أضف بجملة"
      >
        <Ionicons name="chatbubble-ellipses-outline" size={18} color={VIOLET} />
        <Text className="text-sm text-muted flex-1">اكتب: «غدًا الساعة 5 موعد مع سارة»…</Text>
        <Ionicons name="mic-outline" size={18} color="#94A3B8" />
      </Pressable>
    </View>
  );
}
