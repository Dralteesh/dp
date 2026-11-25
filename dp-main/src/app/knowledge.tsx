import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Fab } from "@/components/ui/Fab";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { isHtmlExt, normalize, searchLibrary, type Hit } from "@/lib/knowledge";
import { inputAlign } from "@/lib/rtl";
import { useKnowledge, type KItem } from "@/store/useKnowledge";
import { useZim } from "@/store/useZim";
import { useShortcutMenu } from "@/store/useShortcutMenu";

const BLUE = "#0E6FA5";
const fmtSize = (b: number) => (b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1000))} KB`);
type View_ = "items" | "marks" | "notes";

/** المعرفة: مكتبة قراءة offline (HTML/TXT/MD) مع بحث نصي كامل وإشارات وملاحظات */
export default function KnowledgeScreen() {
  const router = useRouter();
  const { items, marks, notes, importFiles, addText, removeItem, patchItem } = useKnowledge();
  const showMenu = useShortcutMenu((s) => s.show);
  const zimCount = useZim((s) => s.zims.length);

  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<string>("all");
  const [view, setView] = useState<View_>("items");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  const [edit, setEdit] = useState<KItem | null>(null);
  const [eTitle, setETitle] = useState("");
  const [eTopic, setETopic] = useState("");
  const [compose, setCompose] = useState(false);
  const [cTitle, setCTitle] = useState("");
  const [cTopic, setCTopic] = useState("");
  const [cBody, setCBody] = useState("");

  const open = (id: string, extra?: { pos?: number; q?: string }) =>
    router.push({ pathname: "/knowledge-read", params: { id, ...(extra?.pos != null ? { pos: String(extra.pos) } : {}), ...(extra?.q ? { q: extra.q } : {}) } });

  // بحث نصي كامل مع تأخير بسيط
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits(null);
      setBusy(false);
      return;
    }
    const my = ++seq.current;
    setBusy(true);
    const t = setTimeout(async () => {
      const r = await searchLibrary(items, term);
      if (my === seq.current) {
        setHits(r);
        setBusy(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [q, items]);

  const topics = useMemo(() => Array.from(new Set(items.map((i) => i.topic).filter(Boolean) as string[])), [items]);
  const list = useMemo(
    () =>
      [...items]
        .filter((i) => (topic === "all" ? true : topic === "__fav" ? !!i.fav : i.topic === topic))
        .sort((a, b) => Math.max(b.openedAt ?? 0, b.addedAt) - Math.max(a.openedAt ?? 0, a.addedAt)),
    [items, topic],
  );
  const resume = useMemo(
    () => [...items].filter((i) => i.openedAt && (i.progress ?? 0) > 0.02 && (i.progress ?? 0) < 0.97).sort((a, b) => (b.openedAt ?? 0) - (a.openedAt ?? 0))[0],
    [items],
  );
  const titleOf = (id: string) => items.find((i) => i.id === id)?.title ?? "";

  const doImport = async () => {
    try {
      const { added, skipped } = await importFiles();
      if (skipped) Alert.alert("بعض الملفات تُخطّيت", `${skipped} ملف بصيغة غير مدعومة. المدعوم: HTML وTXT وMD. لملفات PDF استخدم المستندات.`);
      else if (!added) return;
    } catch (e) {
      Alert.alert("تعذّر الاستيراد", String((e as Error)?.message ?? e));
    }
  };

  const fabMenu = () =>
    showMenu("إضافة إلى المعرفة", [
      { label: "استيراد ملفات", icon: "download-outline", hint: "HTML وTXT وMD (صفحات ويب محفوظة، مقالات)", onPress: doImport },
      { label: "كتابة أو لصق مقال", icon: "create-outline", onPress: () => setCompose(true) },
    ]);

  const itemMenu = (it: KItem) =>
    showMenu(it.title.slice(0, 40), [
      { label: it.fav ? "إزالة من المفضلة" : "إضافة إلى المفضلة", icon: it.fav ? "star" : "star-outline", onPress: () => patchItem(it.id, { fav: !it.fav }) },
      {
        label: "تعديل العنوان والموضوع",
        icon: "pencil-outline",
        onPress: () => {
          setEdit(it);
          setETitle(it.title);
          setETopic(it.topic ?? "");
        },
      },
      {
        label: "مشاركة الملف",
        icon: "share-outline",
        onPress: async () => {
          if (await Sharing.isAvailableAsync()) Sharing.shareAsync(it.uri, { dialogTitle: it.title });
        },
      },
      {
        label: "حذف",
        icon: "trash-outline",
        onPress: () => Alert.alert("حذف من المعرفة؟", it.title, [{ text: "إلغاء", style: "cancel" }, { text: "حذف", style: "destructive", onPress: () => removeItem(it.id) }]),
      },
    ]);

  const saveEdit = () => {
    if (!edit) return;
    patchItem(edit.id, { title: eTitle.trim() || edit.title, topic: eTopic.trim() || undefined });
    setEdit(null);
  };
  const saveCompose = async () => {
    if (!cBody.trim()) return Alert.alert("اكتب نص المقال أو الصقه أولًا");
    const id = await addText(cTitle || cBody.trim().slice(0, 40), cBody, cTopic);
    setCompose(false);
    setCTitle("");
    setCTopic("");
    setCBody("");
    open(id);
  };

  const searching = q.trim().length >= 2;

  return (
    <Screen back title="المعرفة" subtitle={`${items.length} مادة • تعمل بلا إنترنت`} overlay={<Fab onPress={fabMenu} color={BLUE} icon="add" />}>
      {/* ملفات ZIM */}
      <Pressable onPress={() => router.push("/zim")} className="flex-row items-center gap-3 bg-surface border border-line rounded-2xl p-3 mb-3">
        <View className="w-11 h-11 rounded-2xl items-center justify-center" style={{ backgroundColor: "#DBEAFE" }}>
          <Ionicons name="albums-outline" size={22} color="#2563EB" />
        </View>
        <View className="flex-1">
          <Text w="bold">ملفات ZIM</Text>
          <Text className="text-xs text-muted">{zimCount > 0 ? `${zimCount} ملف • ويكيبيديا وغيرها` : "ويكيبيديا وغيرها بصيغة Kiwix"}</Text>
        </View>
        <Ionicons name="chevron-back" size={18} color="#94A3B8" />
      </Pressable>

      {/* البحث */}
      <View className="flex-row items-center gap-2 bg-surface border border-line rounded-2xl px-3 mb-3">
        <Ionicons name="search" size={18} color="#94A3B8" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="بحث في عناوين ونصوص كل المواد"
          placeholderTextColor="#94A3B8"
          style={{ flex: 1, paddingVertical: 10, fontFamily: "Cairo_400Regular", fontSize: 15, textAlign: inputAlign(), color: "#0F172A" }}
        />
        {busy ? <ActivityIndicator size="small" color={BLUE} /> : q ? (
          <Pressable onPress={() => setQ("")} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </Pressable>
        ) : null}
      </View>

      {searching ? (
        <>
          {hits && hits.length === 0 && !busy ? <EmptyState icon="search-outline" title="لا نتائج" hint="جرّب كلمات أقل أو أبسط" /> : null}
          {(hits ?? []).map((h) => (
            <Pressable
              key={h.item.id}
              onPress={() => open(h.item.id, { q: normalize(q.trim()).split(/\s+/)[0] })}
              className="bg-surface border border-line rounded-2xl p-3 mb-2"
            >
              <View className="flex-row items-center justify-between">
                <Text w="bold" numberOfLines={1} className="flex-1">
                  {h.item.title}
                </Text>
                {h.count > 0 ? <Text className="text-xs text-muted">{h.count} تطابق</Text> : null}
              </View>
              {h.snippet ? (
                <Text className="text-sm text-slate-600 mt-1" numberOfLines={3}>
                  {h.snippet}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
            <Chip label={`المواد ${items.length}`} selected={view === "items"} color={BLUE} onPress={() => setView("items")} />
            <Chip label={`الإشارات ${marks.length}`} selected={view === "marks"} color={BLUE} onPress={() => setView("marks")} />
            <Chip label={`الملاحظات ${notes.length}`} selected={view === "notes"} color={BLUE} onPress={() => setView("notes")} />
          </ScrollView>

          {view === "items" && (
            <>
              {(topics.length > 0 || items.some((i) => i.fav)) && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
                  <Chip label="الكل" selected={topic === "all"} onPress={() => setTopic("all")} />
                  {items.some((i) => i.fav) && <Chip label="المفضلة" icon="star" selected={topic === "__fav"} onPress={() => setTopic("__fav")} />}
                  {topics.map((t) => (
                    <Chip key={t} label={t} selected={topic === t} onPress={() => setTopic(t)} />
                  ))}
                </ScrollView>
              )}

              {resume && topic === "all" ? (
                <Pressable onPress={() => open(resume.id, { pos: resume.progress })} className="rounded-3xl p-4 mb-4" style={{ backgroundColor: BLUE }}>
                  <View className="flex-row items-center gap-3">
                    <View className="w-12 h-12 rounded-2xl items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.18)" }}>
                      <Ionicons name="book" size={24} color="#FFFFFF" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs" style={{ color: "#D6EBF7" }}>
                        تابع القراءة
                      </Text>
                      <Text w="bold" numberOfLines={1} style={{ color: "#FFFFFF" }}>
                        {resume.title}
                      </Text>
                      <Text className="text-xs" style={{ color: "#D6EBF7" }}>
                        وصلت إلى {Math.round((resume.progress ?? 0) * 100)}%
                      </Text>
                    </View>
                    <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                  </View>
                </Pressable>
              ) : null}

              {items.length === 0 ? (
                <EmptyState icon="library-outline" title="مكتبتك فارغة" hint="اضغط + لاستيراد صفحات HTML أو ملفات نصية، أو الصق مقالًا. كل شيء يُحفظ داخل الجهاز ويُقرأ بلا إنترنت." />
              ) : (
                list.map((it) => (
                  <Pressable
                    key={it.id}
                    onPress={() => open(it.id, { pos: it.progress })}
                    onLongPress={() => itemMenu(it)}
                    className="flex-row items-center gap-3 bg-surface border border-line rounded-2xl p-3 mb-2"
                  >
                    <View className="w-11 h-11 rounded-2xl items-center justify-center" style={{ backgroundColor: isHtmlExt(it.ext) ? "#DBEAFE" : "#E2E8F0" }}>
                      <Ionicons name={isHtmlExt(it.ext) ? "globe-outline" : "document-text-outline"} size={22} color={isHtmlExt(it.ext) ? "#2563EB" : "#475569"} />
                    </View>
                    <View className="flex-1">
                      <Text w="semi" numberOfLines={2}>
                        {it.title}
                      </Text>
                      <Text className="text-xs text-muted">
                        {[it.topic, fmtSize(it.size), it.progress ? `${Math.round(it.progress * 100)}%` : null].filter(Boolean).join(" • ")}
                      </Text>
                    </View>
                    {it.fav ? <Ionicons name="star" size={16} color="#F59E0B" /> : null}
                  </Pressable>
                ))
              )}
            </>
          )}

          {view === "marks" &&
            (marks.length === 0 ? (
              <EmptyState icon="bookmark-outline" title="لا إشارات بعد" hint="داخل القارئ اضغط أيقونة الإشارة لحفظ موضعك" />
            ) : (
              marks.map((m) => (
                <Pressable key={m.id} onPress={() => open(m.itemId, { pos: m.pos })} className="bg-surface border border-line rounded-2xl p-3 mb-2">
                  <Text className="text-xs text-muted" numberOfLines={1}>
                    {titleOf(m.itemId)} • {Math.round(m.pos * 100)}%
                  </Text>
                  <Text w="semi" numberOfLines={2}>
                    {m.label || "إشارة"}
                  </Text>
                </Pressable>
              ))
            ))}

          {view === "notes" &&
            (notes.length === 0 ? (
              <EmptyState icon="create-outline" title="لا ملاحظات بعد" hint="داخل القارئ افتح القائمة وأضف ملاحظة عند موضعك" />
            ) : (
              notes.map((n) => (
                <Pressable key={n.id} onPress={() => open(n.itemId, { pos: n.pos })} className="bg-surface border border-line rounded-2xl p-3 mb-2">
                  <Text className="text-xs text-muted" numberOfLines={1}>
                    {titleOf(n.itemId)} • {Math.round(n.pos * 100)}%
                  </Text>
                  <Text>{n.text}</Text>
                </Pressable>
              ))
            ))}
        </>
      )}

      <Sheet visible={!!edit} onClose={() => setEdit(null)} title="تعديل المادة">
        <Field label="العنوان" value={eTitle} onChangeText={setETitle} />
        <Field label="الموضوع (للتصنيف)" value={eTopic} onChangeText={setETopic} placeholder="مثال: جراحة، سفر، لغة" />
        <Button label="حفظ" onPress={saveEdit} />
      </Sheet>

      <Sheet visible={compose} onClose={() => setCompose(false)} title="مقال جديد">
        <Field label="العنوان" value={cTitle} onChangeText={setCTitle} />
        <Field label="الموضوع (اختياري)" value={cTopic} onChangeText={setCTopic} />
        <Field label="النص" value={cBody} onChangeText={setCBody} multiline style={{ minHeight: 180 }} placeholder="الصق النص هنا" />
        <Button label="حفظ وفتح" onPress={saveCompose} />
      </Sheet>
    </Screen>
  );
}
