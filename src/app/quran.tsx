import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, Share, TextInput, View, useWindowDimensions } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PageView, NIGHT, PAPER, arNum } from "@/components/quran/PageView";
import { Text } from "@/components/ui/Text";
import { GlassCard, NightShell, SoftChip } from "@/design/kit";
import { DS } from "@/design/tokens";
import {
  SURAHS,
  SURAH_START_PAGE,
  audioPath,
  deleteAudio,
  downloadAudio,
  downloadedSurahs,
  loadAyahText,
  remoteAudio,
  type MushafPage,
  type PageAyah,
} from "@/lib/quran";
import { useQuranPrefs } from "@/store/useQuranPrefs";
import { useSettings } from "@/store/useSettings";

const TRANSLATIONS: Array<[string, string]> = [
  ["none", "بدون"],
  ["en.sahih", "English"],
  ["fr.hamidullah", "Français"],
  ["tr.diyanet", "Türkçe"],
  ["ur.jalandhry", "اردو"],
  ["id.indonesian", "Indonesia"],
];
const PAGES = Array.from({ length: 604 }, (_, i) => i + 1);

/** القرآن: فهرس بنمط الشاشات الليلية + مصحف صفحة كاملة تُسحب أفقيًا */
export default function QuranScreen() {
  const prefs = useQuranPrefs();
  const [reader, setReader] = useState(false);
  const [startPage, setStartPage] = useState(prefs.lastPage);

  const openPage = (p: number) => {
    setStartPage(p);
    setReader(true);
  };

  if (!reader) return <IndexView onOpen={openPage} />;
  return <Reader startPage={startPage} onList={() => setReader(false)} />;
}

function IndexView({ onOpen }: { onOpen: (p: number) => void }) {
  const lastPage = useQuranPrefs((s) => s.lastPage);
  const bookmarks = useQuranPrefs((s) => s.bookmarks);
  const [q, setQ] = useState("");
  const [saved, setSaved] = useState<Set<number>>(new Set());
  useEffect(() => {
    downloadedSurahs().then(setSaved).catch(() => undefined);
  }, []);
  const rows = useMemo(
    () => SURAHS.map((name, i) => ({ name, n: i + 1 })).filter((r) => !q.trim() || r.name.includes(q.trim()) || String(r.n) === q.trim()),
    [q],
  );
  return (
    <NightShell title="القرآن الكريم">
      <FlatList
        data={rows}
        keyExtractor={(r) => String(r.n)}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 60 }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <Pressable onPress={() => onOpen(lastPage)}>
              <GlassCard style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: DS.accent, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="book" size={22} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text w="bold" style={{ color: "#fff", fontSize: 16 }}>تابع القراءة</Text>
                  <Text style={{ color: DS.onNightSoft, fontSize: 12 }}>الصفحة {arNum(lastPage)}{bookmarks.length ? ` · ${bookmarks.length} علامة` : ""}</Text>
                </View>
                <Ionicons name="chevron-back" size={18} color="#fff" />
              </GlassCard>
            </Pressable>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="ابحث باسم السورة أو رقمها"
              placeholderTextColor={DS.onNightSoft}
              style={{ backgroundColor: DS.glass, borderRadius: DS.rInner, paddingHorizontal: 16, paddingVertical: 12, color: "#fff", textAlign: "right", fontFamily: "Cairo_400Regular" }}
            />
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => onOpen(SURAH_START_PAGE[item.n - 1])}>
            <GlassCard style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: DS.glassStrong, alignItems: "center", justifyContent: "center" }}>
                <Text w="bold" style={{ color: "#fff", fontSize: 13 }}>{item.n}</Text>
              </View>
              <Text w="semi" style={{ color: "#fff", fontSize: 16, flex: 1 }}>{item.name}</Text>
              {saved.has(item.n) ? <Ionicons name="checkmark-circle" size={18} color={DS.good} /> : null}
              <Text style={{ color: DS.onNightSoft, fontSize: 12 }}>ص {arNum(SURAH_START_PAGE[item.n - 1])}</Text>
            </GlassCard>
          </Pressable>
        )}
      />
    </NightShell>
  );
}

