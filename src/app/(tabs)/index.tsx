import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
import { fmtCountdown, fmtDateFull, fmtTimeDate, toISO, toMinutes } from "@/lib/dates";
import { PRAYER_LABELS, nextPrayer } from "@/lib/prayer";
import { usePlanner } from "@/store/usePlanner";
import { useSettings } from "@/store/useSettings";
import type { Task } from "@/types";

export default function HomeScreen() {
  const router = useRouter();
  const now = useNow(1000);
  const today = toISO(now);
  const minuteKey = Math.floor(now.getTime() / 60000);

  const doctorName = useSettings((s) => s.doctorName);
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

  const hour = now.getHours();
  const greeting = hour < 12 ? "صباح الخير" : hour < 18 ? "مساء الخير" : "مساء النور";

  return (
    <Screen
      title={doctorName ? `${greeting} د. ${doctorName}` : greeting}
      subtitle={fmtDateFull(today)}
      right={
        <Pressable
          onPress={() => router.push("/settings")}
          className="w-10 h-10 rounded-full bg-surface border border-line items-center justify-center"
        >
          <Ionicons name="settings-outline" size={20} color="#0F172A" />
        </Pressable>
      }
    >
      {/* الصلاة القادمة */}
      <PressableScale
        onPress={() => router.push("/prayer")}
        className="rounded-3xl p-4 mb-4"
        style={{ backgroundColor: "#14532D" }}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-green-200 text-xs">الصلاة القادمة • حماه</Text>
            <Text w="bold" className="text-white text-3xl leading-10">
              {PRAYER_LABELS[np.key]}
            </Text>
            <Text className="text-green-100">{fmtTimeDate(np.time)}</Text>
          </View>
          <View className="items-end">
            <Text className="text-green-200 text-xs">المتبقي</Text>
            <Text w="bold" className="text-white text-2xl" style={{ fontVariant: ["tabular-nums"] }}>
              {fmtCountdown(remaining)}
            </Text>
          </View>
        </View>
        <View className="h-1.5 rounded-full bg-green-900 mt-3 overflow-hidden">
          <View style={{ width: `${progress * 100}%`, height: 6, backgroundColor: "#4ADE80" }} />
        </View>
      </PressableScale>

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
