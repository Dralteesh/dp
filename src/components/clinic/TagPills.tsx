import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { tagColor } from "@/lib/tags";

/** وسوم المريض كحبّات صغيرة ملوّنة */
export function TagPills({ tags }: { tags?: string[] }) {
  if (!tags?.length) return null;
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {tags.map((t) => (
        <View key={t} className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: tagColor(t) + "22" }}>
          <Text w="semi" className="text-[11px]" style={{ color: tagColor(t) }}>
            {t}
          </Text>
        </View>
      ))}
    </View>
  );
}
