import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { DAYS_SHORT } from "@/constants/arabic";
import { TYPE_META } from "@/constants/shiftTypes";
import { agendaFor, type AgendaInput, type AgendaItem } from "@/lib/agenda";
import { addDays, fmtTimeDate, fromISO, toMinutes, todayISO } from "@/lib/dates";

const COLS = 3;
const ROW = 52; // ارتفاع الساعة
const PANEL = "#1E2229";

type Props = {
  start: string;
  input: AgendaInput;
  onShift: (days: number) => void;
  onOpen: (item: AgendaItem) => void;
};

/** جدول الأسبوع: لوحة داكنة بشبكة ساعات وكتل ملوّنة (من تصميم Schedule) */
export function WeekSchedule({ start, input, onShift, onOpen }: Props) {
  const today = todayISO();
  const cols = useMemo(
    () =>
      Array.from({ length: COLS }, (_, i) => {
        const iso = addDays(start, i);
        return { iso, items: agendaFor(iso, input) };
      }),
    [start, input],
  );

  // نطاق الساعات المعروض: يتّسع ليشمل الأحداث، وإلا 8..20
  const { from, to } = useMemo(() => {
    let lo = 8 * 60;
    let hi = 20 * 60;
    for (const c of cols)
      for (const it of c.items) {
        const s = toMinutes(it.startTime);
        const e = it.endsNextDay ? 24 * 60 : toMinutes(it.endTime) || 24 * 60;
        lo = Math.min(lo, s);
        hi = Math.max(hi, e);
      }
    return { from: Math.floor(lo / 60), to: Math.min(24, Math.ceil(hi / 60)) };
  }, [cols]);

  const hours = Array.from({ length: to - from }, (_, i) => from + i);
  const height = hours.length * ROW;

  const top = (min: number) => ((min - from * 60) / 60) * ROW;

  return (
    <View className="rounded-[28px] p-4" style={{ backgroundColor: PANEL }}>
      <View className="flex-row items-center justify-between mb-3">
        <Text w="bold" style={{ fontSize: 26, color: "#FFFFFF" }}>
          الجدول
        </Text>
        <View className="flex-row gap-2">
          <Pressable onPress={() => onShift(-COLS)} hitSlop={8} className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: "#2B313B" }}>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </Pressable>
          <Pressable onPress={() => onShift(COLS)} hitSlop={8} className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: "#2B313B" }}>
            <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* رؤوس الأيام */}
      <View className="flex-row" style={{ paddingStart: 40 }}>
        {cols.map((c) => {
          const d = fromISO(c.iso);
          const isToday = c.iso === today;
          return (
            <View key={c.iso} className="flex-1 items-center pb-2">
              <Text className="text-xs" style={{ color: "#9AA3AF" }}>
                {DAYS_SHORT[d.getDay()]}
              </Text>
              <View
                className="rounded-full items-center justify-center"
                style={{ width: 30, height: 30, backgroundColor: isToday ? "#F59E0B" : "transparent" }}
              >
                <Text w="bold" style={{ color: isToday ? "#1E2229" : "#FFFFFF", fontVariant: ["tabular-nums"] }}>
                  {d.getDate()}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* الشبكة */}
      <View className="flex-row" style={{ height }}>
        <View style={{ width: 40 }}>
          {hours.map((h) => (
            <View key={h} style={{ height: ROW }}>
              <Text className="text-[10px]" style={{ color: "#6B7380", fontVariant: ["tabular-nums"] }}>
                {fmtTimeDate(new Date(2000, 0, 1, h, 0))}
              </Text>
            </View>
          ))}
        </View>

        <View className="flex-1 flex-row" style={{ position: "relative" }}>
          {hours.map((h, i) => (
            <View
              key={h}
              pointerEvents="none"
              style={{ position: "absolute", start: 0, end: 0, top: i * ROW, height: 1, backgroundColor: "#2F3640" }}
            />
          ))}

          {cols.map((c) => (
            <View key={c.iso} className="flex-1" style={{ position: "relative", borderStartWidth: 1, borderStartColor: "#2F3640" }}>
              {c.items.map((it) => {
                const m = TYPE_META[it.type];
                const s = toMinutes(it.startTime);
                const e = it.endsNextDay ? 24 * 60 : toMinutes(it.endTime) || 24 * 60;
                const t = top(s);
                const h = Math.max(30, ((e - s) / 60) * ROW - 2);
                return (
                  <Pressable
                    key={it.key}
                    onPress={() => onOpen(it)}
                    style={{
                      position: "absolute",
                      top: t,
                      height: h,
                      start: 3,
                      end: 3,
                      borderRadius: 12,
                      backgroundColor: m.hex,
                      padding: 6,
                      overflow: "hidden",
                    }}
                  >
                    <Text w="bold" className="text-[11px]" style={{ color: m.onSolid }} numberOfLines={3}>
                      {it.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
