import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { DAYS_SHORT, MONTHS } from "@/constants/arabic";
import { TYPE_META } from "@/constants/shiftTypes";
import { addDays, fromISO, todayISO, weekdayOf } from "@/lib/dates";
import type { ShiftType } from "@/types";

const BLUE = "#0E6FA5";

type Props = {
  selected: string;
  onSelect: (iso: string) => void;
  /** الضغط على اليوم المحدّد (أو زر التقويم) يفتح التقويم */
  onOpenCalendar: () => void;
  dotsFor: (iso: string) => ShiftType[];
};

/** شريط أسبوع بأيام على شكل صفحات تقويم (السبت أول الأسبوع) — مستوحى من تصميم Timeline */
export function WeekStrip({ selected, onSelect, onOpenCalendar, dotsFor }: Props) {
  const back = (weekdayOf(selected) + 1) % 7;
  const start = addDays(selected, -back);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = todayISO();
  const d = fromISO(selected);

  return (
    <View className="mb-3">
      <View className="flex-row items-center justify-between mb-2.5">
        <Pressable
          hitSlop={10}
          onPress={() => onSelect(addDays(selected, -7))}
          className="w-9 h-9 rounded-full bg-surface border border-line items-center justify-center"
        >
          <Ionicons name="chevron-forward" size={18} color="#0F172A" />
        </Pressable>
        <Pressable onPress={onOpenCalendar} className="flex-row items-center gap-1.5" hitSlop={8}>
          <Text w="bold" className="text-base">
            {MONTHS[d.getMonth()]} {d.getFullYear()}
          </Text>
          <Ionicons name="calendar-outline" size={17} color={BLUE} />
        </Pressable>
        <Pressable
          hitSlop={10}
          onPress={() => onSelect(addDays(selected, 7))}
          className="w-9 h-9 rounded-full bg-surface border border-line items-center justify-center"
        >
          <Ionicons name="chevron-back" size={18} color="#0F172A" />
        </Pressable>
      </View>

      <View className="flex-row gap-1.5">
        {days.map((iso) => {
          const wd = weekdayOf(iso);
          const isSel = iso === selected;
          const isToday = iso === today;
          const weekend = wd === 5 || wd === 6; // الجمعة والسبت
          const dots = dotsFor(iso).slice(0, 3);
          const head = isSel ? BLUE : weekend ? "#F3C9C0" : "#DCEEF8";
          const headText = isSel ? "#FFFFFF" : weekend ? "#B03A26" : BLUE;
          return (
            <Pressable
              key={iso}
              onPress={() => (isSel ? onOpenCalendar() : onSelect(iso))}
              style={{ flex: 1 }}
            >
              <View
                style={{
                  borderRadius: 16,
                  overflow: "hidden",
                  backgroundColor: isSel ? "#E4F1F9" : "#FFFFFF",
                  borderWidth: isSel ? 1.5 : 1,
                  borderColor: isSel ? BLUE : "#9CC3DA",
                  elevation: isSel ? 3 : 0,
                }}
              >
                <View style={{ backgroundColor: head, paddingVertical: 3, alignItems: "center" }}>
                  <Text w="bold" style={{ fontSize: 10, lineHeight: 15, color: headText }} numberOfLines={1}>
                    {DAYS_SHORT[wd]}
                  </Text>
                </View>
                <View style={{ alignItems: "center", paddingTop: 4, paddingBottom: 5, minHeight: 50 }}>
                  <Text
                    w="bold"
                    style={{ fontSize: 19, lineHeight: 26, color: isSel ? BLUE : "#0F172A", fontVariant: ["tabular-nums"] }}
                  >
                    {fromISO(iso).getDate()}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 3, height: 6, marginTop: 1 }}>
                    {dots.map((t) => (
                      <View key={t} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: TYPE_META[t].hex }} />
                    ))}
                    {dots.length === 0 && isToday ? (
                      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: BLUE, opacity: 0.4 }} />
                    ) : null}
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
