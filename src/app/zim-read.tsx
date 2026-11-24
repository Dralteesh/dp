import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, BackHandler, Pressable, ScrollView, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { READER_INIT_JS } from "@/lib/knowledge";
import { bytesToB64, getZim, resolvePath, type ZimFile } from "@/lib/zim";
import { prepareArticle, ZIM_JS } from "@/lib/zimHtml";
import { inputAlign } from "@/lib/rtl";
import { useKnowledge } from "@/store/useKnowledge";
import { useZim } from "@/store/useZim";

const BLUE = "#0E6FA5";
const MAX_IMG = 1_500_000;

/** قارئ ZIM: بحث بالعناوين، تنقّل بين الروابط الداخلية، صور تُحمَّل عند الظهور، مفضلة */
export default function ZimReader() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useZim((s) => s.zims.find((z) => z.id === id));
  const favs = useZim((s) => s.favs);
  const toggleFav = useZim((s) => s.toggleFav);
  const touch = useZim((s) => s.touch);
  const { fontSize, night, setPrefs } = useKnowledge();

  const web = useRef<WebView>(null);
  const zimRef = useRef<ZimFile | null>(null);
  const hist = useRef<string[]>([]);
  const curPath = useRef("");
  const token = useRef(0);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const [html, setHtml] = useState<string | null>(null);
  const [cur, setCur] = useState<{ path: string; title: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ path: string; title: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [favSheet, setFavSheet] = useState(false);
  const sseq = useRef(0);

  const run = (js: string) => web.current?.injectJavaScript(`${js};true;`);

  const showEntryPath = useCallback(
    async (path: string, push: boolean) => {
      const zim = zimRef.current;
      if (!zim) return;
      const my = ++token.current;
      setLoading(true);
      setErr(null);
      setSearchOpen(false);
      try {
        const idx = await zim.lookup(path);
        if (idx < 0) throw new Error("لم أجد هذه الصفحة داخل الملف");
        const p = await prepareArticle(zim, await zim.entryAt(idx), useKnowledge.getState().fontSize, useKnowledge.getState().night);
        if (my !== token.current) return;
        if (!p.html) throw new Error("هذا المحتوى ليس صفحة نصية (صورة أو ملف آخر)");
        if (push && curPath.current) hist.current.push(curPath.current);
        curPath.current = p.path;
        setCur({ path: p.path, title: p.title });
        setHtml(p.html);
        setKey((k) => k + 1);
      } catch (e) {
        if (my === token.current) setErr(String((e as Error)?.message ?? e));
      } finally {
        if (my === token.current) setLoading(false);
      }
    },
    [],
  );

  const goHome = useCallback(async () => {
    const zim = zimRef.current;
    if (!zim) return;
    const e = await zim.home();
    if (!e) {
      setErr("لا توجد صفحة رئيسية في هذا الملف. استخدم البحث.");
      setLoading(false);
      return;
    }
    showEntryPath(zim.pathOf(e), true);
  }, [showEntryPath]);

  useEffect(() => {
    if (!item) return;
    touch(item.id);
    (async () => {
      try {
        zimRef.current = await getZim(item.id, item.uri);
        await goHome();
      } catch (e) {
        setErr(String((e as Error)?.message ?? e));
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const back = useCallback(() => {
    const prev = hist.current.pop();
    if (prev) {
      showEntryPath(prev, false);
      return true;
    }
    return false;
  }, [showEntryPath]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (searchOpen) {
        setSearchOpen(false);
        return true;
      }
      return back();
    });
    return () => sub.remove();
  }, [back, searchOpen]);

  useEffect(() => {
    run(`window.__set&&window.__set(${fontSize},${night})`);
  }, [fontSize, night]);

  // بحث العناوين
  useEffect(() => {
    const term = q.trim();
    if (!searchOpen || term.length < 1 || !zimRef.current) {
      setResults([]);
      setSearching(false);
      return;
    }
    const my = ++sseq.current;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await zimRef.current!.searchTitles(term, 20);
        if (my === sseq.current) setResults(r);
      } catch {
        if (my === sseq.current) setResults([]);
      } finally {
        if (my === sseq.current) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, searchOpen]);

  const onMessage = (e: WebViewMessageEvent) => {
    let m: { t: string; i?: number; s?: string; h?: string };
    try {
      m = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    const zim = zimRef.current;
    if (!zim) return;
    if (m.t === "img" && m.s != null && m.i != null) {
      const tok = token.current;
      const src = m.s;
      const i = m.i;
      chain.current = chain.current
        .then(async () => {
          if (tok !== token.current) return;
          const idx = await zim.lookup(resolvePath(curPath.current, src));
          if (idx < 0) return;
          const en = await zim.follow(await zim.entryAt(idx));
          const bytes = await zim.blobOf(en);
          if (bytes.length > MAX_IMG || tok !== token.current) return;
          run(`window.__setImg(${i},${JSON.stringify(`data:${zim.mimeOf(en)};base64,${bytesToB64(bytes)}`)})`);
        })
        .catch(() => {});
    } else if (m.t === "link" && m.h) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(m.h)) {
        Alert.alert("رابط خارجي", "هذا الرابط يحتاج إنترنت ولا يوجد داخل الملف.");
        return;
      }
      showEntryPath(resolvePath(curPath.current, m.h), true);
    }
  };

  const onLoaded = () => {
    run(READER_INIT_JS);
    run(ZIM_JS);
    setTimeout(() => run(`window.__set(${fontSize},${night})`), 120);
  };

  if (!item) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>الملف غير موجود</Text>
        <Button label="رجوع" onPress={() => router.back()} className="mt-4" />
      </SafeAreaView>
    );
  }

  const bg = night ? "#0b1220" : "#F4F4F4";
  const fg = night ? "#E2E8F0" : "#0F172A";
  const isFav = !!cur && favs.some((f) => f.zimId === item.id && f.path === cur.path);
  const icon = (name: React.ComponentProps<typeof Ionicons>["name"], onPress: () => void, active?: boolean) => (
    <Pressable onPress={onPress} hitSlop={6} className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: active ? BLUE : night ? "#1e293b" : "#FFFFFF" }}>
      <Ionicons name={name} size={19} color={active ? "#FFFFFF" : fg} />
    </Pressable>
  );
  const myFavs = favs.filter((f) => f.zimId === item.id);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: bg }}>
      <View className="flex-row items-center gap-2 px-3 pt-1 pb-2">
        {icon("arrow-forward", () => (hist.current.length ? back() : router.back()))}
        <View className="flex-1">
          <Text w="bold" numberOfLines={1} className="text-base" style={{ color: fg }}>
            {cur?.title ?? item.name}
          </Text>
          <Text className="text-xs" numberOfLines={1} style={{ color: "#94A3B8" }}>
            {item.name}
          </Text>
        </View>
        {icon("search", () => setSearchOpen((v) => !v), searchOpen)}
        {icon(isFav ? "star" : "star-outline", () => cur && toggleFav({ zimId: item.id, path: cur.path, title: cur.title }), isFav)}
        {icon("home-outline", () => goHome())}
        {icon("list", () => setFavSheet(true))}
      </View>

      {searchOpen && (
        <View className="mx-3 mb-2 rounded-2xl border" style={{ backgroundColor: night ? "#1e293b" : "#FFFFFF", borderColor: night ? "#334155" : "#E3E6EB", maxHeight: 360 }}>
          <View className="flex-row items-center gap-2 px-3">
            <TextInput
              autoFocus
              value={q}
              onChangeText={setQ}
              placeholder="ابحث في العناوين (بداية الكلمة)"
              placeholderTextColor="#94A3B8"
              style={{ flex: 1, paddingVertical: 10, fontFamily: "Cairo_400Regular", fontSize: 15, textAlign: inputAlign(), color: fg }}
            />
            {searching ? <ActivityIndicator size="small" color={BLUE} /> : null}
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {results.map((r) => (
              <Pressable key={r.path} onPress={() => showEntryPath(r.path, true)} className="px-4 py-3 border-t" style={{ borderColor: night ? "#334155" : "#EEF1F4" }}>
                <Text numberOfLines={1} style={{ color: fg }}>
                  {r.title}
                </Text>
              </Pressable>
            ))}
            {q.trim() && !searching && results.length === 0 ? (
              <Text className="text-center text-muted py-4 text-sm">لا نتائج. البحث بالعناوين فقط ويبدأ من أول الكلمة.</Text>
            ) : null}
          </ScrollView>
        </View>
      )}

      <View style={{ flex: 1 }}>
        {err ? (
          <View className="flex-1 items-center justify-center px-8 gap-3">
            <Text className="text-center" style={{ color: fg }}>
              {err}
            </Text>
            <Button label="رجوع" variant="soft" onPress={() => router.back()} />
          </View>
        ) : html == null ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={BLUE} />
        ) : (
          <>
            <WebView
              key={key}
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
            {loading ? (
              <View pointerEvents="none" style={{ position: "absolute", top: 8, alignSelf: "center" }}>
                <ActivityIndicator color={BLUE} />
              </View>
            ) : null}
          </>
        )}
      </View>

      <View className="flex-row items-center justify-center gap-6 px-4 py-2" style={{ backgroundColor: night ? "#0f172a" : "#FFFFFF" }}>
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
        <Pressable onPress={() => setPrefs({ night: !night })} hitSlop={8}>
          <Ionicons name={night ? "sunny" : "moon"} size={20} color={fg} />
        </Pressable>
      </View>

      <Sheet visible={favSheet} onClose={() => setFavSheet(false)} title="المفضلة">
        {myFavs.length === 0 ? (
          <Text className="text-muted text-center py-4">اضغط النجمة لحفظ الصفحة الحالية</Text>
        ) : (
          myFavs.map((f) => (
            <View key={f.path} className="flex-row items-center gap-2 bg-slate-50 border border-line rounded-2xl p-3 mb-2">
              <Pressable
                className="flex-1"
                onPress={() => {
                  setFavSheet(false);
                  showEntryPath(f.path, true);
                }}
              >
                <Text w="semi" numberOfLines={2}>
                  {f.title}
                </Text>
              </Pressable>
              <Pressable onPress={() => toggleFav(f)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
              </Pressable>
            </View>
          ))
        )}
      </Sheet>
    </SafeAreaView>
  );
}
