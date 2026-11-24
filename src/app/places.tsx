import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Location from "expo-location";
import * as Sharing from "expo-sharing";
import Svg, { Circle, Polyline } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Chip, Segmented } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Field } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { bearing, buildGpx, dirName, distM, fmtDist, fmtDur, parseCoords, parseGpx, type LL, type Pt } from "@/lib/geo";
import { PLACE_CATS, usePlaces, type Place, type PlaceCat, type Track } from "@/store/usePlaces";
import { useKnowledge } from "@/store/useKnowledge";
import { useShortcutMenu } from "@/store/useShortcutMenu";

const BLUE = "#0E6FA5";

function MiniMap({ pts, w = 84, h = 56 }: { pts: Pt[]; w?: number; h?: number }) {
  const s = useMemo(() => {
    if (pts.length < 2) return null;
    const lats = pts.map((p) => p[0]);
    const lngs = pts.map((p) => p[1]);
    const minLa = Math.min(...lats), maxLa = Math.max(...lats), minLo = Math.min(...lngs), maxLo = Math.max(...lngs);
    const k = Math.cos(((minLa + maxLa) / 2) * (Math.PI / 180));
    const spanX = Math.max((maxLo - minLo) * k, 1e-6);
    const spanY = Math.max(maxLa - minLa, 1e-6);
    const sc = Math.min((w - 10) / spanX, (h - 10) / spanY);
    const ox = (w - spanX * sc) / 2;
    const oy = (h - spanY * sc) / 2;
    const step = Math.max(1, Math.floor(pts.length / 200));
    const pp = pts.filter((_, i) => i % step === 0 || i === pts.length - 1).map((p) => ({ x: ox + (p[1] - minLo) * k * sc, y: h - oy - (p[0] - minLa) * sc }));
    return { line: pp.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "), a: pp[0], b: pp[pp.length - 1] };
  }, [pts, w, h]);
  return (
    <View style={{ width: w, height: h, borderRadius: 14, backgroundColor: "#EAF3F8", overflow: "hidden" }}>
      {s ? (
        <Svg width={w} height={h}>
          <Polyline points={s.line} fill="none" stroke={BLUE} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          <Circle cx={s.a.x} cy={s.a.y} r={3.5} fill="#16A34A" />
          <Circle cx={s.b.x} cy={s.b.y} r={3.5} fill="#DC2626" />
        </Svg>
      ) : null}
    </View>
  );
}

const openInMaps = async (p: LL, name: string) => {
  const url = `geo:${p.lat},${p.lng}?q=${p.lat},${p.lng}(${encodeURIComponent(name)})`;
  try {
    await Linking.openURL(url);
  } catch {
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`).catch(() => Alert.alert("لا يوجد تطبيق خرائط"));
  }
};
const navigateTo = async (p: LL) => {
  try {
    await Linking.openURL(`google.navigation:q=${p.lat},${p.lng}`);
  } catch {
    try {
      await Linking.openURL(`geo:${p.lat},${p.lng}?q=${p.lat},${p.lng}`);
    } catch {
      Alert.alert("لا يوجد تطبيق خرائط");
    }
  }
};

/** أماكني: مواقع محفوظة (بمسافة واتجاه)، تسجيل مسارات GPS، استيراد/تصدير GPX */
export default function PlacesScreen() {
  const router = useRouter();
  const { places, tracks, rec, addPlace, patchPlace, removePlace, addTrack, renameTrack, removeTrack, startRec, stopRec } = usePlaces();
  const kItems = useKnowledge((s) => s.items);
  const showMenu = useShortcutMenu((s) => s.show);

  const [tab, setTab] = useState<"places" | "tracks">("places");
  const [me, setMe] = useState<LL | null>(null);
  const [locBusy, setLocBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  // نموذج المكان
  const [form, setForm] = useState<null | { id?: string }>(null);
  const [fName, setFName] = useState("");
  const [fCoords, setFCoords] = useState("");
  const [fCat, setFCat] = useState<PlaceCat>("other");
  const [fNote, setFNote] = useState("");
  const [fLink, setFLink] = useState<string | undefined>();
  const [pickLink, setPickLink] = useState(false);
  const [rename, setRename] = useState<Track | null>(null);
  const [rName, setRName] = useState("");

  const locate = useCallback(async (): Promise<LL | null> => {
    setLocBusy(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("الإذن مطلوب", "فعّل إذن الموقع من إعدادات الهاتف.");
        return null;
      }
      const last = await Location.getLastKnownPositionAsync();
      if (last) setMe({ lat: last.coords.latitude, lng: last.coords.longitude });
      const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const p = { lat: cur.coords.latitude, lng: cur.coords.longitude };
      setMe(p);
      return p;
    } catch {
      Alert.alert("تعذّر تحديد الموقع", "تأكد من تشغيل GPS.");
      return null;
    } finally {
      setLocBusy(false);
    }
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);
  useEffect(() => {
    if (!rec) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [rec]);

  const sorted = useMemo(() => {
    const withD = places.map((p) => ({ p, d: me ? distM(me, p) : null }));
    return withD.sort((a, b) => (a.d != null && b.d != null ? a.d - b.d : b.p.createdAt - a.p.createdAt));
  }, [places, me]);

  const openForm = (p?: Place, preset?: Partial<{ name: string; cat: PlaceCat; coords: LL }>) => {
    setForm({ id: p?.id });
    setFName(p?.name ?? preset?.name ?? "");
    const c = p ? { lat: p.lat, lng: p.lng } : preset?.coords ?? me;
    setFCoords(c ? `${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}` : "");
    setFCat(p?.cat ?? preset?.cat ?? "other");
    setFNote(p?.note ?? "");
    setFLink(p?.knowledgeId);
    setPickLink(false);
  };

  const saveForm = () => {
    const c = parseCoords(fCoords);
    if (!fName.trim()) return Alert.alert("اكتب اسم المكان");
    if (!c) return Alert.alert("الإحداثيات غير مفهومة", "اكتبها هكذا: 24.7136, 46.6753 أو الصق رابط خرائط.");
    const data = { name: fName.trim(), lat: c.lat, lng: c.lng, cat: fCat, note: fNote.trim() || undefined, knowledgeId: fLink };
    if (form?.id) patchPlace(form.id, data);
    else addPlace(data);
    setForm(null);
  };

  const saveHere = async (cat: PlaceCat, name: string) => {
    const p = me ?? (await locate());
    if (!p) return;
    addPlace({ name, lat: p.lat, lng: p.lng, cat });
    setTab("places");
  };

  const placeMenu = (p: Place) =>
    showMenu(p.name, [
      { label: "ابدأ التنقل", icon: "navigate", hint: "يفتح تطبيق الخرائط عندك (مثل Organic Maps إن كان مثبّتًا)", onPress: () => navigateTo(p) },
      { label: "عرض على الخريطة", icon: "map-outline", onPress: () => openInMaps(p, p.name) },
      ...(p.knowledgeId && kItems.some((k) => k.id === p.knowledgeId)
        ? [{ label: "اقرأ عن المكان", icon: "book-outline", onPress: () => router.push({ pathname: "/knowledge-read", params: { id: p.knowledgeId! } }) }]
        : []),
      {
        label: "مشاركة الموقع (GPX)",
        icon: "share-outline",
        onPress: () => shareGpx(p.name, [{ name: p.name, lat: p.lat, lng: p.lng, desc: p.note }], []),
      },
      { label: "تعديل", icon: "pencil-outline", onPress: () => openForm(p) },
      { label: "حذف", icon: "trash-outline", onPress: () => Alert.alert("حذف المكان؟", p.name, [{ text: "إلغاء", style: "cancel" }, { text: "حذف", style: "destructive", onPress: () => removePlace(p.id) }]) },
    ]);

  const shareGpx = async (name: string, w: Parameters<typeof buildGpx>[1], t: Parameters<typeof buildGpx>[2]) => {
    try {
      const safe = name.replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 40) || "export";
      const uri = `${FileSystem.cacheDirectory}${safe}.gpx`;
      await FileSystem.writeAsStringAsync(uri, buildGpx(name, w, t));
      if (!(await Sharing.isAvailableAsync())) return Alert.alert("المشاركة غير متاحة");
      await Sharing.shareAsync(uri, { mimeType: "application/gpx+xml", dialogTitle: name });
    } catch (e) {
      Alert.alert("تعذّر التصدير", String((e as Error)?.message ?? e));
    }
  };

  const trackMenu = (t: Track) =>
    showMenu(t.name, [
      { label: "تصدير GPX", icon: "share-outline", hint: "يفتح في Organic Maps وغيره", onPress: () => shareGpx(t.name, [], [{ name: t.name, pts: t.pts }]) },
      {
        label: "عرض بداية المسار على الخريطة",
        icon: "map-outline",
        onPress: () => openInMaps({ lat: t.pts[0][0], lng: t.pts[0][1] }, t.name),
      },
      {
        label: "إعادة تسمية",
        icon: "pencil-outline",
        onPress: () => {
          setRename(t);
          setRName(t.name);
        },
      },
      { label: "حذف", icon: "trash-outline", onPress: () => Alert.alert("حذف المسار؟", t.name, [{ text: "إلغاء", style: "cancel" }, { text: "حذف", style: "destructive", onPress: () => removeTrack(t.id) }]) },
    ]);

  const importGpx = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: "*/*", multiple: true, copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.length) return;
      let w = 0, t = 0, bad = 0;
      for (const a of res.assets) {
        if (!a.name.toLowerCase().endsWith(".gpx")) {
          bad++;
          continue;
        }
        const g = parseGpx(await FileSystem.readAsStringAsync(a.uri));
        g.wpts.forEach((p) => addPlace({ name: p.name, lat: p.lat, lng: p.lng, cat: "other", note: p.desc }));
        g.trks.forEach((k) => addTrack(k.name, k.pts));
        w += g.wpts.length;
        t += g.trks.length;
      }
      Alert.alert("تم الاستيراد", `${w} مكان • ${t} مسار${bad ? `\n(تخطّيت ${bad} ملف ليس GPX)` : ""}`);
    } catch (e) {
      Alert.alert("تعذّر الاستيراد", String((e as Error)?.message ?? e));
    }
  };

  const toggleRec = async () => {
    if (rec) {
      const t = stopRec();
      if (!t) Alert.alert("لم يُحفظ المسار", "كان قصيرًا جدًا (أقل من نقطتين).");
      else Alert.alert("تم حفظ المسار", `${fmtDist(t.distance)} • ${fmtDur(t.durationSec)}`);
      return;
    }
    const r = await startRec();
    if (r === "denied") Alert.alert("الإذن مطلوب", "فعّل إذن الموقع من إعدادات الهاتف.");
    else if (r === "error") Alert.alert("تعذّر بدء التسجيل", "تأكد من تشغيل GPS.");
  };

  return (
    <Screen
      back
      title="أماكني"
      subtitle={`${places.length} مكان • ${tracks.length} مسار`}
      right={
        <Pressable onPress={importGpx} hitSlop={8} className="w-10 h-10 rounded-full bg-surface border border-line items-center justify-center">
          <Ionicons name="download-outline" size={20} color="#0F172A" />
        </Pressable>
      }
      overlay={tab === "places" ? <Fab onPress={() => openForm()} color={BLUE} icon="add" /> : undefined}
    >
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "places", label: "الأماكن" },
          { value: "tracks", label: "المسارات" },
        ]}
      />

      {tab === "places" ? (
        <View className="mt-3">
          {/* موقعي الآن */}
          <View className="bg-surface border border-line rounded-3xl p-4 mb-3">
            <View className="flex-row items-center gap-3">
              <View className="w-11 h-11 rounded-2xl items-center justify-center" style={{ backgroundColor: "#D6EBF7" }}>
                <Ionicons name="locate" size={22} color={BLUE} />
              </View>
              <View className="flex-1">
                <Text w="bold">موقعي الآن</Text>
                <Text className="text-xs text-muted">{me ? `${me.lat.toFixed(5)}, ${me.lng.toFixed(5)}` : locBusy ? "جارٍ التحديد…" : "غير محدد"}</Text>
              </View>
              <Pressable onPress={locate} hitSlop={8}>
                <Ionicons name="refresh" size={20} color={BLUE} />
              </Pressable>
            </View>
            <View className="flex-row gap-2 mt-3">
              <Button label="موقف سيارتي" icon="car" small variant="soft" onPress={() => saveHere("parking", "موقف سيارتي")} className="flex-1" />
              <Button label="احفظ موقعي" icon="bookmark" small variant="soft" onPress={() => openForm(undefined, { coords: me ?? undefined })} className="flex-1" />
            </View>
          </View>

          {places.length === 0 ? (
            <EmptyState icon="location-outline" title="لا أماكن محفوظة" hint="احفظ موقعك أو أضف مكانًا بالإحداثيات أو برابط خرائط، أو استورد ملف GPX. الأماكن تبقى معك بلا إنترنت." />
          ) : (
            sorted.map(({ p, d }) => {
              const meta = PLACE_CATS[p.cat];
              const b = me ? bearing(me, p) : null;
              return (
                <Pressable key={p.id} onPress={() => placeMenu(p)} className="flex-row items-center gap-3 bg-surface border border-line rounded-2xl p-3 mb-2">
                  <View className="w-11 h-11 rounded-2xl items-center justify-center" style={{ backgroundColor: meta.hex + "22" }}>
                    <Ionicons name={meta.icon as never} size={21} color={meta.hex} />
                  </View>
                  <View className="flex-1">
                    <Text w="semi" numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text className="text-xs text-muted" numberOfLines={1}>
                      {[d != null ? fmtDist(d) : null, b != null ? dirName(b) : null, p.note].filter(Boolean).join(" • ") || meta.label}
                    </Text>
                  </View>
                  {b != null ? (
                    <View style={{ transform: [{ rotate: `${b}deg` }] }}>
                      <Ionicons name="arrow-up-circle" size={26} color={meta.hex} />
                    </View>
                  ) : null}
                  {p.knowledgeId && kItems.some((k) => k.id === p.knowledgeId) ? <Ionicons name="book" size={16} color="#94A3B8" /> : null}
                </Pressable>
              );
            })
          )}
        </View>
      ) : (
        <View className="mt-3">
          <View className="rounded-3xl p-4 mb-3" style={{ backgroundColor: rec ? "#0F1B3D" : "#FFFFFF", borderWidth: rec ? 0 : 1, borderColor: "#E3E6EB" }}>
            {rec ? (
              <View className="flex-row items-center justify-between mb-3">
                <View>
                  <Text className="text-xs" style={{ color: "#94A3B8" }}>
                    المسافة
                  </Text>
                  <Text w="bold" className="text-2xl" style={{ color: "#FFFFFF" }}>
                    {fmtDist(rec.distance)}
                  </Text>
                </View>
                <View>
                  <Text className="text-xs" style={{ color: "#94A3B8" }}>
                    المدة
                  </Text>
                  <Text w="bold" className="text-2xl" style={{ color: "#FFFFFF" }}>
                    {fmtDur((now - rec.startedAt) / 1000)}
                  </Text>
                </View>
                <View>
                  <Text className="text-xs" style={{ color: "#94A3B8" }}>
                    النقاط
                  </Text>
                  <Text w="bold" className="text-2xl" style={{ color: "#FFFFFF" }}>
                    {rec.pts.length}
                  </Text>
                </View>
              </View>
            ) : (
              <Text className="text-sm text-muted mb-3">يسجّل مسارك بالـGPS بلا إنترنت. أبقِ الشاشة مفتوحة أثناء التسجيل.</Text>
            )}
            <Button label={rec ? "إيقاف وحفظ" : "بدء تسجيل مسار"} icon={rec ? "stop" : "radio-button-on"} variant={rec ? "danger" : "solid"} onPress={toggleRec} />
          </View>

          {tracks.length === 0 ? (
            <EmptyState icon="trail-sign-outline" title="لا مسارات بعد" hint="سجّل مسارًا جديدًا أو استورد ملف GPX من الزر أعلى الشاشة." />
          ) : (
            tracks.map((t) => (
              <Pressable key={t.id} onPress={() => trackMenu(t)} className="flex-row items-center gap-3 bg-surface border border-line rounded-2xl p-3 mb-2">
                <MiniMap pts={t.pts} />
                <View className="flex-1">
                  <Text w="semi" numberOfLines={2}>
                    {t.name}
                  </Text>
                  <Text className="text-xs text-muted">
                    {[fmtDist(t.distance), t.durationSec ? fmtDur(t.durationSec) : null, t.ascent > 1 ? `↑ ${Math.round(t.ascent)} م` : null].filter(Boolean).join(" • ")}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
      )}

      <Sheet visible={!!form} onClose={() => setForm(null)} title={form?.id ? "تعديل المكان" : "مكان جديد"}>
        <Field label="الاسم" value={fName} onChangeText={setFName} />
        <Field
          label="الإحداثيات أو رابط خرائط"
          value={fCoords}
          onChangeText={setFCoords}
          autoCapitalize="none"
          placeholder="24.7136, 46.6753"
          hint={me ? undefined : "الصق رابطًا من خرائط جوجل أو اكتب خط العرض والطول"}
        />
        {me ? <Button label="استخدم موقعي الحالي" icon="locate" small variant="soft" className="mb-3" onPress={() => setFCoords(`${me.lat.toFixed(6)}, ${me.lng.toFixed(6)}`)} /> : null}
        <View className="flex-row flex-wrap gap-2 mb-3">
          {(Object.keys(PLACE_CATS) as PlaceCat[]).map((c) => (
            <Chip key={c} label={PLACE_CATS[c].label} selected={fCat === c} color={PLACE_CATS[c].hex} onPress={() => setFCat(c)} />
          ))}
        </View>
        <Field label="ملاحظة" value={fNote} onChangeText={setFNote} multiline style={{ minHeight: 60 }} />
        {kItems.length > 0 && (
          <View className="mb-3">
            <Button
              label={fLink ? `مرتبط بمقال: ${kItems.find((k) => k.id === fLink)?.title ?? ""}`.slice(0, 48) : "ربط بمقال من المعرفة"}
              icon="book-outline"
              small
              variant="soft"
              onPress={() => setPickLink((v) => !v)}
            />
            {pickLink && (
              <ScrollView style={{ maxHeight: 180, marginTop: 8 }} nestedScrollEnabled>
                {fLink ? (
                  <Pressable onPress={() => { setFLink(undefined); setPickLink(false); }} className="py-2">
                    <Text className="text-red-600">إزالة الربط</Text>
                  </Pressable>
                ) : null}
                {kItems.map((k) => (
                  <Pressable key={k.id} onPress={() => { setFLink(k.id); setPickLink(false); }} className="py-2 border-b border-line">
                    <Text numberOfLines={1} w={fLink === k.id ? "bold" : "regular"}>
                      {k.title}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        )}
        <Button label="حفظ" onPress={saveForm} />
      </Sheet>

      <Sheet visible={!!rename} onClose={() => setRename(null)} title="إعادة تسمية المسار">
        <Field value={rName} onChangeText={setRName} />
        <Button
          label="حفظ"
          onPress={() => {
            if (rename && rName.trim()) renameTrack(rename.id, rName.trim());
            setRename(null);
          }}
        />
      </Sheet>
    </Screen>
  );
}
