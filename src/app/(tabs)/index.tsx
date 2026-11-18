import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Logo } from "@/components/Logo";
import { PrayerCard } from "@/components/PrayerCard";
import { TaskItem } from "@/components/TaskItem";
import { TimelineCard, remainingMinutes } from "@/components/home/TimelineRow";
import { WeekStrip } from "@/components/home/WeekStrip";
import { EmptyState, SectionHeader } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useAgenda, useAgendaInput } from "@/hooks/useAgenda";
import { useNow } from "@/hooks/useNow";
import { useOpenAgendaItem } from "@/hooks/useOpenAgendaItem";
import { useTheme } from "@/hooks/useTheme";
import { typesOn } from "@/lib/agenda";
import { relativeDay, toISO, toMinutes } from "@/lib/dates";
import { nextPrayer } from "@/lib/prayer";
import { usePlanner } from "@/store/usePlanner";
import { useQuickAdd } from "@/store/useQuickAdd";
import { useSettings } from "@/store/useSettings";
import type { Task } from "@/types";

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
  const showQuickAdd = useQuickAdd((s) => s.show);

  const input = useAgendaInput();
  const agenda = useAgenda(selected);
  const open = useOpenAgendaItem();
  const tasks = usePlanner((s) => s.tasks);
  const toggleTask = usePlanner((s) => s.toggleTask);

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

  const todayTasks: Task[] = useMemo(
    () =>
      tasks
        .filter((t) => !t.done && (!t.dueDate || t.dueDate <= today))
        .sort((a, b) => (a.priority === "high" ? -1 : 0) - (b.priority === "high" ? -1 : 0))
        .slice(0, 3),
    [tasks, today],
  );

  const hour = now.getHours();
  const greeting = hour < 12 ? "صباح الخير" : hour < 18 ? "مساء الخير" : "مساء النور";

  // مكان شارة «الآن»: قبل أول عنصر لم يبدأ بعد، إن لم يكن هناك عنصر جارٍ
  const firstUpcoming = isToday
    ? agenda.findIndex((a) => !state(a).past && !state(a).live && !a.continuation)
    : -1;
  const hasLive = agenda.some((a) => state(a).live);

  const NowPill = (
    <View key="now" className="flex-row items-center mb-2" style={{ gap: 10 }}>
      <View className="rounded-full px-3 py-1" style={{ backgroundColor: "#22C55E" }}>
        <Text w="bold" className="text-xs" style={{ color: "#FFFFFF" }}>
          الآن
        </Text>
      </View>
      <View style={{ flex: 1, height: 2, backgroundColor: "#22C55E", opacity: 0.35 }} />
    </View>
  );

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
        <Pressable
          onPress={() => router.push("/settings")}
          className="w-10 h-10 rounded-full bg-surface border border-line items-center justify-center"
        >
          <Ionicons name="settings-outline" size={20} color="#0F172A" />
        </Pressable>
      }
    >
      {/* بطاقة الصلاة في الأعلى */}
      <PrayerCard next={np} now={now} onPress={() => router.push("/prayer")} />

      {/* الأسبوع */}
      <WeekStrip
        selected={selected}
        onSelect={setSelected}
        onOpenCalendar={() => router.push("/calendar")}
        dotsFor={(iso) => typesOn(iso, input)}
      />

      {/* جدول اليوم المحدّد */}
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
        ) : (
          agenda.map((it, i) => {
            const st = state(it);
            const rail = st.past || st.live ? "#22C55E" : "#CFCBBF";
            return (
              <View key={it.key}>
                {isToday && !hasLive && i === firstUpcoming ? NowPill : null}
                <View className="flex-row items-stretch mb-2.5" style={{ gap: 10 }}>
                  <View style={{ width: 52, alignItems: "center" }}>
                    <Text w="bold" className="text-xs" style={{ fontVariant: ["tabular-nums"] }}>
                      {it.startTime}
                    </Text>
                    <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: rail, marginTop: 5 }} />
                    {i < agenda.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: rail, opacity: 0.45, marginTop: 2 }} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <TimelineCard
                      item={it}
                      live={st.live}
                      past={st.past}
                      remainingMin={st.live ? remainingMinutes(it, nowMin) : undefined}
                      onPress={() => open(it)}
                    />
                  </View>
                </View>
              </View>
            );
          })
        )}
        {isToday && !hasLive && agenda.length > 0 && firstUpcoming === -1 ? NowPill : null}
      </View>

      {/* المهام */}
      {showTasks ? (
        <>
          <SectionHeader title="مهام اليوم" action="كل المهام" onAction={() => router.push("/tasks")} />
          {todayTasks.length === 0 ? (
            <Card>
              <EmptyState icon="checkmark-done-outline" title="لا مهام معلّقة" hint="اضغط + ثم «مهمة» لإضافة واحدة" />
            </Card>
          ) : (
            todayTasks.map((t) => (
              <TaskItem key={t.id} task={t} onToggle={() => toggleTask(t.id)} onPress={() => router.push("/tasks")} />
            ))
          )}
        </>
      ) : null}
    </Screen>
  );
}
