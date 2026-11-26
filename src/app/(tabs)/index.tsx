import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, Vibration, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Logo } from "@/components/Logo";
import { PrayerCard } from "@/components/PrayerCard";
import { HomeEditor } from "@/components/home/HomeEditor";
import { ClinicHomeCard } from "@/components/home/ClinicHomeCard";
import { SmartCard } from "@/components/home/SmartCard";
import { HomeCountdownCard } from "@/components/countdown/HomeCountdownCard";
import { RecentDocs } from "@/components/home/RecentDocs";
import { UpcomingAlarmsCard } from "@/components/home/UpcomingAlarmsCard";
import { WeatherTile } from "@/components/home/WeatherTile";
import { TimelineCard, remainingMinutes } from "@/components/home/TimelineRow";
import { WeekTimeline } from "@/components/home/WeekTimeline";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { ShortcutMenuHost } from "@/components/ui/ShortcutMenu";
import { Text } from "@/components/ui/Text";
import { NAV_ICONS, TREATMENT_ICONS } from "@/constants/icons";
import { SPAN_PCT, useHomeLayout, type BlockId } from "@/store/useHomeLayout";
import { useDocs } from "@/store/useDocs";
import { useKnowledge } from "@/store/useKnowledge";
import { usePlaces } from "@/store/usePlaces";
import { useAgenda, useAgendaInput } from "@/hooks/useAgenda";
import { useNow } from "@/hooks/useNow";
import { useOpenAgendaItem } from "@/hooks/useOpenAgendaItem";
import { useTheme } from "@/hooks/useTheme";
import { addDays, relativeDay, toISO, toMinutes } from "@/lib/dates";
import { FARD, nextPrayer } from "@/lib/prayer";
import { useFabRequest } from "@/store/useFabRequest";
import { usePrayerLog, type FardKey } from "@/store/usePrayerLog";
import { usePrayerTools } from "@/store/usePrayerTools";
import { useQuickAdd } from "@/store/useQuickAdd";
import { useShortcutMenu } from "@/store/useShortcutMenu";
import { switchUi } from "@/lib/ui";
import { useSettings } from "@/store/useSettings";

const BLUE = "#0E6FA5";
const TIP_KEY = "dp.longpress.tip.v1";
const PRAYER_NAMES: Record<FardKey, string> = { fajr: "الفجر", dhuhr: "الظهر", asr: "العصر", maghrib: "المغرب", isha: "العشاء" };

