import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ProcedureBadge } from "@/components/clinic/ProcedureIcon";
import { Text } from "@/components/ui/Text";
import { DAYS_SHORT, MONTHS } from "@/constants/arabic";
import { TYPE_META } from "@/constants/shiftTypes";
import { agendaFor, type AgendaInput, type AgendaItem } from "@/lib/agenda";
import { addDays, fromISO, todayISO, toMinutes, weekdayOf } from "@/lib/dates";

const BLUE = "#0E6FA5";
const PX_PER_MIN = 0.95; // ارتفاع الدقيقة
const MIN_H = 40;
const HOUR_COL = 34;

type Props = {
  selected: string;
  onSelect: (iso: string) => void;
  onOpenCalendar: () => void;
  onOpenItem: (it: AgendaItem) => void;
  input: AgendaInput;
  nowMin: number;
};

type Placed = { it: AgendaItem; s: number; e: number; lane: number; lanes: number };

/** يوزّع العناصر المتقاطعة زمنيًا على مسارات متجاورة داخل العمود */
function layout(items: AgendaItem[]): Placed[] {
  const arr = items
    .map((it) => {
      const s = it.continuation ? 0 : toMinutes(it.startTime);
      let e = it.endsNextDay ? 24 * 60 : toMinutes(it.endTime);
      if (e <= s) e = Math.min(24 * 60, s + 30);
      return { it, s, e, lane: 0, lanes: 1 };
    })
    .sort((a, b) => a.s - b.s || b.e - a.e);
  // مجموعات متقاطعة
  let group: Placed[] = [];
  let groupEnd = -1;
  const flush = () => {
    const n = Math.max(1, ...group.map((g) => g.lane + 1));
    for (const g of group) g.lanes = n;
    group = [];
  };
  for (const p of arr) {
    const visualEnd = Math.max(p.e, p.s + MIN_H / PX_PER_MIN);
    if (group.length && p.s >= groupEnd) {
      flush();
      groupEnd = -1;
    }
    const used = new Set(group.filter((g) => g.s + 0 < visualEnd && Math.max(g.e, g.s + MIN_H / PX_PER_MIN) > p.s).map((g) => g.lane));
    let lane = 0;
    while (used.has(lane)) lane++;
    p.lane = lane;
    group.push(p);
    groupEnd = Math.max(groupEnd, visualEnd);
  }
  flush();
  return arr;
}

/**
 * جدول أسبوعي بأعمدة: كل يوم عمود، والأحداث كبسولات ملوّنة بطول مدتها
 * تتصل على خيط رفيع. السبت أول الأسبوع (يمين).
 */
