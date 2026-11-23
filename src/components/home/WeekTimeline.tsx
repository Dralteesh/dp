import { useQuickAdd } from "@/store/useQuickAdd";
import { useShortcutMenu } from "@/store/useShortcutMenu";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ProcedureBadge } from "@/components/clinic/ProcedureIcon";
import { Text } from "@/components/ui/Text";
import { DAYS_SHORT, MONTHS } from "@/constants/arabic";
import { TYPE_META } from "@/constants/shiftTypes";
import { agendaFor, type AgendaInput, type AgendaItem } from "@/lib/agenda";
import { TimelinePrefsPanel } from "@/components/home/TimelinePrefsPanel";
import { Sheet } from "@/components/ui/Sheet";
import { useSettings } from "@/store/useSettings";
import { addDays, fmtDateFull, fromISO, todayISO, toMinutes, weekdayOf } from "@/lib/dates";

const BLUE = "#6366F1";
const GAP_H = 22; // ارتفاع شريط الساعات الفارغة المطويّة
const isShift = (it: AgendaItem) => it.type === "maxillo" || !!it.continuation || it.endsNextDay;
const SLICE = 15; // دقائق لكل شريحة زمنية (الارتفاعات والأيام من إعدادات الجدول)
const HOUR_COL = 30;

type Props = {
  selected: string;
  onSelect: (iso: string) => void;
  onOpenCalendar: () => void;
  onOpenItem: (it: AgendaItem) => void;
  input: AgendaInput;
  nowMin: number;
};

type Base = { it: AgendaItem; s: number; e: number };
type Placed = Base & { lane: number; lanes: number };

/** يحوّل عناصر اليوم إلى فترات (بداية/نهاية بالدقائق) */
function toBase(items: AgendaItem[]): Base[] {
  return items.map((it) => {
    const s = it.continuation ? 0 : toMinutes(it.startTime);
    let e = it.endsNextDay ? 24 * 60 : toMinutes(it.endTime);
    if (e <= s) e = Math.min(24 * 60, s + 30);
    return { it, s, e };
  });
}

/** يوزّع العناصر المتقاطعة على مسارات متجاورة حسب موضعها المرئي (بعد تمديد الوقت) لا زمنها فقط */
function assignLanes(items: Base[], y: (m: number) => number, minH: number): Placed[] {
  const arr: Array<Placed & { top: number; bot: number }> = items
    .map((b) => ({ ...b, lane: 0, lanes: 1, top: y(b.s), bot: Math.max(y(b.e), y(b.s) + minH) }))
    .sort((a, b) => a.top - b.top || b.bot - a.bot);
  let group: typeof arr = [];
  let groupEnd = -1;
  const flush = () => {
    const n = Math.max(1, ...group.map((g) => g.lane + 1));
    for (const g of group) g.lanes = n;
    group = [];
  };
  for (const p of arr) {
    if (group.length && p.top >= groupEnd) {
      flush();
      groupEnd = -1;
    }
    const used = new Set(group.filter((g) => g.top < p.bot && g.bot > p.top).map((g) => g.lane));
    let lane = 0;
    while (used.has(lane)) lane++;
    p.lane = lane;
    group.push(p);
    groupEnd = Math.max(groupEnd, p.bot);
  }
  flush();
  return arr;
}

/**
 * جدول أسبوعي بأعمدة: كل يوم عمود، والأحداث كبسولات ملوّنة بطول مدتها
 * تتصل على خيط رفيع. السبت أول الأسبوع (يمين).
 */
