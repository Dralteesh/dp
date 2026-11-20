import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { fmtDateShort, toISO } from "@/lib/dates";
import { inputAlign } from "@/lib/rtl";
import { KIND_ICON, KIND_META, kindOf, mimeOf, useDocs, type DocItem, type DocKind } from "@/store/useDocs";

const BLUE = "#0E6FA5";
const fmtSize = (b: number) => (b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1000))} KB`);
const norm = (s: string) => s.replace(/[\u064B-\u0652\u0640]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").toLowerCase();

type Filter = "all" | "fav" | DocKind;
const FILTERS: { v: Filter; label: string }[] = [
  { v: "all", label: "الكل" },
  { v: "fav", label: "المفضلة" },
  { v: "pdf", label: "PDF" },
  { v: "docx", label: "Word" },
  { v: "sheet", label: "Excel" },
  { v: "image", label: "صور" },
  { v: "text", label: "نصوص" },
];

/** تبويب المستندات: مكتبة PDF وWord وExcel وصور ونصوص، مع «تابع القراءة» وبحث وتصفية ومفضلة */
export default function DocsTab() {
  const router = useRouter();
  const docs = useDocs((s) => s.docs);
  const importDocs = useDocs((s) => s.importDocs);
  const removeDoc = useDocs((s) => s.removeDoc);
  const toggleFav = useDocs((s) => s.toggleFav);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const open = (d: DocItem) => router.push({ pathname: "/doc/[id]", params: { id: d.id } });

  const add = async () => {
    try {
      await importDocs();
    } catch (e) {
      Alert.alert("تعذّر الاستيراد", String((e as Error)?.message ?? e));
    }
  };

  const share = async (d: DocItem) => {
    if (!(await Sharing.isAvailableAsync())) return Alert.alert("غير متاح", "المشاركة غير متاحة على هذا الجهاز.");
    await Sharing.shareAsync(d.uri, { mimeType: mimeOf(d.ext), dialogTitle: d.name });
  };

  const menu = (d: DocItem) =>
    Alert.alert(d.name, undefined, [
      { text: d.fav ? "إزالة من المفضلة" : "إضافة إلى المفضلة", onPress: () => toggleFav(d.id) },
      { text: "مشاركة / فتح بتطبيق آخر", onPress: () => share(d) },
      {
        text: "حذف",
        style: "destructive",
        onPress: () => Alert.alert("حذف المستند؟", d.name, [{ text: "إلغاء", style: "cancel" }, { text: "حذف", style: "destructive", onPress: () => removeDoc(d.id) }]),
      },
      { text: "إلغاء", style: "cancel" },
    ]);

  /** آخر PDF فُتح ولم يكتمل */
  const resume = useMemo(
    () =>
      [...docs]
        .filter((d) => kindOf(d.ext) === "pdf" && d.openedAt && d.pages && (d.page ?? 1) < d.pages)
        .sort((a, b) => (b.openedAt ?? 0) - (a.openedAt ?? 0))[0],
    [docs],
  );

  const list = useMemo(() => {
    const nq = norm(q.trim());
    return [...docs]
      .filter((d) => (filter === "all" ? true : filter === "fav" ? !!d.fav : kindOf(d.ext) === filter))
      .filter((d) => !nq || norm(d.name).includes(nq))
      .sort((a, b) => Math.max(b.openedAt ?? 0, b.addedAt) - Math.max(a.openedAt ?? 0, a.addedAt));
  }, [docs, q, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: docs.length, fav: docs.filter((d) => d.fav).length };
    for (const d of docs) c[kindOf(d.ext)] = (c[kindOf(d.ext)] ?? 0) + 1;
    return c;
  }, [docs]);

  return (
    <Screen title="المستندات" subtitle={`${docs.length} ملف`} overlay={<Fab onPress={add} color={BLUE} icon="document-attach" />}>
      {docs.length > 0 && (
        <View className="flex-row items-center gap-2 bg-surface border border-line rounded-2xl px-3 mb-3">
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="ابحث في المستندات"
            placeholderTextColor="#94A3B8"
            style={{ flex: 1, paddingVertical: 10, fontFamily: "Cairo_400Regular", fontSize: 15, textAlign: inputAlign(), color: "#0F172A" }}
          />
          {q ? (
            <Pressable onPress={() => setQ("")} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>
      )}

      {docs.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
          {FILTERS.filter((f) => f.v === "all" || (counts[f.v] ?? 0) > 0).map((f) => (
            <Chip key={f.v} label={`${f.label} ${counts[f.v] ?? 0}`} selected={filter === f.v} color={BLUE} onPress={() => setFilter(f.v)} />
          ))}
        </ScrollView>
      )}

      {resume && !q && filter === "all" ? (
        <Pressable onPress={() => open(resume)} className="rounded-3xl p-4 mb-4" style={{ backgroundColor: BLUE }}>
          <View className="flex-row items-center gap-3">
            <View className="w-12 h-12 rounded-2xl items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.18)" }}>
              <Ionicons name="book" size={24} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-xs" style={{ color: "#D6EBF7" }}>
                تابع القراءة
              </Text>
              <Text w="bold" numberOfLines={1} style={{ color: "#FFFFFF" }}>
                {resume.name}
              </Text>
              <Text className="text-xs" style={{ color: "#D6EBF7" }}>
                صفحة {resume.page ?? 1} من {resume.pages}
              </Text>
            </View>
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </View>
          <View className="h-1.5 rounded-full mt-3 overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.25)" }}>
            <View style={{ width: `${Math.round(((resume.page ?? 1) / (resume.pages ?? 1)) * 100)}%`, height: "100%", backgroundColor: "#FFF9C9" }} />
          </View>
        </Pressable>
      ) : null}

      {docs.length === 0 ? (
        <EmptyState icon="document-text-outline" title="لا مستندات بعد" hint="اضغط الزر لإضافة PDF أو Word أو Excel أو صور أو نصوص" />
      ) : list.length === 0 ? (
        <EmptyState icon="search-outline" title="لا نتائج" />
      ) : (
        list.map((d) => {
          const kind = kindOf(d.ext);
          const m = KIND_META[kind];
          const pct = kind === "pdf" && d.pages ? Math.round(((d.page ?? 1) / d.pages) * 100) : 0;
          return (
            <Pressable key={d.id} onPress={() => open(d)} onLongPress={() => menu(d)} className="flex-row items-center gap-3 bg-surface border border-line rounded-2xl p-3 mb-2.5">
              <View className="w-12 h-12 rounded-2xl items-center justify-center" style={{ backgroundColor: m.soft }}>
                <Ionicons name={KIND_ICON[kind] as never} size={24} color={m.hex} />
              </View>
              <View className="flex-1">
                <Text w="semi" numberOfLines={1}>
                  {d.name}
                </Text>
                <Text className="text-xs text-muted">
                  {m.label} • {fmtSize(d.size)} • {fmtDateShort(toISO(new Date(d.addedAt)))}
                  {kind === "pdf" && d.pages ? ` • ${d.pages} صفحة` : ""}
                </Text>
                {pct > 0 ? (
                  <View className="h-1 rounded-full mt-1.5 overflow-hidden" style={{ backgroundColor: "#D6EBF7" }}>
                    <View style={{ width: `${pct}%`, height: "100%", backgroundColor: BLUE }} />
                  </View>
                ) : null}
              </View>
              <Pressable onPress={() => toggleFav(d.id)} hitSlop={10} accessibilityLabel="مفضلة">
                <Ionicons name={d.fav ? "star" : "star-outline"} size={20} color={d.fav ? "#F59E0B" : "#94A3B8"} />
              </Pressable>
            </Pressable>
          );
        })
      )}
      {docs.length ? <Text className="text-[11px] text-muted text-center mt-2">اضغط مطوّلًا على ملف للمزيد (مفضلة، مشاركة، حذف).</Text> : null}
    </Screen>
  );
}