function Reader({ startPage, onList }: { startPage: number; onList: () => void }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const prefs = useQuranPrefs();
  const tr = useSettings((s) => s.quranTranslation);
  const update = useSettings((s) => s.update);
  const theme = prefs.paper ? PAPER : NIGHT;
  const bg = prefs.paper ? "#F6EBD3" : "#0F1B3D";
  const barBg = prefs.paper ? "rgba(120,90,30,0.10)" : DS.glass;
  const barInk = prefs.paper ? "#4A3A1E" : "#fff";

  const [page, setPage] = useState(startPage);
  const [info, setInfo] = useState<Record<number, MushafPage>>({});
  const [sel, setSel] = useState<PageAyah | null>(null);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState<number | null>(null);
  const listRef = useRef<FlatList<number>>(null);

  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  const refreshSaved = useCallback(() => downloadedSurahs().then(setSaved).catch(() => undefined), []);
  useEffect(() => {
    refreshSaved();
  }, [refreshSaved]);

  const onViewable = useRef(({ viewableItems }: { viewableItems: Array<{ item: number }> }) => {
    const v = viewableItems[0];
    if (v) {
      setPage(v.item);
      useQuranPrefs.getState().set({ lastPage: v.item });
    }
  }).current;
  const viewCfg = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  const cur = info[page];
  const surahNo = cur?.ayahs[0]?.s ?? 1;
  const juz = cur?.ayahs[0]?.juz;
  const key = sel ? `${sel.s}:${sel.n}` : null;
  const markKeys = useMemo(() => prefs.bookmarks.map((b) => b.split("@")[0]), [prefs.bookmarks]);

  const play = () => {
    if (status.playing) return player.pause();
    player.replace({ uri: saved.has(surahNo) ? audioPath(surahNo) : remoteAudio(surahNo) });
    player.play();
  };
  const download = async () => {
    try {
      setProgress(0);
      await downloadAudio(surahNo, setProgress);
      await refreshSaved();
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e);
      Alert.alert("تعذّر التنزيل", `جرّبنا عدة مصادر ولم ينجح. تحقق من الإنترنت (أو جرّب شبكة أخرى) ثم أعد المحاولة.\n\nالسبب: ${why}`);
    } finally {
      setProgress(null);
    }
  };
  const removeAudio = async () => {
    await deleteAudio(surahNo);
    await refreshSaved();
  };

  const goList = () => {
    player.pause();
    onList();
  };
  const jumpToLast = () => {
    const bm = prefs.bookmarks[prefs.bookmarks.length - 1];
    if (!bm) return Alert.alert("لا علامات", "اضغط آية ثم «علامة» لحفظ موضعها.");
    const pg = Number(bm.split("@")[1]) || 1;
    listRef.current?.scrollToIndex({ index: pg - 1, animated: false });
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
      {/* الشريط العلوي */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
        <Pressable onPress={goList} hitSlop={8} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: barBg, alignItems: "center", justifyContent: "center" }} accessibilityLabel="الفهرس">
          <Ionicons name="list" size={20} color={barInk} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text w="bold" style={{ color: barInk, fontSize: 15 }}>سورة {SURAHS[surahNo - 1]}</Text>
          <Text style={{ color: theme.soft, fontSize: 11 }}>{juz ? `الجزء ${arNum(juz)} · ` : ""}الصفحة {arNum(page)}</Text>
        </View>
        {[
          { icon: "remove" as const, label: "تصغير الخط", on: () => prefs.set({ fontSize: Math.max(22, prefs.fontSize - 2) }) },
          { icon: "add" as const, label: "تكبير الخط", on: () => prefs.set({ fontSize: Math.min(44, prefs.fontSize + 2) }) },
        ].map((b) => (
          <Pressable key={b.label} onPress={b.on} hitSlop={6} accessibilityLabel={b.label} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: barBg, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={b.icon} size={18} color={barInk} />
          </Pressable>
        ))}
        <Pressable onPress={jumpToLast} hitSlop={6} accessibilityLabel="آخر علامة" style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: barBg, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="bookmark" size={16} color={barInk} />
        </Pressable>
      </View>

      {/* الصفحات */}
      <FlatList
        ref={listRef}
        data={PAGES}
        keyExtractor={(p) => String(p)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={startPage - 1}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        removeClippedSubviews
        onViewableItemsChanged={onViewable}
        viewabilityConfig={viewCfg}
        renderItem={({ item }) => (
          <PageView
            page={item}
            width={width}
            fontSize={prefs.fontSize}
            theme={theme}
            tajweed={prefs.tajweed}
            selected={key}
            marked={markKeys}
            onLoaded={(p) => setInfo((m) => (m[p.page] ? m : { ...m, [p.page]: p }))}
            onAyah={setSel}
          />
        )}
      />

      {/* شريط سفلي: صوت + تجويد + ثيم */}
      <View style={{ position: "absolute", start: 16, end: 16, bottom: insets.bottom + 14, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: prefs.paper ? "#fff" : DS.glassStrong, borderRadius: DS.rPill, padding: 8, borderWidth: prefs.paper ? 1 : 0, borderColor: "#E8DCC0" }}>
        <Pressable onPress={play} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: DS.accent, alignItems: "center", justifyContent: "center" }} accessibilityLabel="تشغيل التلاوة">
          <Ionicons name={status.playing ? "pause" : "play"} size={20} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: prefs.paper ? "#4A3A1E" : "#fff", fontSize: 11 }} numberOfLines={1}>
            {progress != null ? `جارٍ التنزيل ${Math.round(progress * 100)}%` : saved.has(surahNo) ? "الصوت محفوظ على الجهاز" : "الصوت يُبثّ من الإنترنت"}
          </Text>
        </View>
        {progress != null ? (
          <ActivityIndicator />
        ) : saved.has(surahNo) ? (
          <Pressable onPress={removeAudio} hitSlop={8}><Ionicons name="trash-outline" size={20} color={DS.alarm} /></Pressable>
        ) : (
          <Pressable onPress={download} hitSlop={8}><Ionicons name="download-outline" size={22} color={prefs.paper ? "#4A3A1E" : "#fff"} /></Pressable>
        )}
        <Pressable onPress={() => prefs.set({ tajweed: !prefs.tajweed })} hitSlop={6} style={{ paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: prefs.tajweed ? DS.good : "transparent", borderWidth: 1, borderColor: prefs.tajweed ? DS.good : theme.frame, alignItems: "center", justifyContent: "center" }}>
          <Text w="semi" style={{ color: prefs.tajweed ? "#052e1b" : prefs.paper ? "#4A3A1E" : "#fff", fontSize: 12 }}>تجويد</Text>
        </Pressable>
        <Pressable onPress={() => prefs.set({ paper: !prefs.paper })} hitSlop={6} style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: prefs.paper ? "#0F1B3D" : "#F6EBD3" }} accessibilityLabel="وضع القراءة">
          <Ionicons name={prefs.paper ? "moon" : "sunny"} size={17} color={prefs.paper ? "#FBBF24" : "#7A5A12"} />
        </Pressable>
      </View>

      <AyahSheet ayah={sel} onClose={() => setSel(null)} tr={tr} onTr={(k) => update({ quranTranslation: k })} bookmarked={key ? markKeys.includes(key) : false} onBookmark={() => key && prefs.toggleBookmark(key, page)} />
    </View>
  );
}