export function WeekTimeline({ selected, onSelect, onOpenCalendar, onOpenItem, input, nowMin }: Props) {
  const back = (weekdayOf(selected) + 1) % 7;
  const start = addDays(selected, -back);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);
  const today = todayISO();
  const d = fromISO(selected);

  const perDay = useMemo(() => days.map((iso) => ({ iso, placed: layout(agendaFor(iso, input)) })), [days, input]);

  // نطاق الساعات المعروض: من أبكر عنصر إلى آخر عنصر (حدّ أدنى 8 ساعات)
  const { from, to } = useMemo(() => {
    let lo = 24 * 60;
    let hi = 0;
    for (const day of perDay) for (const p of day.placed) {
      lo = Math.min(lo, p.s);
      hi = Math.max(hi, p.e);
    }
    if (lo > hi) {
      lo = 8 * 60;
      hi = 17 * 60;
    }
    let f = Math.max(0, Math.floor((lo - 30) / 60) * 60);
    let t = Math.min(24 * 60, Math.ceil((hi + 30) / 60) * 60);
    if (t - f < 8 * 60) t = Math.min(24 * 60, f + 8 * 60);
    if (t - f < 8 * 60) f = Math.max(0, t - 8 * 60);
    return { from: f, to: t };
  }, [perDay]);

  const height = (to - from) * PX_PER_MIN;
  const hours: number[] = [];
  for (let h = from / 60; h <= to / 60; h++) hours.push(h);
  const nowY = (nowMin - from) * PX_PER_MIN;

  return (
    <View className="bg-surface rounded-[28px] border border-line p-3 mb-3">
      {/* الشهر والتنقل */}
      <View className="flex-row items-center justify-between mb-3">
        <Pressable hitSlop={10} onPress={() => onSelect(addDays(selected, -7))} className="w-9 h-9 rounded-full border border-line items-center justify-center">
          <Ionicons name="chevron-forward" size={18} color="#0F172A" />
        </Pressable>
        <Pressable onPress={onOpenCalendar} className="flex-row items-center gap-1.5" hitSlop={8}>
          <Text w="bold" className="text-lg">
            {MONTHS[d.getMonth()]} <Text w="bold" className="text-lg" style={{ color: BLUE }}>{d.getFullYear()}</Text>
          </Text>
          <Ionicons name="calendar-outline" size={17} color={BLUE} />
        </Pressable>
        <Pressable hitSlop={10} onPress={() => onSelect(addDays(selected, 7))} className="w-9 h-9 rounded-full border border-line items-center justify-center">
          <Ionicons name="chevron-back" size={18} color="#0F172A" />
        </Pressable>
      </View>

      {/* رؤوس الأيام */}
      <View className="flex-row" style={{ marginStart: HOUR_COL }}>
        {perDay.map(({ iso, placed }) => {
          const isSel = iso === selected;
          const isToday = iso === today;
          const types = [...new Set(placed.map((p) => p.it.type))].slice(0, 2);
          return (
            <Pressable key={iso} onPress={() => (isSel ? onOpenCalendar() : onSelect(iso))} style={{ flex: 1, alignItems: "center" }}>
              <Text className="text-[11px] text-muted">{DAYS_SHORT[weekdayOf(iso)]}</Text>
              <View
                className="items-center justify-center"
                style={{ width: 32, height: 32, borderRadius: 16, marginTop: 2, backgroundColor: isSel ? BLUE : "transparent", borderWidth: isToday && !isSel ? 1.5 : 0, borderColor: BLUE }}
              >
                <Text w="bold" style={{ color: isSel ? "#FFFFFF" : undefined }}>
                  {fromISO(iso).getDate()}
                </Text>
              </View>
              <View className="flex-row gap-1 mt-1" style={{ height: 8 }}>
                {types.map((t) => (
                  <View key={t} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: TYPE_META[t].hex }} />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* الشبكة */}
      <View className="flex-row mt-2" style={{ height }}>
        {/* عمود الساعات */}
        <View style={{ width: HOUR_COL }}>
          {hours.map((h) => (
            <Text key={h} className="text-[10px] text-muted" style={{ position: "absolute", top: (h * 60 - from) * PX_PER_MIN - 6, width: HOUR_COL - 4 }}>
              {String(h % 24).padStart(2, "0")}:00
            </Text>
          ))}
        </View>
        <View style={{ flex: 1, flexDirection: "row" }}>
          {/* خطوط الساعات */}
          {hours.map((h) => (
            <View key={h} pointerEvents="none" style={{ position: "absolute", start: 0, end: 0, top: (h * 60 - from) * PX_PER_MIN, height: 1, backgroundColor: "#E2E8F0", opacity: 0.6 }} />
          ))}
          {perDay.map(({ iso, placed }) => {
            const isSel = iso === selected;
            return (
              <View key={iso} style={{ flex: 1, backgroundColor: isSel ? "rgba(14,111,165,0.06)" : undefined, borderRadius: 14 }}>
                {/* الخيط الرأسي */}
                <View pointerEvents="none" style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 2, marginLeft: -1, backgroundColor: "#E2E8F0", opacity: 0.8 }} />
                {iso === today && nowY >= 0 && nowY <= height ? (
                  <View pointerEvents="none" style={{ position: "absolute", start: 0, end: 0, top: nowY, height: 2, backgroundColor: "#22C55E", zIndex: 5 }} />
                ) : null}
                {placed.map((p) => {
                  const m = TYPE_META[p.it.type];
                  const top = (p.s - from) * PX_PER_MIN;
                  const h = Math.max(MIN_H, (p.e - p.s) * PX_PER_MIN) - 4;
                  const w = 100 / p.lanes;
                  return (
                    <Pressable
                      key={p.it.key}
                      onPress={() => onOpenItem(p.it)}
                      accessibilityLabel={p.it.title}
                      style={{
                        position: "absolute",
                        top: top + 2,
                        height: h,
                        start: `${p.lane * w + 6 / p.lanes}%`,
                        width: `${w - 12 / p.lanes}%`,
                        borderRadius: 18,
                        backgroundColor: m.hex,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: p.it.status === "cancelled" || p.it.status === "no_show" ? 0.4 : 1,
                        zIndex: 2,
                      }}
                    >
                      {p.it.source === "appointment" ? (
                        <ProcedureBadge name={p.it.procedure} size={24} color={m.onSolid} />
                      ) : (
                        <Ionicons name={m.icon} size={20} color={m.onSolid} />
                      )}
                      {h > 64 ? (
                        <Text className="text-[9px]" numberOfLines={2} style={{ color: m.onSolid, textAlign: "center", paddingHorizontal: 2, marginTop: 2 }}>
                          {p.it.title}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
