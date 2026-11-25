import { Pressable, View } from "react-native";
import { SuggestionRow } from "@/components/smart/SuggestionRow";
import { SmartInput } from "@/components/smart/SmartInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useNow } from "@/hooks/useNow";
import { useSmartSuggestions } from "@/hooks/useSmartSuggestions";
import { useSmart } from "@/store/useSmart";

/** شاشة المساعد الذكي: إضافة بجملة واحدة + كل الاقتراحات الحالية */
export default function SmartScreen() {
  const now = useNow(60_000);
  const { list, hidden, summary } = useSmartSuggestions(now);
  const restore = useSmart((s) => s.restore);

  return (
    <Screen title="المساعد الذكي" subtitle={summary} back>
      <View className="bg-surface rounded-[28px] border border-line p-4 mb-3">
        <SmartInput />
      </View>

      {list.length === 0 ? (
        <EmptyState icon="checkmark-circle-outline" title="لا شيء يحتاج انتباهك" hint="سأنبّهك عند ظهور تعارض أو تأخّر أو فرصة لتنظيم وقتك" />
      ) : (
        <View style={{ gap: 8 }}>
          {list.map((s) => (
            <SuggestionRow key={s.id} s={s} />
          ))}
        </View>
      )}

      {hidden > 0 ? (
        <Pressable onPress={restore} className="self-center mt-4 py-2" accessibilityLabel="إظهار المتجاهَلة">
          <Text w="semi" className="text-xs" style={{ color: "#6366F1" }}>
            إظهار {hidden} اقتراحات تجاهلتها اليوم
          </Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}