function AyahSheet({ ayah, onClose, tr, onTr, bookmarked, onBookmark }: { ayah: PageAyah | null; onClose: () => void; tr: string; onTr: (k: string) => void; bookmarked: boolean; onBookmark: () => void }) {
  const insets = useSafeAreaInsets();
  const [tafsir, setTafsir] = useState<string | null>(null);
  const [trans, setTrans] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!ayah) return;
    let alive = true;
    setTafsir(null);
    setTrans(null);
    setErr(false);
    loadAyahText(ayah.s, ayah.n, "ar.muyassar").then((t) => alive && setTafsir(t)).catch(() => alive && setErr(true));
    if (tr !== "none") loadAyahText(ayah.s, ayah.n, tr).then((t) => alive && setTrans(t)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [ayah, tr]);

  const share = () => ayah && Share.share({ message: `${ayah.ar} ﴿${arNum(ayah.n)}﴾\n— سورة ${SURAHS[ayah.s - 1]}` });

  return (
    <Modal visible={!!ayah} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={onClose} />
      <View style={{ backgroundColor: DS.night, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 18, paddingBottom: insets.bottom + 18, gap: 12, maxHeight: "70%" }}>
        <Text w="bold" style={{ color: "#fff", fontSize: 16 }}>
          سورة {ayah ? SURAHS[ayah.s - 1] : ""} · آية {ayah ? arNum(ayah.n) : ""}
        </Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable onPress={onBookmark} style={{ flex: 1, backgroundColor: bookmarked ? DS.accent : DS.glass, borderRadius: DS.rInner, paddingVertical: 12, alignItems: "center", gap: 2 }}>
            <Ionicons name={bookmarked ? "bookmark" : "bookmark-outline"} size={20} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 12 }}>{bookmarked ? "إزالة العلامة" : "علامة"}</Text>
          </Pressable>
          <Pressable onPress={share} style={{ flex: 1, backgroundColor: DS.glass, borderRadius: DS.rInner, paddingVertical: 12, alignItems: "center", gap: 2 }}>
            <Ionicons name="share-outline" size={20} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 12 }}>نسخ / مشاركة</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {TRANSLATIONS.map(([k, label]) => (
            <SoftChip key={k} label={label} selected={tr === k} onPress={() => onTr(k)} />
          ))}
        </View>
        <GlassCard style={{ gap: 6 }}>
          <Text w="bold" style={{ color: DS.warn, fontSize: 13 }}>التفسير الميسّر</Text>
          {err ? (
            <Text style={{ color: DS.onNightSoft }}>يحتاج التفسير إنترنت.</Text>
          ) : tafsir == null ? (
            <ActivityIndicator />
          ) : (
            <Text style={{ color: "#fff", lineHeight: 26 }}>{tafsir}</Text>
          )}
          {trans ? <Text style={{ color: DS.onNightSoft, marginTop: 6, textAlign: tr === "ur.jalandhry" ? "right" : "left", writingDirection: tr === "ur.jalandhry" ? "rtl" : "ltr" }}>{trans}</Text> : null}
        </GlassCard>
      </View>
    </Modal>
  );
}