export function WeekTimeline({ selected, onSelect, onOpenCalendar, onOpenItem, input, nowMin }: Props) {
  const showMenu = useShortcutMenu((s) => s.show);
  const tl = useSettings((s) => s.timeline);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const DAYS_N = tl.days;
  const MIN_H = tl.minCardH;
  // اليوم المحدّد (الحالي افتراضيًا) في المنتصف
  const start = addDays(selected, -Math.floor(DAYS_N / 2));
  const days = useMemo(() => Array.from({ length: DAYS_N }, (_, i) => addDays(start, i)), [start, DAYS_N]);
  const today = todayISO();
  const d = fromISO(selected);

  const perDayAll = useMemo(() => days.map((iso) => ({ iso, placed: toBase(agendaFor(iso, input)) })), [days, input]);
  const [openGaps, setOpenGaps] = useState<Set<number>>(new Set());

  // أيام المناوبة: يُختصر العرض إلى نطاق المناوبة فقط
  const shiftRange = useMemo(() => {
    const sel = perDayAll.find((d) => d.iso === selected)?.placed.filter((p) => isShift(p.it)) ?? [];
    if (!sel.length) return null;
    return { lo: Math.min(...sel.map((p) => p.s)), hi: Math.max(...sel.map((p) => p.e)) };
  }, [perDayAll, selected]);
  const perDay = useMemo(
    () => (shiftRange ? perDayAll.map((d) => ({ ...d, placed: d.placed.filter((p) => p.e > shiftRange.lo && p.s < shiftRange.hi) })) : perDayAll),
    [perDayAll, shiftRange],
  );

  // مقاطع الساعات: مغطّاة بالأحداث، أو فارغة (تُطوى في شريط صغير قابل للفتح)
  const segs = useMemo(() => {
    const iv: Array<[number, number]> = [];
    if (shiftRange) iv.push([shiftRange.lo, shiftRange.hi]);
    else for (const day of perDay) for (const p of day.placed) iv.push([p.s, p.e]);
    if (!iv.length) iv.push([8 * 60, 17 * 60]);
    const padded = iv
      .map(([a, b]) => [Math.max(0, Math.floor((a - 30) / 60) * 60), Math.min(1440, Math.ceil((b + 30) / 60) * 60)] as [number, number])
      .sort((a, b) => a[0] - b[0]);
    const cover: Array<[number, number]> = [];
    for (const r of padded) {
      const last = cover[cover.length - 1];
      // فجوة أقل من ساعتين لا تُطوى
      if (last && r[0] - last[1] < 120) last[1] = Math.max(last[1], r[1]);
      else cover.push([r[0], r[1]]);
    }
    const out: Array<{ from: number; to: number; gap: boolean }> = [];
    let cur = 0;
    for (const [a, b] of cover) {
      if (a - cur >= 120) out.push({ from: cur, to: a, gap: true });
      else if (a > cur && out.length) out[out.length - 1].to = a;
      else if (a > cur) out.push({ from: cur, to: a, gap: false });
      out.push({ from: a, to: b, gap: false });
      cur = b;
    }
    if (1440 - cur >= 120) out.push({ from: cur, to: 1440, gap: true });
    else if (cur < 1440) out[out.length - 1].to = 1440;
    return out;
  }, [perDay, shiftRange]);

  // الشرائح التي فيها مواعيد قصيرة (غير دوام/مناوبة) تتمدّد، وما عداها ينضغط
  const dense = useMemo(() => {
    const set = new Set<number>();
    for (const day of perDay)
      for (const p of day.placed) {
        if (isShift(p.it) || p.e - p.s >= tl.longHours * 60) continue;
        const end = Math.max(p.e, p.s + 2 * SLICE);
        for (let k = Math.floor(p.s / SLICE); k < Math.ceil(end / SLICE); k++) set.add(k);
      }
    return set;
  }, [perDay, tl.longHours]);

  // محور زمني غير خطي: كتل (15 د) بارتفاعات مختلفة + شرائط الفجوات المطويّة
  const { laid, blocks, height } = useMemo(() => {
    const raw: Array<{ from: number; to: number; h: number; fixed: boolean }> = [];
    const info = segs.map((sg) => {
      const collapsed = sg.gap && !openGaps.has(sg.from);
      const startIdx = raw.length;
      if (collapsed) raw.push({ from: sg.from, to: sg.to, h: GAP_H, fixed: true });
      else
        for (let m = sg.from; m < sg.to; m += SLICE) {
          const to = Math.min(sg.to, m + SLICE);
          raw.push({ from: m, to, h: ((to - m) / SLICE) * (dense.has(Math.floor(m / SLICE)) ? tl.densePx : tl.basePx), fixed: false });
        }
      return { sg, collapsed, startIdx, endIdx: raw.length };
    });
    const fixedH = raw.filter((r) => r.fixed).reduce((a, r) => a + r.h, 0);
    const flexH = raw.filter((r) => !r.fixed).reduce((a, r) => a + r.h, 0);
    const k = flexH > 0 ? Math.max(0.75, Math.min(1, (tl.maxH - fixedH) / flexH)) : 1;
    let off = 0;
    const blocks = raw.map((r) => {
      const h = r.fixed ? r.h : r.h * k;
      const b = { from: r.from, to: r.to, h, off };
      off += h;
      return b;
    });
    const laid = info.map(({ sg, collapsed, startIdx, endIdx }) => {
      const first = blocks[startIdx];
      const h = blocks.slice(startIdx, endIdx).reduce((a, b) => a + b.h, 0);
      return { ...sg, collapsed, h, off: first ? first.off : 0 };
    });
    return { laid, blocks, height: off };
  }, [segs, openGaps, dense, tl.densePx, tl.basePx, tl.maxH]);

  const y = (min: number) => {
    for (const b of blocks) {
      if (min <= b.to) {
        const f = (min - b.from) / (b.to - b.from);
        return b.off + Math.max(0, Math.min(1, f)) * b.h;
      }
    }
    return height;
  };
  const perDayLaid = perDay.map((d) => ({ ...d, placed: assignLanes(d.placed, y, MIN_H) }));
  const toggleGap = (from: number) =>
    setOpenGaps((prev) => {
      const n = new Set(prev);
      if (n.has(from)) n.delete(from);
      else n.add(from);
      return n;
    });
  const allHours: number[] = [];
  for (const sg of laid) if (!sg.collapsed) for (let m = sg.from; m <= sg.to; m += 60) if (!allHours.includes(m)) allHours.push(m);
  // نُخفي تسمية الساعة إن كانت قريبة جدًا من سابقتها (الساعات المضغوطة)
  const hourLabels: number[] = [];
  let lastY = -100;
  for (const m of allHours.sort((a, b) => a - b)) {
    const yy = y(m);
    if (yy - lastY >= 14) {
      hourLabels.push(m);
      lastY = yy;
    }
  }
  const emptyHours = (sg: { from: number; to: number }) => Math.round((sg.to - sg.from) / 60);

  return (
    <View className="bg-surface rounded-[26px] border border-line px-3 py-2 mb-3">
      {/* الشهر والتنقل */}
      <View className="flex-row items-center justify-between mb-1.5">
        <Pressable hitSlop={10} onPress={() => onSelect(addDays(selected, -DAYS_N))} className="w-8 h-8 rounded-full bg-bg items-center justify-center">
          <Ionicons name="chevron-forward" size={18} color="#111111" />
        </Pressable>
        <Pressable onPress={onOpenCalendar} onLongPress={() => setPrefsOpen(true)} delayLongPress={350} className="flex-row items-center gap-1.5" hitSlop={8} accessibilityHint="ضغط مطوّل لضبط الجدول">
          <Text w="bold" className="text-lg">
            {MONTHS[d.getMonth()]} <Text w="bold" className="text-lg" style={{ color: BLUE }}>{d.getFullYear()}</Text>
          </Text>
          <Ionicons name="calendar-outline" size={17} color={BLUE} />
        </Pressable>
        <Pressable hitSlop={10} onPress={() => onSelect(addDays(selected, DAYS_N))} className="w-8 h-8 rounded-full bg-bg items-center justify-center">
          <Ionicons name="chevron-back" size={18} color="#111111" />
        </Pressable>
      </View>

      {shiftRange ? (
        <View className="self-center flex-row items-center gap-1.5 rounded-full px-3 py-1 mb-2" style={{ backgroundColor: "#EEF2FF" }}>
          <Ionicons name="medkit-outline" size={13} color={BLUE} />
          <Text w="semi" className="text-[11px]" style={{ color: BLUE }}>يوم مناوبة: يُعرض نطاق المناوبة فقط</Text>
        </View>
      ) : null}

      {/* رؤوس الأيام */}
      <View className="flex-row" style={{ marginStart: HOUR_COL }}>
        {perDay.map(({ iso, placed }) => {
          const isSel = iso === selected;
          const isToday = iso === today;
          const types = [...new Set(placed.map((p) => p.it.type))].slice(0, 2);
          return (
            <Pressable
              key={iso}
              onPress={() => (isSel ? onOpenCalendar() : onSelect(iso))}
              onLongPress={() =>
                showMenu(fmtDateFull(iso), [
                  { label: "إضافة حدث في هذا اليوم", icon: "add-circle-outline", onPress: () => useQuickAdd.getState().show(iso) },
                  { label: "فتح التقويم", icon: "calendar-number-outline", onPress: () => onOpenCalendar() },
                ])
              }
              delayLongPress={350}
              style={{ flex: 1, alignItems: "center" }}
            >
              <Text className="text-xs text-muted">{DAYS_SHORT[weekdayOf(iso)]}</Text>
              <View
                className="items-center justify-center"
                style={{ width: 30, height: 30, borderRadius: 15, marginTop: 1, backgroundColor: isSel ? BLUE : "transparent", borderWidth: isToday && !isSel ? 1.5 : 0, borderColor: BLUE }}
              >
                <Text w="bold" className="text-sm" style={{ color: isSel ? "#FFFFFF" : undefined }}>
                  {fromISO(iso).getDate()}
                </Text>
              </View>
              <View className="flex-row gap-1 mt-0.5" style={{ height: 6 }}>
                {types.map((t) => (
                  <View key={t} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: TYPE_META[t].hex }} />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* الشبكة */}
      <View className="flex-row mt-1" style={{ height }}>
        <View style={{ width: HOUR_COL }}>
          {hourLabels.map((m) => (
            <Text key={m} className="text-[10px] text-muted" style={{ position: "absolute", top: y(m) - 6, width: HOUR_COL - 4 }}>
              {String((m / 60) % 24).padStart(2, "0")}:00
            </Text>
          ))}
        </View>
        <View style={{ flex: 1, flexDirection: "row" }}>
          {hourLabels.map((m) => (
            <View key={m} pointerEvents="none" style={{ position: "absolute", start: 0, end: 0, top: y(m), height: 1, backgroundColor: "#E5E7EB", opacity: 0.8 }} />
          ))}
          {perDayLaid.map(({ iso, placed }) => {
            const isSel = iso === selected;
            return (
              <View key={iso} style={{ flex: 1, backgroundColor: isSel ? "rgba(99,102,241,0.06)" : undefined, borderRadius: 14 }}>
                <View pointerEvents="none" style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 2, marginLeft: -1, backgroundColor: "#E5E7EB", opacity: 0.8 }} />
                {placed.map((p) => {
                  const m = TYPE_META[p.it.type];
                  const top = y(p.s);
                  const h = Math.max(MIN_H, y(p.e) - y(p.s)) - 3;
                  const w = 100 / p.lanes;
                  return (
                    <Pressable
                      key={p.it.key}
                      onPress={() => onOpenItem(p.it)}
                      accessibilityLabel={p.it.title}
                      style={{
                        position: "absolute",
                        top: top + 1.5,
                        height: h,
                        start: `${p.lane * w + 6 / p.lanes}%`,
                        width: `${w - 12 / p.lanes}%`,
                        borderRadius: 12,
                        backgroundColor: m.hex,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: p.it.status === "cancelled" || p.it.status === "no_show" ? 0.4 : 1,
                        zIndex: 2,
                      }}
                    >
                      {p.it.source === "appointment" ? (
                        <ProcedureBadge name={p.it.procedure} size={h > 40 ? 34 : 26} color={m.onSolid} />
                      ) : (
                        <Ionicons name={m.icon} size={h > 40 ? 26 : 20} color={m.onSolid} />
                      )}
                      {h > 56 ? (
                        <Text className="text-[10px]" numberOfLines={2} style={{ color: m.onSolid, textAlign: "center", paddingHorizontal: 2, marginTop: 2 }}>
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

        {/* الساعات الفارغة: شريط صغير قابل للفتح/الطيّ */}
        {laid
          .filter((sg) => sg.gap)
          .map((sg) => (
            <Pressable
              key={sg.from}
              onPress={() => toggleGap(sg.from)}
              style={{ position: "absolute", start: HOUR_COL, end: 0, top: sg.off + (sg.collapsed ? 2 : 0), height: sg.collapsed ? GAP_H - 3 : 20, zIndex: 8, alignItems: "center", justifyContent: "center" }}
            >
              <View className="flex-row items-center gap-1 rounded-full px-2.5" style={{ height: 19, backgroundColor: sg.collapsed ? "#EEF2FF" : "rgba(238,242,255,0.9)" }}>
                <Ionicons name={sg.collapsed ? "chevron-down" : "chevron-up"} size={11} color={BLUE} />
                <Text w="semi" className="text-[10px]" style={{ color: BLUE }}>
                  {sg.collapsed ? `${emptyHours(sg)} ساعات فارغة` : "طيّ"}
                </Text>
              </View>
            </Pressable>
          ))}
      </View>
      <Sheet visible={prefsOpen} onClose={() => setPrefsOpen(false)} title="ضبط الجدول">
        <TimelinePrefsPanel />
      </Sheet>
    </View>
  );
}
