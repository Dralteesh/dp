import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, PanResponder, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { DAYS_SHORT } from "@/constants/arabic";
import { STATUS_META } from "@/constants/clinic";
import { TYPE_META } from "@/constants/shiftTypes";
import { DS } from "@/design/tokens";
import { agendaFor, type AgendaInput } from "@/lib/agenda";
import { findClashes, itemInterval } from "@/lib/conflicts";
import { addDays, fmtTime, fromISO, minutesToTime, toMinutes, weekdayOf } from "@/lib/dates";
import { useClinic } from "@/store/useClinic";
import type { Appointment, Patient } from "@/types";

const SPAN = 45; // أيام قبل/بعد اليوم
const ITEM_W = 74;
const ROW = 64; // ارتفاع الساعة
const SNAP = 15; // دقائق
const COL = TYPE_META.private;

type Props = {
  date: string;
  onDate: (iso: string) => void;
  today: string;
  appts: Appointment[]; // مواعيد اليوم المحدّد
  patients: Map<string, Patient>;
  input: AgendaInput;
  dotDays: Map<string, number>;
  onOpenPatient: (id: string) => void;
};

const diffDays = (a: string, b: string) => Math.round((fromISO(a).getTime() - fromISO(b).getTime()) / 86400000);
const idxOf = (date: string, today: string) => SPAN - Math.max(-SPAN, Math.min(SPAN, diffDays(date, today)));

/** أقرب وقت فارغ في نفس اليوم (خطوة 15 د) بعيدًا عن التعارض، الأقرب للوقت المطلوب */
export function nearestFree(date: string, wantMin: number, dur: number, input: AgendaInput, appointmentId: string): number | null {
  let best: number | null = null;
  for (let m = 6 * 60; m + dur <= 22 * 60; m += SNAP) {
    if (findClashes(date, minutesToTime(m), dur, input, { appointmentId }).length) continue;
    if (best == null || Math.abs(m - wantMin) < Math.abs(best - wantMin)) best = m;
  }
  return best;
}

