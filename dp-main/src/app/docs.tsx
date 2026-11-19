import { Alert, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { fmtDateShort, toISO } from "@/lib/dates";
import { KIND_ICON, kindOf, useDocs } from "@/store/useDocs";

const fmtSize = (b: number) => (b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1000))} KB`);

/** مكتبة المستندات: PDF، Word، Excel، صور، نصوص — تُنسخ داخل التطبيق وتُفتح دون مغادرته */
export default function DocsScreen() {
  const router = useRouter();
  const docs = useDocs((s) => s.docs);
  const importDocs = useDocs((s) => s.importDocs);
  const removeDoc = useDocs((s) => s.removeDoc);

  const add = async () => {
    try {
      await importDocs();
    } catch (e) {
      Alert.alert("تعذّر الاستيراد", String((e as Error)?.message ?? e));
    }
  };

  return (
    <Screen title="المستندات" subtitle={`${docs.length} ملف`} back overlay={<Fab onPress={add} color="#7C3AED" bottom={24} icon="document-attach" />}>
      {docs.length === 0 ? (
        <EmptyState icon="document-text-outline" title="لا مستندات بعد" hint="اضغط الزر لإضافة PDF أو Word أو Excel أو صور أو نصوص" />
      ) : (
        docs.map((d) => {
          const kind = kindOf(d.ext);
          return (
            <Pressable
              key={d.id}
              onPress={() => router.push({ pathname: "/doc/[id]", params: { id: d.id } })}
              onLongPress={() =>
                Alert.alert("حذف المستند", d.name, [
                  { text: "إلغاء", style: "cancel" },
                  { text: "حذف", style: "destructive", onPress: () => removeDoc(d.id) },
                ])
              }
              className="flex-row items-center gap-3 bg-surface border border-line rounded-2xl p-3 mb-2.5"
            >
              <View className="w-12 h-12 rounded-2xl items-center justify-center" style={{ backgroundColor: "#EDE9FE" }}>
                <Ionicons name={KIND_ICON[kind] as never} size={24} color="#7C3AED" />
              </View>
              <View className="flex-1">
                <Text w="semi" numberOfLines={1}>
                  {d.name}
                </Text>
                <Text className="text-xs text-muted">
                  {d.ext.toUpperCase() || "ملف"} • {fmtSize(d.size)} • {fmtDateShort(toISO(new Date(d.addedAt)))}
                </Text>
              </View>
              <Ionicons name="chevron-back" size={18} color="#94A3B8" />
            </Pressable>
          );
        })
      )}
      {docs.length ? <Text className="text-[11px] text-muted text-center mt-2">اضغط مطوّلًا على ملف لحذفه.</Text> : null}
    </Screen>
  );
}
