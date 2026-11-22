import { useMemo, useState } from "react";
import { Image, Pressable, View } from "react-native";
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
import { Text } from "@/components/ui/Text";
import { NAV_ICONS } from "@/constants/icons";
import { useDocs } from "@/store/useDocs";
import { useAgenda, useAgendaInput } from "@/hooks/useAgenda";
import { useNow } from "@/hooks/useNow";
import { useOpenAgendaItem } from "@/hooks/useOpenAgendaItem";
import { useTheme } from "@/hooks/useTheme";
import { relativeDay, toISO, toMinutes } from "@/lib/dates";
import { nextPrayer } from "@/lib/prayer";
import { useQuickAdd } from "@/store/useQuickAdd";
import { useSettings } from "@/store/useSettings";

const BLUE = "#0E6FA5";

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

  const hour = now.getHours();
  const greeting = hour < 12 ? "صباح الخير" : hour < 18 ? "مساء الخير" : "مساء النور";

  return (
    <Screen
      title={doctorName ? `${greeting} د. ${doctorName}` : greeting}
      subtitle={appName || "Dentist Planner"}
      logo={
        <Pressable onPress={() => router.push("/settings")} hitSlop={8}>
          <Logo uri={logo} size={44} app />
        </Pressable>
      }
      right={
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => router.push("/search")}
            className="w-10 h-10 rounded-full bg-surface border border-line items-center justify-center"
            accessibilityLabel="بحث"
          >
            <Ionicons name="search-outline" size={20} color="#0F172A" />
          </Pressable>
          <Pressable
            onPress={() => router.push("/settings")}
            className="w-10 h-10 rounded-full bg-surface border border-line items-center justify-center"
            accessibilityLabel="الإعدادات"
          >
            <Ionicons name="settings-outline" size={20} color="#0F172A" />
          </Pressable>
        </View>
      }
    >
      {/* الصلاة + الطقس جنبًا إلى جنب */}
      <View className="flex-row gap-3 mb-4">
        <PrayerCard compact next={np} now={now} onPress={() => router.push("/prayer")} />
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

      {/* المستندات الأخيرة */}
      {showDocs ? <RecentDocs /> : null}
    </Screen>
  );
}