/** جدول العيادة: شريط أيام يُسحب أفقيًا (اليوم بالمنتصف) + بطاقات مواعيد تُسحب لتغيير وقتها */
export function DaySchedule({ date, onDate, today, appts, patients, input, dotDays, onOpenPatient }: Props) {
  const update = useClinic((s) => s.updateAppointment);
  const [w, setW] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const current = useRef(idxOf(date, today));

  const days = useMemo(() => Array.from({ length: SPAN * 2 + 1 }, (_, i) => addDays(today, SPAN - i)), [today]);

  const goto = (i: number, animated = true) => {
    current.current = i;
    scroller.current?.scrollTo({ x: i * ITEM_W, animated });
  };
  useEffect(() => {
    if (!w) return;
    const i = idxOf(date, today);
    if (i !== current.current || w) goto(i, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w]);
  useEffect(() => {
    const i = idxOf(date, today);
    if (i !== current.current) goto(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const settle = (x: number) => {
    const i = Math.max(0, Math.min(days.length - 1, Math.round(x / ITEM_W)));
    current.current = i;
    if (days[i] !== date) onDate(days[i]);
  };

  // عناصر اليوم غير مواعيد العيادة (دوام/مناوبات/أنشطة): خلفية رمادية على الشبكة
  const others = useMemo(() => agendaFor(date, input).filter((it) => it.source !== "appointment"), [date, input]);
  const otherIv = others.map((it) => ({ it, iv: itemInterval(it) }));

  const { from, to } = useMemo(() => {
    let lo = 8 * 60;
    let hi = 20 * 60;
    for (const a of appts) {
      lo = Math.min(lo, toMinutes(a.startTime));
      hi = Math.max(hi, toMinutes(a.startTime) + a.durationMin);
    }
    return { from: Math.floor(lo / 60) * 60, to: Math.min(24 * 60, Math.ceil(hi / 60) * 60) };
  }, [appts]);
  const height = ((to - from) / 60) * ROW;
  const hours: number[] = [];
  for (let m = from; m <= to; m += 60) hours.push(m);
  const yOf = (min: number) => ((min - from) / 60) * ROW;

  const move = (a: Appointment, newMin: number) => {
    const nm = Math.max(0, Math.min(24 * 60 - a.durationMin, newMin));
    if (nm === toMinutes(a.startTime)) return;
    const clashes = findClashes(date, minutesToTime(nm), a.durationMin, input, { appointmentId: a.id });
    if (!clashes.length) return update(a.id, { startTime: minutesToTime(nm) });
    const names = clashes.slice(0, 2).map((c) => c.item.title).join("، ");
    const free = nearestFree(date, nm, a.durationMin, input, a.id);
    Alert.alert(
      "تعارض مع جدولك",
      `الوقت ${fmtTime(minutesToTime(nm))} يتقاطع مع: ${names}.`,
      [
        ...(free != null ? [{ text: `أقرب وقت فارغ ${fmtTime(minutesToTime(free))}`, onPress: () => update(a.id, { startTime: minutesToTime(free) }) }] : []),
        { text: "ضعه رغم التعارض", style: "destructive" as const, onPress: () => update(a.id, { startTime: minutesToTime(nm) }) },
        { text: "إلغاء", style: "cancel" as const },
      ],
    );
  };

  const suggest = (a: Appointment) => {
    const free = nearestFree(date, toMinutes(a.startTime), a.durationMin, input, a.id);
    if (free == null) return Alert.alert("تعارض مع جدولك", "لا يوجد وقت فارغ في هذا اليوم. جرّب يومًا آخر.");
    Alert.alert("تعارض مع جدولك", `أقرب وقت فارغ: ${fmtTime(minutesToTime(free))}`, [
      { text: "انقل الموعد", onPress: () => update(a.id, { startTime: minutesToTime(free) }) },
      { text: "إبقاء", style: "cancel" },
    ]);
  };

  const pad = w ? (w - ITEM_W) / 2 : 0;

  return (
    <View style={{ marginBottom: 14 }}>
      {/* شريط الأيام: اليوم بالمنتصف والأيام المجاورة على الجانبين */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <Text w="bold" style={{ fontSize: 16 }}>{fromISO(date).toLocaleDateString("ar", { month: "long", year: "numeric" })}</Text>
        <Pressable onPress={() => onDate(today)} style={{ backgroundColor: date === today ? DS.glassStrong : DS.accent, borderRadius: DS.rPill, paddingHorizontal: 14, paddingVertical: 6, opacity: date === today ? 0.4 : 1 }} disabled={date === today}>
          <Text w="bold" style={{ color: "#fff", fontSize: 12 }}>اليوم</Text>
        </Pressable>
      </View>
      <View style={{ direction: "ltr" }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={ITEM_W}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: pad }}
          onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.x)}
          onScrollEndDrag={(e) => settle(e.nativeEvent.contentOffset.x)}
          scrollEventThrottle={32}
        >
          {days.map((iso, i) => {
            const sel = iso === date;
            const n = dotDays.get(iso) ?? 0;
            const near = Math.abs(i - idxOf(date, today)) === 1;
            return (
              <Pressable key={iso} onPress={() => (sel ? undefined : (goto(i), onDate(iso)))} style={{ width: ITEM_W, alignItems: "center" }}>
                <View style={{ width: sel ? 66 : 56, height: sel ? 84 : 72, marginTop: sel ? 0 : 6, borderRadius: 22, backgroundColor: sel ? COL.hex : "#FFFFFF", borderWidth: sel ? 0 : 1, borderColor: "#E3E6EB", alignItems: "center", justifyContent: "center", opacity: sel || near ? 1 : 0.6 }}>
                  <Text style={{ fontSize: 11, color: sel ? COL.onSolid : "#6B7280" }}>{DAYS_SHORT[weekdayOf(iso)]}</Text>
                  <Text w="bold" style={{ fontSize: sel ? 26 : 20, lineHeight: sel ? 34 : 28, color: sel ? COL.onSolid : "#111", fontVariant: ["tabular-nums"] }}>{fromISO(iso).getDate()}</Text>
                  <View style={{ flexDirection: "row", height: 6, gap: 2 }}>
                    {Array.from({ length: Math.min(3, n) }, (_, k) => (
                      <View key={k} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: sel ? COL.onSolid : COL.hex }} />
                    ))}
                  </View>
                </View>
                {iso === today ? <Text w="bold" style={{ fontSize: 10, color: DS.accent, marginTop: 2 }}>اليوم</Text> : <View style={{ height: 16 }} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* الشبكة */}
      <View style={{ backgroundColor: "#fff", borderRadius: DS.rCard, borderWidth: 1, borderColor: "#E3E6EB", padding: 10, marginTop: 6 }}>
        <View style={{ flexDirection: "row", height }}>
          <View style={{ width: 40 }}>
            {hours.map((m) => (
              <Text key={m} style={{ position: "absolute", top: yOf(m) - 7, fontSize: 10, color: "#6B7280", fontVariant: ["tabular-nums"] }}>{String((m / 60) % 24).padStart(2, "0")}:00</Text>
            ))}
          </View>
          <View style={{ flex: 1 }}>
            {hours.map((m) => (
              <View key={m} pointerEvents="none" style={{ position: "absolute", start: 0, end: 0, top: yOf(m), height: 1, backgroundColor: "#EEF0F3" }} />
            ))}
            {/* الدوام والمناوبات والأنشطة */}
            {otherIv.map(({ it, iv }) => {
              const s = Math.max(from, iv[0]);
              const e = Math.min(to, iv[1]);
              if (e <= s) return null;
              const m = TYPE_META[it.type];
              return (
                <View key={it.key} pointerEvents="none" style={{ position: "absolute", start: 0, end: 0, top: yOf(s), height: yOf(e) - yOf(s), backgroundColor: m.soft, opacity: 0.85, borderRadius: 12, borderStartWidth: 4, borderStartColor: m.hex, paddingHorizontal: 8, paddingTop: 4 }}>
                  <Text w="semi" style={{ fontSize: 11, color: m.inkHex }} numberOfLines={1}>{it.title}</Text>
                </View>
              );
            })}
            {appts.map((a) => (
              <ApptCard key={a.id} a={a} patient={patients.get(a.patientId)} yOf={yOf} clash={findClashes(date, a.startTime, a.durationMin, input, { appointmentId: a.id }).filter((c) => c.item.source === "event").length > 0} onDrop={(m) => move(a, m)} onOpen={() => onOpenPatient(a.patientId)} onSuggest={() => suggest(a)} />
            ))}
          </View>
        </View>
        {appts.length === 0 ? <Text style={{ textAlign: "center", color: "#6B7280", fontSize: 12, marginTop: 8 }}>لا مواعيد في هذا اليوم</Text> : <Text style={{ textAlign: "center", color: "#9A9A9A", fontSize: 11, marginTop: 8 }}>اسحب المقبض ⠿ لتغيير وقت الموعد</Text>}
      </View>
    </View>
  );
}

function ApptCard({ a, patient, yOf, clash, onDrop, onOpen, onSuggest }: { a: Appointment; patient?: Patient; yOf: (m: number) => number; clash: boolean; onDrop: (min: number) => void; onOpen: () => void; onSuggest: () => void }) {
  const dy = useRef(new Animated.Value(0)).current;
  const [dragMin, setDragMin] = useState<number | null>(null);
  const startMin = toMinutes(a.startTime);
  const st = STATUS_META[a.status];
  const h = Math.max(46, (a.durationMin / 60) * ROW - 3);
  const cbRef = useRef({ onDrop, startMin });
  cbRef.current = { onDrop, startMin };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => {
        dy.setValue(g.dy);
        const m = Math.round((cbRef.current.startMin + (g.dy / ROW) * 60) / SNAP) * SNAP;
        setDragMin(m);
      },
      onPanResponderRelease: (_, g) => {
        const m = Math.round((cbRef.current.startMin + (g.dy / ROW) * 60) / SNAP) * SNAP;
        setDragMin(null);
        Animated.timing(dy, { toValue: 0, duration: 120, useNativeDriver: false }).start();
        cbRef.current.onDrop(m);
      },
      onPanResponderTerminate: () => {
        setDragMin(null);
        Animated.timing(dy, { toValue: 0, duration: 120, useNativeDriver: false }).start();
      },
    }),
  ).current;

  const shown = dragMin ?? startMin;
  return (
    <Animated.View style={{ position: "absolute", start: 0, end: 0, top: yOf(startMin) + 1, height: h, transform: [{ translateY: dy }], zIndex: dragMin != null ? 20 : 3 }}>
      <View style={{ flex: 1, flexDirection: "row", backgroundColor: COL.hex, borderRadius: 20, overflow: "hidden", borderWidth: clash ? 2 : 0, borderColor: DS.alarm, shadowColor: "#000", shadowOpacity: dragMin != null ? 0.3 : 0.1, shadowRadius: 8, elevation: dragMin != null ? 8 : 2 }}>
        <View {...pan.panHandlers} style={{ width: 36, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.14)" }} accessibilityLabel="اسحب لتغيير الوقت">
          <Ionicons name="reorder-three" size={22} color={COL.onSolid} />
        </View>
        <Pressable onPress={onOpen} style={{ flex: 1, paddingHorizontal: 10, paddingVertical: 6, justifyContent: "center" }}>
          <Text w="bold" style={{ color: COL.onSolid, fontSize: 14 }} numberOfLines={1}>{patient?.name ?? "مريض"}</Text>
          <Text style={{ color: COL.onSolid, opacity: 0.85, fontSize: 11 }} numberOfLines={1}>
            {fmtTime(minutesToTime(shown))} – {fmtTime(minutesToTime(Math.min(1439, shown + a.durationMin)))} • {a.procedure}
          </Text>
        </Pressable>
        <View style={{ justifyContent: "center", paddingEnd: 8, gap: 4, alignItems: "center" }}>
          {clash ? (
            <Pressable onPress={onSuggest} hitSlop={8} accessibilityLabel="اقتراح وقت فارغ">
              <Ionicons name="warning" size={18} color="#FDE047" />
            </Pressable>
          ) : null}
          <View style={{ backgroundColor: st.soft, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text w="semi" style={{ fontSize: 10, color: st.hex }}>{st.label}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
