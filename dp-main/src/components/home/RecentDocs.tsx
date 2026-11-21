import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, SectionHeader } from "@/components/ui/EmptyState";
import { Text } from "@/components/ui/Text";
import { fmtDateShort, toISO } from "@/lib/dates";
import { KIND_ICON, kindOf, useDocs } from "@/store/useDocs";

const fmtSize = (b: number) => (b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1000))} KB`);

/** آخر 3 مستندات (حسب تاريخ الإضافة) في الشاشة الرئيسية */
export function RecentDocs() {
  const router = useRouter();
  const docs = useDocs((s) => s.docs);
  const recent = useMemo(() => [...docs].sort((a, b) => b.addedAt - a.addedAt).slice(0, 3), [docs]);

  return (
    <>
      <SectionHeader title="المستندات الأخيرة" action="كل المستندات" onAction={() => router.push("/documents")} />
      {recent.length === 0 ? (
        <Card>
          <EmptyState icon="document-text-outline" title="لا مستندات بعد" />
          <Button label="إضافة" icon="document-attach-outline" variant="soft" onPress={() => router.push("/documents")} />
        </Card>
      ) : (
        recent.map((d) => {
          const kind = kindOf(d.ext);
          return (
            <Pressable
              key={d.id}
              onPress={() => router.push({ pathname: "/doc/[id]", params: { id: d.id } })}
              className="flex-row items-center gap-3 bg-surface border border-line rounded-2xl p-3 mb-2.5"
            >
              <View className="w-12 h-12 rounded-2xl items-center justify-center" style={{ backgroundColor: "#D6EBF7" }}>
                <Ionicons name={KIND_ICON[kind] as never} size={24} color="#0E6FA5" />
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
    </>
  );
}
