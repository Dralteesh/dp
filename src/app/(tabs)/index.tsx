import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DateHero } from "@/components/home/DateHero";
import { NextUpCard } from "@/components/home/NextUpCard";
import { RiverCard } from "@/components/home/RiverCard";
import { Logo } from "@/components/Logo";
import { PrayerCard } from "@/components/PrayerCard";
import { AgendaRow } from "@/components/AgendaRow";
import { TaskItem } from "@/components/TaskItem";
import { Card } from "@/components/ui/Card";
import { EmptyState, SectionHeader } from "@/components/ui/EmptyState";
import { PressableScale } from "@/components/ui/PressableScale";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { SHIFT_TYPES, TYPE_META } from "@/constants/shiftTypes";
import { useAgenda } from "@/hooks/useAgenda";
import { useNow } from "@/hooks/useNow";
import { useOpenAgendaItem } from "@/hooks/useOpenAgendaItem";
import { fmtDateFull, toISO, toMinutes } from "@/lib/dates";
import { nextPrayer } from "@/lib/prayer";
import { usePlanner } from "@/store/usePlanner";
import { useSettings } from "@/store/useSettings";
import type { Task } from "@/types";
import { useTheme } from "@/hooks/useTheme";

export default function HomeScreen() {
  useTheme();
  const router = useRouter();
  const now = useNow(1000);
  const today = toISO(now);
  const minuteKey = Math.floor(now.getTime() / 60000);

  const doctorName = useSettings((s) => s.doctorName);
  const logo = useSettings((s) => s.logo);
  const appName = useSettings((s) => s.appName);
  const prayerMethod = useSettings((s) => s.prayerMethod);
  const madhab = useSettings((s) => s.madhab);
  const prayerAdjust = useSettings((s) => s.prayerAdjust);

  const agenda = useAgenda(today);
  const open = useOpenAgendaItem();
  const tasks = usePlanner((s) => s.tasks);
  const toggleTask = usePlanner((s) => s.toggleTask);

  const np = useMemo(
    () => nextPrayer(new Date(), { prayerMethod, madhab, prayerAdjust }),
    // يُعاد الحساب كل دقيقة فقط
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [minuteKey, prayerMethod, madhab, prayerAdjust],
  );
  const remaining = np.time.getTime() - now.getTime();
  const span = np.time.getTime() - np.previous.getTime();
  const progress = Math.min(1, Math.max(0, 1 - remaining / span));

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const isLive = (startTime: string, endTime: string, endsNextDay: boolean, continuation?: boolean) => {
    const s = toMinutes(startTime);
    const e = toMinutes(endTime);
    if (continuation) return nowMin < e;
    if (endsNextDay) return nowMin >= s;
    return nowMin >= s && nowMin < e;
  };

  const todayTasks: Task[] = useMemo(
    () =>
      tasks
        .filter((t) => !t.done && (!t.dueDate || t.dueDate <= today))
        .sort((a, b) => (a.priority === "high" ? -1 : 0) - (b.priority === "high" ? -1 : 0))
        .slice(0, 4),
    [tasks, today],
  );

  // رحلة اليوم: أحداث انتهت + مهام أُنجزت اليوم، من إجمالي أحداث اليوم ومهامه
  const journey = useMemo(() => {
    const evs = agenda.filter((a) => !a.continuation);
    const evDone = evs.filter((a) => {
      const e = toMinutes(a.endTime);
      return !a.endsNextDay && nowMin >= (e || 24 * 60);
    }).length;
    const due = tasks.filter((t) => (t.done ? toISO(new Date(t.doneAt ?? 0)) === today : !t.dueDate || t.dueDate <= today));
    const tDone = due.filter((t) => t.done).length;
    const total = evs.length + due.length;
    const done = evDone + tDone;
    return { total, done, progress: total ? done / total : 0 };
  }, [agenda, tasks, today, nowMin]);

  // الحدث الجاري أو أقرب حدث قادم
  const nextUp = useMemo(() => {
    const live = agenda.find((a) => isLive(a.startTime, a.endTime, a.endsNextDay, a.continuation));
    if (live) return { item: live, live: true };
    const upcoming = agenda.find((a) => !a.continuation && toMinutes(a.startTime) > nowMin);
    return upcoming ? { item: upcoming, live: false } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agenda, nowMin]);

  const hour = now.getHours();
  const greeting = hour < 12 ? "صباح الخير" : hour < 18 ? "مساء الخير" : "مساء النور";

  return (
    <Screen
      title={doctorName ? `${greeting} د. ${doctorName}` : greeting}
      subtitle={appName || "Dentist Planner"}
      right={
        <Pressable
          onPress={() => router.push("/settings")}
          className="w-10 h-10 rounded-full bg-surface border border-line items-center justify-center"
        >
          <Ionicons name="settings-outline" size={20} color="#0F172A" />
        </Pressable>
      }
      logo={<Logo uri={logo} size={44} app />}
    >
      <DateHero now={now} next={np} />

      {nextUp ? <NextUpCard item={nextUp.item} live={nextUp.live} onPress={() => open(nextUp.item)} /> : null}

      <RiverCard progress={journey.progress} total={journey.total} done={journey.done} />

      {/* الصلاة القادمة */}
      <PrayerCard next={np} now={now} onPress={() => router.push("/prayer")} />

      {/* إضافة سريعة */}
      <Text w="bold" className="text-lg mb-2">
        إضافة سريعة
      </Text>
      <View className="flex-row flex-wrap gap-2.5">
        {SHIFT_TYPES.map((t) => {
          const m = TYPE_META[t];
          return (
            <PressableScale
              key={t}
              containerClassName="w-[48.5%]"
              className="rounded-2xl px-3 py-3 flex-row items-center gap-2.5"
              style={{ backgroundColor: m.soft }}
              onPress={() =>
                router.push({ pathname: "/event/[id]", params: { id: "new", type: t, date: today } })
              }
            >
              <View
                className="w-9 h-9 rounded-xl items-center justify-center"
                style={{ backgroundColor: m.hex }}
              >
                <Ionicons name={m.icon} size={18} color={m.onSolid} />
              </View>
              <Text w="semi" className="flex-1 text-sm" style={{ color: m.inkHex }} numberOfLines={2}>
                {m.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      {/* جدول اليوم */}
      <SectionHeader title="جدول اليوم" action="التقويم" onAction={() => router.push("/calendar")} />
      {agenda.length === 0 ? (
        <Card>
          <EmptyState icon="sunny-outline" title="لا شيء مجدول اليوم" hint="أضف دوامًا أو موعدًا من الأزرار أعلاه" />
        </Card>
      ) : (
        agenda.map((it) => (
          <AgendaRow
            key={it.key}
            item={it}
            live={isLive(it.startTime, it.endTime, it.endsNextDay, it.continuation)}
            onPress={() => open(it)}
          />
        ))
      )}

      {/* المهام */}
      <SectionHeader title="مهام اليوم" action="كل المهام" onAction={() => router.push("/tasks")} />
      {todayTasks.length === 0 ? (
        <Card>
          <EmptyState icon="checkmark-done-outline" title="لا مهام معلّقة" hint="رائع! أو أضف مهمة جديدة من تبويب المهام" />
        </Card>
      ) : (
        todayTasks.map((t) => (
          <TaskItem key={t.id} task={t} onToggle={() => toggleTask(t.id)} onPress={() => router.push("/tasks")} />
        ))
      )}
    </Screen>
  );
}
