import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { AddEventSheet } from "@/components/AddEventSheet";
import { AgendaRow } from "@/components/AgendaRow";
import { DayCards } from "@/components/calendar/DayCards";
import { WeekSchedule } from "@/components/calendar/WeekSchedule";
import { TasksPanel } from "@/components/tasks/TasksPanel";
import { Segmented } from "@/components/ui/Chip";
import { MonthGrid } from "@/components/MonthGrid";
import { Card } from "@/components/ui/Card";
import { EmptyState, SectionHeader } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { useActiveTypes } from "@/hooks/useActiveTypes";
import { useAgenda, useAgendaInput } from "@/hooks/useAgenda";
import { useOpenAgendaItem } from "@/hooks/useOpenAgendaItem";
import { typesOn } from "@/lib/agenda";
import { addDays, fmtDateLong, monthCells, todayISO } from "@/lib/dates";
import type { ShiftType } from "@/types";
import { useTheme } from "@/hooks/useTheme";
import { useOnFabRequest } from "@/store/useFabRequest";
import { usePlanner } from "@/store/usePlanner";

export default function CalendarScreen() {
  useTheme();
  const types = useActiveTypes();
  const input = useAgendaInput();
  const open = useOpenAgendaItem();

  const [ym, setYm] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState(todayISO());
  const [addOpen, setAddOpen] = useState(false);
  const [addDate, setAddDate] = useState<string | null>(null);
  const [mode, setMode] = useState<"month" | "days" | "week">("month");
  const [weekStart, setWeekStart] = useState(todayISO());

  // أقسام: التقويم • المهام • الملاحظات (المهام والملاحظات انتقلت إلى هنا)
  type Section = "calendar" | "tasks" | "notes";
  const params = useLocalSearchParams<{ section?: string; t?: string }>();
  const [section, setSection] = useState<Section>("calendar");
  const [addSignal, setAddSignal] = useState(0);
  useEffect(() => {
    if (params.section === "calendar" || params.section === "tasks" || params.section === "notes") setSection(params.section);
  }, [params.section, params.t]);
  const openCount = usePlanner((s) => s.tasks.filter((t) => !t.done).length);
  const notesCount = usePlanner((s) => s.notes.length);
  const addHere = () => (section === "calendar" ? setAddOpen(true) : setAddSignal((n) => n + 1));
  // الضغط المطوّل على الزر العائم = إضافة (حدث أو مهمة أو ملاحظة حسب القسم)
  useOnFabRequest("calendar", addHere);

  const dayAgenda = useAgenda(selected);

  // أنواع كل يوم في الشهر المعروض (للنقاط + العدّادات)
  const dotsMap = useMemo(() => {
    const map: Record<string, ShiftType[]> = {};
    for (const c of monthCells(ym.y, ym.m)) {
      if (c.inMonth) map[c.iso] = typesOn(c.iso, input);
    }
    return map;
  }, [ym, input]);

  const counts = useMemo(() => {
    const c = {} as Record<ShiftType, number>;
    Object.values(dotsMap).forEach((ts) => ts.forEach((t) => (c[t] = (c[t] ?? 0) + 1)));
    return c;
  }, [dotsMap]);

  const goToday = () => {
    const d = new Date();
    setYm({ y: d.getFullYear(), m: d.getMonth() });
    setSelected(todayISO());
    setWeekStart(todayISO());
  };

  return (
    <Screen
      title="التقويم"
      back
      subtitle={section === "tasks" ? `${openCount} مهمة مفتوحة` : section === "notes" ? `${notesCount} ملاحظة` : undefined}
      right={
        section === "calendar" ? (
          <Text w="semi" className="text-hospital" onPress={goToday}>
            اليوم
          </Text>
        ) : undefined
      }
      overlay={<Fab onPress={addHere} />}
    >
      <Segmented
        value={section}
        onChange={setSection}
        options={[
          { value: "calendar", label: "التقويم" },
          { value: "tasks", label: "المهام" },
          { value: "notes", label: "الملاحظات" },
        ]}
      />
      <View className="h-4" />

      {section !== "calendar" ? (
        <TasksPanel mode={section} addSignal={addSignal} />
      ) : (
        <>
      <Segmented
        value={mode}
        onChange={(m) => {
          setMode(m);
          if (m !== "month") setWeekStart(selected);
        }}
        options={[
          { value: "month", label: "الشهر" },
          { value: "days", label: "أيام" },
          { value: "week", label: "أسبوع" },
        ]}
      />
      <View className="h-4" />

      {mode === "days" ? (
        <>
          <View className="flex-row items-center justify-between mb-3">
            <Text w="semi" className="text-muted" onPress={() => setWeekStart(addDays(weekStart, -10))}>
              ‹ السابقة
            </Text>
            <Text w="semi" className="text-muted" onPress={() => setWeekStart(addDays(weekStart, 10))}>
              التالية ›
            </Text>
          </View>
          <DayCards start={weekStart} input={input} onOpen={open} onAdd={(iso) => setAddDate(iso)} />
        </>
      ) : mode === "week" ? (
        <WeekSchedule
          start={weekStart}
          input={input}
          onShift={(d) => setWeekStart(addDays(weekStart, d))}
          onOpen={open}
        />
      ) : (
        <>
      <MonthGrid
        year={ym.y}
        month={ym.m}
        selected={selected}
        onSelect={(iso) => {
          setSelected(iso);
          // الضغط على يوم من شهر مجاور ينقل العرض إليه
          const y = Number(iso.slice(0, 4));
          const m = Number(iso.slice(5, 7)) - 1;
          if (y !== ym.y || m !== ym.m) setYm({ y, m });
        }}
        onMonthChange={(y, m) => setYm({ y, m })}
        dotsFor={(iso) => dotsMap[iso] ?? []}
      />

      {/* عدّاد الأيام لكل نوع في هذا الشهر */}
      <View className="flex-row flex-wrap gap-2 mt-3">
        {types.map((t) => {
          const m = TYPE_META[t];
          return (
            <View
              key={t}
              className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{ backgroundColor: m.soft }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: m.hex }} />
              <Text w="semi" className="text-xs" style={{ color: m.inkHex }}>
                {m.short} · {counts[t] ?? 0} يوم
              </Text>
            </View>
          );
        })}
      </View>

      <SectionHeader title={fmtDateLong(selected)} />
      {dayAgenda.length === 0 ? (
        <Card>
          <EmptyState icon="calendar-clear-outline" title="يوم فارغ" hint="اضغط + لإضافة دوام أو مناوبة أو نشاط" />
        </Card>
      ) : (
        dayAgenda.map((it) => <AgendaRow key={it.key} item={it} onPress={() => open(it)} />)
      )}

        </>
      )}
        </>
      )}

      <AddEventSheet
        visible={addOpen || !!addDate}
        date={addDate ?? selected}
        onClose={() => {
          setAddOpen(false);
          setAddDate(null);
        }}
      />
    </Screen>
  );
}
