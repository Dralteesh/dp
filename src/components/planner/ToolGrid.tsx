import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PCard } from "@/components/planner/kit";
import { Text } from "@/components/ui/Text";
import { PL } from "@/design/planner";

export type ToolItem = { label: string; icon: string; path: string; params?: Record<string, string> };

function Tile({ it, cols }: { it: ToolItem; cols: number }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push((it.params ? { pathname: it.path, params: it.params } : it.path) as never)}
      accessibilityLabel={it.label}
      style={{ width: `${100 / cols - 2}%`, flexGrow: 1 }}
    >
      <PCard style={{ alignItems: "center", paddingVertical: 14, paddingHorizontal: 6, gap: 6, minHeight: 92 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: PL.white, borderWidth: 1, borderColor: PL.border, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={it.icon as never} size={22} color={PL.blue} />
        </View>
        <Text w="semi" numberOfLines={2} style={{ fontSize: 11.5, color: PL.navy, textAlign: "center" }}>
          {it.label}
        </Text>
      </PCard>
    </Pressable>
  );
}

/** شبكة أزرار أدوات/أقسام (مشتركة بين الأدوات والعيادة) */
export function ToolGrid({ items, cols }: { items: ToolItem[]; cols: number }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {items.map((it) => (
        <Tile key={it.label + it.path} it={it} cols={cols} />
      ))}
    </View>
  );
}