export default function HomeScreen() {
  useTheme();
  const router = useRouter();
  const now = useNow(1000);
  const today = toISO(now);
  const minuteKey = Math.floor(now.getTime() / 60000);
  const [selected, setSelected] = useState(today);
  const isToday = selected === today;

  const doctorName = useSettings((s) => s.doctorName);
  const logo = useSettings((s) => s.logo);
  const appName = useSettings((s) => s.appName);
  const prayerMethod = useSettings((s) => s.prayerMethod);
  const madhab = useSettings((s) => s.madhab);
  const prayerAdjust = useSettings((s) => s.prayerAdjust);
  const showTasks = useSettings((s) => s.homeShowTasks);
  const showDocs = useSettings((s) => s.homeShowDocs);
  const showQuickAdd = useQuickAdd((s) => s.show);
  const docsCount = useDocs((s) => s.docs.length);
  const knowCount = useKnowledge((s) => s.items.length);
  const placesCount = usePlaces((s) => s.places.length);

  const input = useAgendaInput();
  const agenda = useAgenda(selected);
  const open = useOpenAgendaItem();

  const np = useMemo(
    () => nextPrayer(new Date(), { prayerMethod, madhab, prayerAdjust }),
    // يُعاد الحساب كل دقيقة فقط
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [minuteKey, prayerMethod, madhab, prayerAdjust],
  );

  const nowMin = now.getHours() * 60 + now.getMinutes();

  /** حالة كل عنصر في يوم اليوم: جارٍ / منتهٍ */
  const state = (it: (typeof agenda)[number]) => {
    if (!isToday) return { live: false, past: selected < today };
    const s = toMinutes(it.startTime);
    const e = toMinutes(it.endTime);
    if (it.continuation && !it.endsNextDay) return { live: nowMin < e, past: nowMin >= e };
    if (it.endsNextDay) return { live: it.continuation ? true : nowMin >= s, past: false };
    return { live: nowMin >= s && nowMin < e, past: nowMin >= e };
  };

  const doneCount = agenda.filter((a) => state(a).past || a.status === "done").length;

  /** الجاري الآن، وإلا أول ما لم يبدأ بعد، وإلا أول عنصر في اليوم */
  const focus = agenda.find((a) => state(a).live) ?? agenda.find((a) => !state(a).past) ?? agenda[0];

  // ───── اختصارات الضغط المطوّل ─────
  const showMenu = useShortcutMenu((s) => s.show);
  const doneLog = usePrayerLog((s) => s.done);
  const markDone = usePrayerLog((s) => s.markDone);
  const [tip, setTip] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    AsyncStorage.getItem(TIP_KEY)
      .then((v) => {
        if (v) return;
        setTip(true);
        AsyncStorage.setItem(TIP_KEY, "1").catch(() => undefined);
        t = setTimeout(() => setTip(false), 6000);
      })
      .catch(() => undefined);
    return () => t && clearTimeout(t);
  }, []);

  const quickAddNow = () => {
    Vibration.vibrate(15);
    showQuickAdd();
  };

  /** الصلاة الحالية (التي قبل القادمة) تظهر «صليت» لها إن لم تُسجَّل بعد */
  const prayerMenu = () => {
    let prev: FardKey = "fajr";
    let iso = today;
    if (np.key === "fajr") {
      prev = "isha";
      if (toISO(np.time) === today) iso = addDays(today, -1);
    } else if (np.key !== "sunrise") {
      prev = FARD[FARD.indexOf(np.key) - 1] as FardKey;
    }
    const items = [];
    if (!doneLog[iso]?.[prev]) {
      items.push({ label: `صليت ${PRAYER_NAMES[prev]}`, icon: "checkmark-circle-outline", onPress: () => markDone(iso, prev) });
    }
    items.push(
      {
        label: "أدوات الصلاة",
        icon: "apps-outline",
        onPress: () => {
          usePrayerTools.getState().request();
          router.push("/prayer");
        },
      },
      { label: "التذكيرات والأذكار", icon: "moon-outline", onPress: () => router.push("/reminders-prayer") },
    );
    showMenu("الصلاة", items);
  };

  const docsMenu = () =>
    showMenu("المستندات", [
      {
        label: "إضافة ملف",
        icon: "document-attach-outline",
        onPress: () => {
          useFabRequest.getState().request("documents");
          router.push("/documents");
        },
      },
      { label: "فتح المستندات", icon: "document-text-outline", onPress: () => router.push("/documents") },
    ]);

  const [editing, setEditing] = useState(false);
  const [scrollOn, setScrollOn] = useState(true);
  const layoutItems = useHomeLayout((st) => st.items);

  const hour = now.getHours();
  const greeting = hour < 12 ? "صباح الخير" : hour < 18 ? "مساء الخير" : "مساء النور";

  /** كتل الرئيسية: الترتيب والعرض والإخفاء تتحكم بها useHomeLayout */
  const blocks: Record<BlockId, ReactNode> = {
    prayer: (
      <View style={{ flexDirection: "row" }}>
        <PrayerCard compact next={np} now={now} onPress={() => router.push("/prayer")} onLongPress={prayerMenu} />
      </View>
    ),
    weather: <WeatherTile fill />,
    week: (
        <WeekTimeline
          selected={selected}
          onSelect={setSelected}
          onOpenCalendar={() => router.push("/calendar")}
          onOpenItem={open}
          input={input}
          nowMin={nowMin}
        />
    ),
    day: (
        <View className="bg-surface rounded-[28px] border border-line p-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1">
              <Text w="bold" className="text-xl">
                {relativeDay(selected)}
              </Text>
              <Text className="text-xs text-muted">
                {agenda.length === 0
                  ? "لا شيء مجدول"
                  : isToday || selected < today
                    ? `أُنجز ${doneCount} من ${agenda.length}`
                    : `${agenda.length} ${agenda.length === 1 ? "نشاط" : "أنشطة"} مجدولة`}
              </Text>
            </View>
            <Pressable
              onPress={() => showQuickAdd(selected)}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: BLUE }}
              accessibilityLabel="إضافة"
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </Pressable>
          </View>
          {agenda.length === 0 ? (
            <EmptyState icon="sunny-outline" title="يوم هادئ" hint="اضغط + لإضافة دوام أو موعد أو مهمة" />
          ) : focus ? (
            <TimelineCard
              item={focus}
              live={state(focus).live}
              past={state(focus).past}
              remainingMin={state(focus).live ? remainingMinutes(focus, nowMin) : undefined}
              onPress={() => open(focus)}
            />
          ) : null}
        </View>
    ),
    smart: <SmartCard now={now} />,
    clinic: <ClinicHomeCard />,
    alarms: showTasks ? <UpcomingAlarmsCard now={now} /> : null,
    docs: (
        <Pressable
          onPress={() => router.push("/documents")}
          onLongPress={docsMenu}
          accessibilityLabel="المستندات"
          className="flex-row items-center gap-3 bg-surface border border-line rounded-[24px] p-3"
        >
          <View className="w-14 h-14 rounded-2xl items-center justify-center" style={{ backgroundColor: "#D6EBF7" }}>
            <Image source={NAV_ICONS.docs.on} style={{ width: 44, height: 44 }} resizeMode="contain" />
          </View>
          <View className="flex-1">
            <Text w="bold" className="text-base">
              المستندات
            </Text>
            <Text className="text-xs text-muted">{docsCount > 0 ? `${docsCount} ملف • PDF وWord وExcel وصور` : "PDF وWord وExcel وصور"}</Text>
          </View>
          <Ionicons name="chevron-back" size={20} color="#94A3B8" />
        </Pressable>
    ),
    knowledge: (
        <Pressable onPress={() => router.push("/knowledge")} accessibilityLabel="المعرفة" className="bg-surface border border-line rounded-[24px] p-3">
          <View className="w-11 h-11 rounded-2xl items-center justify-center mb-2" style={{ backgroundColor: "#DBEAFE" }}>
            <Ionicons name="library" size={22} color="#2563EB" />
          </View>
          <Text w="bold">المعرفة</Text>
          <Text className="text-xs text-muted">{knowCount > 0 ? `${knowCount} مادة • بلا إنترنت` : "مكتبة قراءة بلا إنترنت"}</Text>
        </Pressable>
    ),
    places: (
        <Pressable onPress={() => router.push("/places")} accessibilityLabel="أماكني" className="bg-surface border border-line rounded-[24px] p-3">
          <View className="w-11 h-11 rounded-2xl items-center justify-center mb-2" style={{ backgroundColor: "#DCFCE7" }}>
            <Ionicons name="map" size={22} color="#16A34A" />
          </View>
          <Text w="bold">أماكني</Text>
          <Text className="text-xs text-muted">{placesCount > 0 ? `${placesCount} مكان • مسارات GPS` : "مواقع ومسارات GPS"}</Text>
        </Pressable>
    ),
    countdown: <HomeCountdownCard />,
    recent: showDocs ? <RecentDocs /> : null,
  };

  return (
    <Screen
      title={doctorName ? `${greeting} د. ${doctorName}` : greeting}
      subtitle={appName || "Dentist Planner"}
      onTitleLongPress={() => switchUi("planner")}
      logo={
        <Pressable onPress={() => router.push("/settings")} onLongPress={quickAddNow} delayLongPress={350} hitSlop={8} accessibilityLabel="الإعدادات (اضغط مطوّلًا للإضافة السريعة)">
          <Logo uri={logo} size={44} app />
        </Pressable>
      }
      onPull={editing ? undefined : () => router.push("/search")}
      scrollEnabled={scrollOn}
      right={
        <Pressable
          onPress={() => setEditing((v) => !v)}
          hitSlop={8}
          accessibilityLabel={editing ? "إنهاء تخصيص الرئيسية" : "تخصيص الرئيسية"}
          style={{ height: 40, minWidth: 40, borderRadius: 20, paddingHorizontal: editing ? 14 : 0, backgroundColor: editing ? "#6366F1" : "#FFFFFF", borderWidth: 1, borderColor: editing ? "#6366F1" : "#E3E6EB", alignItems: "center", justifyContent: "center" }}
        >
          {editing ? (
            <Text w="bold" style={{ color: "#FFFFFF", fontSize: 13 }}>
              تم
            </Text>
          ) : (
            <Ionicons name="grid-outline" size={20} color="#0F1B3D" />
          )}
        </Pressable>
      }
      overlay={
        <>
          <ShortcutMenuHost />
          {tip ? (
            <Pressable
              onPress={() => setTip(false)}
              style={{ position: "absolute", left: 24, right: 24, bottom: 28, backgroundColor: "#0F1B3D", borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16 }}
            >
              <Text className="text-white text-center text-sm">اضغط مطوّلًا على أي بطاقة أو اللوغو لاختصارات سريعة</Text>
            </Pressable>
          ) : null}
        </>
      }
    >
      {editing ? (
        <HomeEditor onDone={() => setEditing(false)} onLock={(l) => setScrollOn(!l)} />
      ) : (
        /* ضغط مطوّل على أي مساحة غير تفاعلية = الإضافة السريعة */
        <Pressable onLongPress={quickAddNow} delayLongPress={600}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
            {layoutItems.map((it) => {
              const node = blocks[it.id];
              if (it.hidden || !node) return null;
              return (
                <View
                  key={it.id}
                  style={{ width: SPAN_PCT[it.span], marginBottom: 12, ...(it.height > 0 ? { height: it.height, overflow: "hidden" as const } : null) }}
                >
                  {node}
                </View>
              );
            })}
          </View>
        </Pressable>
      )}
    </Screen>
  );
}
