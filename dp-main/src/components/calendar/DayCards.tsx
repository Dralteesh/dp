import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { DAYS, MONTHS } from "@/constants/arabic";
import { TYPE_META } from "@/constants/shiftTypes";
import { agendaFor, type AgendaInput, type AgendaItem } from "@/lib/agenda";
import { addDays, fmtTime, fromISO, todayISO } from "@/lib/dates";

type Props = {
  start: string;
  days?: number;
  input: AgendaInput;
  onOpen: (item: AgendaItem) => void;
  onAdd: (iso: string) => void;
};

/** بطاقات أيام ملوّنة برقم كبير وأحداثها كأقراص (من تصميم Calendar) */
export function DayCards({ start, days = 10, input, onOpen, onAdd }: Props) {
  const today = todayISO();
  const list = useMemo(
    () =>
      Array.from({ length: days }, (_, i) => {
        const iso = addDays(start, i);
        return { iso, items: agendaFor(iso, input) };
      }),
    [start, days, input],
  );

  return (
    <View className="gap-3">
      {list.map(({ iso, items }) => {
        const d = fromISO(iso);
        const lead = items[0] ? TYPE_META[items[0].type] : null;
        const bg = lead ? lead.soft : "#E9E7DF";
        const ink = lead ? lead.inkHex : "#475569";
        return (
          <View key={iso} className="rounded-[28px] p-4 flex-row" style={{ backgroundColor: bg }}>
            <View style={{ width: 118 }}>
              <Text className="text-sm" style={{ color: ink }}>
                {iso === today ? "اليوم" : DAYS[d.getDay()]}
              </Text>
              <Text w="bold" style={{ fontSize: 52, lineHeight: 60, color: ink, fontVariant: ["tabular-nums"] }}>
                {d.getDate()}
              </Text>
              <Text w="semi" className="text-sm" style={{ color: ink }}>
                {MONTHS[d.getMonth()]}
              </Text>
            </View>

            <View className="flex-1 gap-2 justify-center">
              {items.length === 0 ? (
                <Text className="text-sm" style={{ color: ink, opacity: 0.6 }}>
                  يوم فارغ
                </Text>
              ) : (
                items.map((it) => {
                  const m = TYPE_META[it.type];
                  return (
                    <PressableScale
                      key={it.key}
                      onPress={() => onOpen(it)}
                      className="rounded-2xl px-3 py-2"
                      style={{ backgroundColor: m.hex }}
                    >
                      <Text w="bold" className="text-sm" style={{ color: m.onSolid }} numberOfLines={1}>
                        {it.title}
                      </Text>
                      <Text className="text-xs" style={{ color: m.onSolid, opacity: 0.85, fontVariant: ["tabular-nums"] }}>
                        {fmtTime(it.startTime)} – {fmtTime(it.endTime)}
                        {it.endsNextDay ? " (الغد)" : ""}
                      </Text>
                    </PressableScale>
                  );
                })
              )}
            </View>

            <Pressable
              onPress={() => onAdd(iso)}
              hitSlop={8}
              className="w-8 h-8 rounded-full items-center justify-center self-start"
              style={{ borderWidth: 1, borderColor: ink, opacity: 0.7 }}
            >
              <Ionicons name="add" size={18} color={ink} />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
