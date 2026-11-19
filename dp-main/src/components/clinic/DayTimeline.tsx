import { useMemo, useState } from "react";
import { Alert, Pressable, View, type LayoutChangeEvent } from "react-native";
import { useRouter } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { STATUS_META } from "@/constants/clinic";
import { TYPE_META } from "@/constants/shiftTypes";
import { describeClash, findClashes } from "@/lib/conflicts";
import { fmtTime, minutesToTime, toMinutes } from "@/lib/dates";
import { useAgendaInput } from "@/hooks/useAgenda";
import { useClinic } from "@/store/useClinic";
import type { Appointment, Patient } from "@/types";

const SLOT = 30; // دقيقة
const SLOT_H = 58; // ارتفاع نصف ساعة
const LABEL_W = 54;
const PX_PER_MIN = SLOT_H / SLOT;

type Props = { date: string; appointments: Appointment[]; patients: Map<string, Patient> };

/** توزيع المواعيد المتداخلة على أعمدة متجاورة */
function layoutCols(list: Appointment[]) {
  const sorted = [...list].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  const colEnd: number[] = [];
  const col = new Map<string, number>();
  for (const a of sorted) {
    const s = toMinutes(a.startTime);
    let i = colEnd.findIndex((e) => e <= s);
    if (i < 0) i = colEnd.length;
    colEnd[i] = s + a.durationMin;
    col.set(a.id, i);
  }
  return { col, cols: Math.max(1, colEnd.length) };
}

/** جدول زمني لليوم: اسحب البطاقة (ضغطة مطوّلة ثم سحب) لنقل الموعد. اضغط فترة فارغة لحجز موعد */
export function DayTimeline({ date, appointments, patients }: Props) {
  const router = useRouter();
  const updateAppointment = useClinic((s) => s.updateAppointment);
  const input = useAgendaInput();
  const [W, setW] = useState(320);

  const { startMin, endMin } = useMemo(() => {
    let s = 8 * 60;
    let e = 18 * 60;
    for (const a of appointments) {
      s = Math.min(s, Math.floor(toMinutes(a.startTime) / 60) * 60);
      e = Math.max(e, Math.ceil((toMinutes(a.startTime) + a.durationMin) / 60) * 60);
    }
    return { startMin: Math.max(0, s), endMin: Math.min(24 * 60, e) };
  }, [appointments]);

  const { col, cols } = useMemo(() => layoutCols(appointments), [appointments]);
  const slots = useMemo(() => {
    const out: number[] = [];
    for (let m = startMin; m < endMin; m += SLOT) out.push(m);
    return out;
  }, [startMin, endMin]);

  const areaW = Math.max(60, W - LABEL_W - 4);
  const colW = areaW / cols;

  const move = (a: Appointment, newStart: number) => {
    const t = minutesToTime(newStart);
    if (t === a.startTime) return;
    const clashes = findClashes(date, t, a.durationMin, input, { appointmentId: a.id });
    const apply = () => updateAppointment(a.id, { startTime: t });
    if (clashes.length) {
      Alert.alert(
        "تعارض في الوقت",
        `${clashes.slice(0, 3).map((x) => `• ${describeClash(x)}`).join("\n")}\n\nهل تريد النقل رغم ذلك؟`,
        [
          { text: "إلغاء", style: "cancel" },
          { text: "نقل رغم التعارض", onPress: apply },
        ],
      );
      return;
    }
    apply();
  };

  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} className="bg-surface border border-line rounded-2xl overflow-hidden">
      <Text className="text-[11px] text-muted px-3 pt-2">اضغط مطوّلًا على موعد ثم اسحبه لتغيير وقته. اضغط فترة فارغة للحجز.</Text>
      <View style={{ height: slots.length * SLOT_H + 8, paddingTop: 4 }}>
        {slots.map((m, i) => (
          <Pressable
            key={m}
            onPress={() =>
              router.push({ pathname: "/clinic/appointment-form", params: { date, startTime: minutesToTime(m) } })
            }
            style={{
              position: "absolute",
              top: 4 + i * SLOT_H,
              start: 0,
              end: 0,
              height: SLOT_H,
              borderTopWidth: m % 60 === 0 ? 1 : 0.5,
              borderTopColor: m % 60 === 0 ? "#DCE4EA" : "#EEF2F5",
            }}
          >
            <Text className="text-[10px] text-muted" style={{ width: LABEL_W, paddingStart: 10, paddingTop: 2 }}>
              {m % 60 === 0 ? fmtTime(minutesToTime(m)) : ""}
            </Text>
          </Pressable>
        ))}

        {appointments.map((a) => (
          <TimelineCard
            key={a.id}
            a={a}
            patient={patients.get(a.patientId)}
            top={4 + (toMinutes(a.startTime) - startMin) * PX_PER_MIN}
            left={LABEL_W + (col.get(a.id) ?? 0) * colW}
            width={colW - 4}
            minStart={startMin}
            maxStart={endMin - Math.min(a.durationMin, endMin - startMin)}
            onOpen={() => patients.get(a.patientId) && router.push({ pathname: "/clinic/patient/[id]", params: { id: a.patientId } })}
            onDrop={(ns) => move(a, ns)}
          />
        ))}
      </View>
    </View>
  );
}

function TimelineCard({
  a,
  patient,
  top,
  left,
  width,
  minStart,
  maxStart,
  onOpen,
  onDrop,
}: {
  a: Appointment;
  patient?: Patient;
  top: number;
  left: number;
  width: number;
  minStart: number;
  maxStart: number;
  onOpen: () => void;
  onDrop: (newStartMin: number) => void;
}) {
  const ty = useSharedValue(0);
  const lifted = useSharedValue(0);
  const st = STATUS_META[a.status];
  const h = Math.max(34, a.durationMin * PX_PER_MIN - 3);
  const hex = TYPE_META.private.hex;

  const pan = Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(250)
    .onStart(() => {
      lifted.value = withSpring(1);
    })
    .onUpdate((e) => {
      ty.value = e.translationY;
    })
    .onEnd((e) => {
      const raw = toMinutes(a.startTime) + e.translationY / PX_PER_MIN;
      const snapped = Math.round(raw / SLOT) * SLOT;
      onDrop(Math.min(maxStart, Math.max(minStart, snapped)));
    })
    .onFinalize(() => {
      ty.value = withSpring(0);
      lifted.value = withSpring(0);
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }, { scale: 1 + lifted.value * 0.03 }],
    zIndex: lifted.value > 0.01 ? 20 : 1,
    shadowOpacity: 0.08 + lifted.value * 0.25,
    elevation: lifted.value > 0.01 ? 8 : 1,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          {
            position: "absolute",
            top,
            start: left,
            width,
            height: h,
            borderRadius: 12,
            backgroundColor: st.soft,
            borderStartWidth: 4,
            borderStartColor: st.hex,
            shadowColor: "#000",
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            overflow: "hidden",
          },
          style,
        ]}
      >
        <Pressable onPress={onOpen} style={{ flex: 1, paddingHorizontal: 8, paddingVertical: 4 }}>
          <View className="flex-row items-center gap-1">
            <Text w="bold" className="text-xs flex-1" numberOfLines={1} style={{ color: "#0F172A" }}>
              {patient?.name ?? "مريض محذوف"}
            </Text>
            <Ionicons name="reorder-two" size={16} color={hex} />
          </View>
          {h > 44 ? (
            <Text className="text-[10px]" numberOfLines={1} style={{ color: st.hex }}>
              {fmtTime(a.startTime)} · {a.procedure}
            </Text>
          ) : null}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}
