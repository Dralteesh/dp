import { useMemo, useRef } from "react";
import { PanResponder, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { DAYS_SHORT, MONTHS, WEEK_ORDER } from "@/constants/arabic";
import { TYPE_META } from "@/constants/shiftTypes";
import { monthCells, todayISO } from "@/lib/dates";
import type { ShiftType } from "@/types";

type Props = {
  year: number;
  month: number; // 0..11
  selected: string;
  onSelect: (iso: string) => void;
  onMonthChange: (year: number, month: number) => void;
  dotsFor: (iso: string) => ShiftType[];
};

/**
 * تقويم شهري تفاعلي بتصميم مخصّص:
 * - الأسبوع يبدأ بالسبت (كما في سوريا)
 * - نقاط ملوّنة بألوان الأنواع الأربعة
 * - السحب يمينًا/يسارًا لتبديل الشهر
 */
export function MonthGrid({ year, month, selected, onSelect, onMonthChange, dotsFor }: Props) {
  const today = todayISO();
  const cells = useMemo(() => monthCells(year, month), [year, month]);
  const weeks = useMemo(() => Array.from({ length: 6 }, (_, i) => cells.slice(i * 7, i * 7 + 7)), [cells]);

  const go = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    onMonthChange(d.getFullYear(), d.getMonth());
  };

  // نحتفظ بآخر قيم داخل ref ليستخدمها PanResponder دون إعادة إنشائه
  const goRef = useRef(go);
  goRef.current = go;

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderRelease: (_, g) => {
        // في RTL: السحب نحو اليمين = الشهر السابق
        if (g.dx > 50) goRef.current(-1);
        else if (g.dx < -50) goRef.current(1);
      },
    }),
  ).current;

  return (
    <View className="bg-surface rounded-3xl border border-line p-3" {...pan.panHandlers}>
      <View className="flex-row items-center justify-between mb-2 px-1">
        <Pressable
          onPress={() => go(-1)}
          hitSlop={10}
          className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
        >
          <Ionicons name="chevron-forward" size={18} color="#0F172A" />
        </Pressable>
        <Text w="bold" className="text-lg">
          {MONTHS[month]} {year}
        </Text>
        <Pressable
          onPress={() => go(1)}
          hitSlop={10}
          className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={18} color="#0F172A" />
        </Pressable>
      </View>

      <View className="flex-row mb-1">
        {WEEK_ORDER.map((d) => (
          <View key={d} style={{ width: "14.2857%" }} className="items-center py-1">
            <Text
              w="semi"
              className="text-xs"
              style={{ color: d === 5 ? "#DC2626" : "#64748B" }}
            >
              {DAYS_SHORT[d]}
            </Text>
          </View>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} className="flex-row">
          {week.map((c) => {
            const isSel = c.iso === selected;
            const isToday = c.iso === today;
            const dots = c.inMonth ? dotsFor(c.iso) : [];
            const day = Number(c.iso.slice(8));
            return (
              <Pressable
                key={c.iso}
                onPress={() => onSelect(c.iso)}
                style={{ width: "14.2857%", height: 54 }}
                className="items-center justify-center"
              >
                <View
                  className="w-9 h-9 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: isSel ? "#0F172A" : isToday ? "#E2E8F0" : "transparent",
                  }}
                >
                  <Text
                    w={isSel || isToday ? "bold" : "regular"}
                    style={{ color: isSel ? "#FFFFFF" : c.inMonth ? "#0F172A" : "#CBD5E1" }}
                  >
                    {day}
                  </Text>
                </View>
                <View className="flex-row gap-0.5 mt-0.5" style={{ height: 6 }}>
                  {dots.slice(0, 4).map((t) => (
                    <View
                      key={t}
                      style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: TYPE_META[t].hex }}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
