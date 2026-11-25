import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Field } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { buildReaderHtml, isArabicText, readRaw, READER_INIT_JS } from "@/lib/knowledge";
import { inputAlign } from "@/lib/rtl";
import { useKnowledge } from "@/store/useKnowledge";

const BLUE = "#0E6FA5";
const MAX_BYTES = 6_000_000;

/** قارئ المعرفة: ويب-فيو محلي، بحث داخل الصفحة، إشارات وملاحظات، حجم خط ووضع ليلي */
export default function KnowledgeReader() {
  const router = useRouter();
  const { id, pos, q: q0 } = useLocalSearchParams<{ id: string; pos?: string; q?: string }>();
  const item = useKnowledge((s) => s.items.find((i) => i.id === id));
  const marks = useKnowledge((s) => s.marks.filter((m) => m.itemId === id));
  const notes = useKnowledge((s) => s.notes.filter((n) => n.itemId === id));
  const { fontSize, night, setPrefs, patchItem, addMark, removeMark, addNote, removeNote } = useKnowledge();

  const web = useRef<WebView>(null);
  const prog = useRef(pos ? Number(pos) || 0 : item?.progress ?? 0);
  const saveT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [percent, setPercent] = useState(Math.round(prog.current * 100));

  const [searchOpen, setSearchOpen] = useState(!!q0);
  const [q, setQ] = useState(q0 ?? "");
  const [hl, setHl] = useState({ n: 0, i: -1 });
  const [sheet, setSheet] = useState(false);
  const [tab, setTab] = useState<"marks" | "notes">("marks");
  const [noteText, setNoteText] = useState("");
  const initial = useRef({ fs: fontSize, night });

  const run = (js: string) => web.current?.injectJavaScript(`${js};true;`);

  useEffect(() => {
    if (!item) return;
    patchItem(item.id, { openedAt: Date.now() });
    (async () => {
      try {
        if (item.size > MAX_BYTES) throw new Error("big");
        const raw = await readRaw(item);
        setHtml(buildReaderHtml(raw, item.ext, isArabicText(raw), initial.current.fs, initial.current.night));
      } catch (e) {
        setErr(String((e as Error)?.message) === "big" ? "الملف كبير جدًا للقراءة داخل التطبيق. افتحه بتطبيق آخر." : "تعذّرت قراءة الملف.");
      }
    })();
    return () => {
      if (saveT.current) clearTimeout(saveT.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  useEffect(() => {
    run(`window.__set&&window.__set(${fontSize},${night})`);
  }, [fontSize, night]);

  const savePos = (v: number) => {
    prog.current = v;
    setPercent(Math.round(v * 100));
    if (saveT.current) clearTimeout(saveT.current);
    saveT.current = setTimeout(() => item && patchItem(item.id, { progress: v }), 800);
  };

  const onLoaded = () => {
    run(READER_INIT_JS);
    setTimeout(() => {
      run(`window.__set(${fontSize},${night})`);
      if (prog.current > 0.005) run(`window.__goPos(${prog.current})`);
      if (q0) run(`window.__hl(${JSON.stringify(q0)})`);
    }, 150);
  };

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const m = JSON.parse(e.nativeEvent.data);
      if (m.t === "p") savePos(m.v);
      else if (m.t === "hl") setHl({ n: m.n, i: m.i });
      else if (m.t === "snip" && item) {
        addMark(item.id, m.p, m.v || "إشارة");
        Alert.alert("تمت إضافة الإشارة");
      }
    } catch {
      // رسالة غير مفهومة
    }
  };

  const doSearch = (t: string) => {
    setQ(t);
    run(`window.__hl(${JSON.stringify(t)})`);
  };
  const closeSearch = () => {
    setSearchOpen(false);
    setQ("");
    setHl({ n: 0, i: -1 });
    run("window.__clearHl&&window.__clearHl()");
  };

  const sorted = useMemo(() => ({ marks: [...marks].sort((a, b) => a.pos - b.pos), notes: [...notes].sort((a, b) => a.pos - b.pos) }), [marks, notes]);

  if (!item) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>المادة غير موجودة</Text>
        <Button label="رجوع" onPress={() => router.back()} className="mt-4" />
      </SafeAreaView>
    );
  }

  const bg = night ? "#0b1220" : "#F4F4F4";
  const fg = night ? "#E2E8F0" : "#0F172A";
  const icon = (name: React.ComponentProps<typeof Ionicons>["name"], onPress: () => void, active?: boolean) => (
    <Pressable onPress={onPress} hitSlop={6} className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: active ? BLUE : night ? "#1e293b" : "#FFFFFF" }}>
      <Ionicons name={name} size={19} color={active ? "#FFFFFF" : fg} />
    </Pressable>
  );

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: bg }}>
      <View className="flex-row items-center gap-2 px-3 pt-1 pb-2">
        {icon("arrow-forward", () => router.back())}
        <Text w="bold" numberOfLines={1} className="flex-1 text-base" style={{ color: fg }}>
          {item.title}
        </Text>
        {icon("search", () => (searchOpen ? closeSearch() : setSearchOpen(true)), searchOpen)}
        {icon("bookmark-outline", () => run("window.__snip()"))}
        {icon("list", () => setSheet(true))}
      </View>

      {searchOpen && (
        <View className="flex-row items-center gap-2 mx-3 mb-2 rounded-2xl px-3 border" style={{ backgroundColor: night ? "#1e293b" : "#FFFFFF", borderColor: night ? "#334155" : "#E3E6EB" }}>
          <TextInput
            autoFocus={!q0}
            value={q}
            onChangeText={doSearch}
            placeholder="ابحث في هذه الصفحة"
            placeholderTextColor="#94A3B8"
            style={{ flex: 1, paddingVertical: 8, fontFamily: "Cairo_400Regular", fontSize: 15, textAlign: inputAlign(), color: fg }}
          />
          <Text className="text-xs" style={{ color: "#94A3B8" }}>
            {hl.n ? `${hl.i + 1}/${hl.n}` : q ? "0" : ""}
          </Text>
          <Pressable onPress={() => run("window.__next(-1)")} hitSlop={8}>
            <Ionicons name="chevron-up" size={20} color={fg} />
          </Pressable>
          <Pressable onPress={() => run("window.__next(1)")} hitSlop={8}>
            <Ionicons name="chevron-down" size={20} color={fg} />
          </Pressable>
        </View>
      )}

      <View style={{ flex: 1 }}>
        {err ? (
          <View className="flex-1 items-center justify-center px-8 gap-3">
            <Text className="text-center" style={{ color: fg }}>
              {err}
            </Text>
            <Button
              label="فتح بتطبيق آخر"
              onPress={async () => {
                if (await Sharing.isAvailableAsync()) Sharing.shareAsync(item.uri, { dialogTitle: item.title });
              }}
            />
          </View>
        ) : html == null ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={BLUE} />
        ) : (
          <WebView
            ref={web}
            originWhitelist={["*"]}
            source={{ html }}
            javaScriptEnabled
            onMessage={onMessage}
            onLoadEnd={onLoaded}
            style={{ backgroundColor: bg }}
            setSupportMultipleWindows={false}
            allowFileAccess={false}
            onShouldStartLoadWithRequest={(r) => r.url === "about:blank" || r.url.startsWith("data:") || r.url.startsWith("about:")}
          />
        )}
      </View>

      {/* شريط سفلي: التقدم + الخط + الليل */}
      <View className="flex-row items-center gap-3 px-4 py-2" style={{ backgroundColor: night ? "#0f172a" : "#FFFFFF" }}>
        <Pressable onPress={() => setPrefs({ fontSize: Math.max(13, fontSize - 2) })} hitSlop={8}>
          <Text w="bold" className="text-sm" style={{ color: fg }}>
            أ-
          </Text>
        </Pressable>
        <Pressable onPress={() => setPrefs({ fontSize: Math.min(32, fontSize + 2) })} hitSlop={8}>
          <Text w="bold" className="text-lg" style={{ color: fg }}>
            أ+
          </Text>
        </Pressable>
        <View className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: night ? "#1e293b" : "#E2E8F0" }}>
          <View style={{ width: `${percent}%`, height: "100%", backgroundColor: BLUE }} />
        </View>
        <Text className="text-xs w-9 text-center" style={{ color: fg }}>
          {percent}%
        </Text>
        <Pressable onPress={() => setPrefs({ night: !night })} hitSlop={8}>
          <Ionicons name={night ? "sunny" : "moon"} size={20} color={fg} />
        </Pressable>
      </View>

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="الإشارات والملاحظات">
        <View className="flex-row gap-2 mb-3">
          <Chip label={`الإشارات ${marks.length}`} selected={tab === "marks"} color={BLUE} onPress={() => setTab("marks")} />
          <Chip label={`الملاحظات ${notes.length}`} selected={tab === "notes"} color={BLUE} onPress={() => setTab("notes")} />
        </View>

        {tab === "marks" ? (
          sorted.marks.length === 0 ? (
            <Text className="text-muted text-center py-4">اضغط أيقونة الإشارة في الأعلى لحفظ موضعك</Text>
          ) : (
            sorted.marks.map((m) => (
              <View key={m.id} className="flex-row items-center gap-2 bg-slate-50 border border-line rounded-2xl p-3 mb-2">
                <Pressable
                  className="flex-1"
                  onPress={() => {
                    setSheet(false);
                    run(`window.__goPos(${m.pos})`);
                  }}
                >
                  <Text className="text-xs text-muted">{Math.round(m.pos * 100)}%</Text>
                  <Text w="semi" numberOfLines={2}>
                    {m.label}
                  </Text>
                </Pressable>
                <Pressable onPress={() => removeMark(m.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </Pressable>
              </View>
            ))
          )
        ) : (
          <>
            <Field value={noteText} onChangeText={setNoteText} multiline placeholder="ملاحظة عند موضعك الحالي" style={{ minHeight: 70 }} />
            <Button
              label="إضافة ملاحظة"
              small
              onPress={() => {
                if (!noteText.trim()) return;
                addNote(item.id, prog.current, noteText.trim());
                setNoteText("");
              }}
              className="mb-3"
            />
            {sorted.notes.map((n) => (
              <View key={n.id} className="flex-row items-center gap-2 bg-slate-50 border border-line rounded-2xl p-3 mb-2">
                <Pressable
                  className="flex-1"
                  onPress={() => {
                    setSheet(false);
                    run(`window.__goPos(${n.pos})`);
                  }}
                >
                  <Text className="text-xs text-muted">{Math.round(n.pos * 100)}%</Text>
                  <Text>{n.text}</Text>
                </Pressable>
                <Pressable onPress={() => removeNote(n.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </Pressable>
              </View>
            ))}
          </>
        )}
      </Sheet>
    </SafeAreaView>
  );
}
