import { useMemo, useState } from "react";
import { View } from "react-native";
import { AddEventSheet } from "@/components/AddEventSheet";
import { AgendaRow } from "@/components/AgendaRow";
import { MonthGrid } from "@/components/MonthGrid";
import { Card } from "@/components/ui/Card";
import { EmptyState, SectionHeader } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { SHIFT_TYPES, TYPE_META } from "@/constants/shiftTypes";
import { useAgenda, useAgendaInput } from "@/hooks/useAgenda";
import { useOpenAgendaItem } from "@/hooks/useOpenAgendaItem";
import { typesOn } from "@/lib/agenda";
import { fmtDateLong, monthCells, todayISO } from "@/lib/dates";
import type { ShiftType } from "@/types";
import { useTheme } from "@/hooks/useTheme";

export default function CalendarScreen() {
  useTheme();
  const input = useAgendaInput();
  const open = useOpenAgendaItem();

  const [ym, setYm] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState(todayISO());
  const [addOpen, setAddOpen] = useState(false);

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
    const c: Record<ShiftType, number> = { hospital: 0, maxillo: 0, private: 0, personal: 0 };
    Object.values(dotsMap).forEach((types) => types.forEach((t) => (c[t] += 1)));
    return c;
  }, [dotsMap]);

  const goToday = () => {
    const d = new Date();
    setYm({ y: d.getFullYear(), m: d.getMonth() });
    setSelected(todayISO());
  };

  return (
    <Screen
      title="التقويم"
      right={
        <Text w="semi" className="text-hospital" onPress={goToday}>
          اليوم
        </Text>
      }
      overlay={<Fab onPress={() => setAddOpen(true)} />}
    >
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
        {SHIFT_TYPES.map((t) => {
          const m = TYPE_META[t];
          return (
            <View
              key={t}
              className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{ backgroundColor: m.soft }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: m.hex }} />
              <Text w="semi" className="text-xs" style={{ color: m.inkHex }}>
                {m.short} · {counts[t]} يوم
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

      <AddEventSheet visible={addOpen} date={selected} onClose={() => setAddOpen(false)} />
    </Screen>
  );
}
