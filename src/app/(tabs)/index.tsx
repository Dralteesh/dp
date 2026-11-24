import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, Vibration, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Logo } from "@/components/Logo";
import { PrayerCard } from "@/components/PrayerCard";
import { ClinicHomeCard } from "@/components/home/ClinicHomeCard";
import { RecentDocs } from "@/components/home/RecentDocs";
import { UpcomingAlarmsCard } from "@/components/home/UpcomingAlarmsCard";
import { WeatherTile } from "@/components/home/WeatherTile";
import { TimelineCard, remainingMinutes } from "@/components/home/TimelineRow";
import { WeekTimeline } from "@/components/home/WeekTimeline";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { ShortcutMenuHost } from "@/components/ui/ShortcutMenu";
import { Text } from "@/components/ui/Text";
import { NAV_ICONS } from "@/constants/icons";
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
    if (it.continuation) return { live: nowMin < e, past: nowMin >= e };
    if (it.endsNextDay) return { live: nowMin >= s, past: false };
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

  const hour = now.getHours();
  const greeting = hour < 12 ? "صباح الخير" : hour < 18 ? "مساء الخير" : "مساء النور";

  return (
    <Screen
      title={doctorName ? `${greeting} د. ${doctorName}` : greeting}
      subtitle={appName || "Dentist Planner"}
      logo={
        <Pressable onPress={() => router.push("/settings")} onLongPress={quickAddNow} delayLongPress={350} hitSlop={8} accessibilityLabel="الإعدادات (اضغط مطوّلًا للإضافة السريعة)">
          <Logo uri={logo} size={44} app />
        </Pressable>
      }
      onPull={() => router.push("/search")}
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
      {/* ضغط مطوّل على أي مساحة غير تفاعلية = الإضافة السريعة */}
      <Pressable onLongPress={quickAddNow} delayLongPress={600}>
      {/* الصلاة + الطقس جنبًا إلى جنب */}
      <View className="flex-row gap-3 mb-4">
        <PrayerCard compact next={np} now={now} onPress={() => router.push("/prayer")} onLongPress={prayerMenu} />
        <WeatherTile />
      </View>

      {/* الأسبوع: جدول زمني بأعمدة */}
      <WeekTimeline
        selected={selected}
        onSelect={setSelected}
        onOpenCalendar={() => router.push("/calendar")}
        onOpenItem={open}
        input={input}
        nowMin={nowMin}
      />

      {/* اليوم المحدّد: العنصر الجاري أو التالي */}
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

      {/* العيادة: أرقام وأدوات */}
      <ClinicHomeCard />

      {/* المنبّهات القادمة */}
      {showTasks ? <UpcomingAlarmsCard now={now} /> : null}

      {/* المستندات: مدخل دائم في الرئيسية (صار تبويب الطقس مكانها في الشريط) */}
      <Pressable
        onPress={() => router.push("/documents")}
        onLongPress={docsMenu}
        accessibilityLabel="المستندات"
        className="flex-row items-center gap-3 bg-surface border border-line rounded-[24px] p-3 mt-4"
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


      {/* المعرفة + أماكني */}
      <View className="flex-row gap-3 mt-3">
        <Pressable onPress={() => router.push("/knowledge")} accessibilityLabel="المعرفة" className="flex-1 bg-surface border border-line rounded-[24px] p-3">
          <View className="w-11 h-11 rounded-2xl items-center justify-center mb-2" style={{ backgroundColor: "#DBEAFE" }}>
            <Ionicons name="library" size={22} color="#2563EB" />
          </View>
          <Text w="bold">المعرفة</Text>
          <Text className="text-xs text-muted">{knowCount > 0 ? `${knowCount} مادة • بلا إنترنت` : "مكتبة قراءة بلا إنترنت"}</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/places")} accessibilityLabel="أماكني" className="flex-1 bg-surface border border-line rounded-[24px] p-3">
          <View className="w-11 h-11 rounded-2xl items-center justify-center mb-2" style={{ backgroundColor: "#DCFCE7" }}>
            <Ionicons name="map" size={22} color="#16A34A" />
          </View>
          <Text w="bold">أماكني</Text>
          <Text className="text-xs text-muted">{placesCount > 0 ? `${placesCount} مكان • مسارات GPS` : "مواقع ومسارات GPS"}</Text>
        </Pressable>
      </View>

      {/* المستندات الأخيرة */}
      {showDocs ? <RecentDocs /> : null}
      </Pressable>
    </Screen>
  );
}
