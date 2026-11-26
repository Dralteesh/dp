import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PatientPanel } from "@/components/planner/PatientPanel";
import { PlannerShell, ProcAvatar } from "@/components/planner/kit";
import { WaitlistBanner } from "@/components/planner/WaitlistBanner";
import { Text } from "@/components/ui/Text";
import { PL } from "@/design/planner";
import { useLayout } from "@/hooks/useLayout";
import { addDays, fmtDateFull, fmtTime, fromISO, minutesToTime, toISO, toMinutes } from "@/lib/dates";
import { useClinic } from "@/store/useClinic";
import type { Appointment, Patient } from "@/types";

const STEP = 30;
const SLOT_H = 64;
const LABEL_W = 58;
const DAY_NAMES = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

const live = (a: Appointment) => a.status !== "cancelled" && a.status !== "postponed";

type CardProps = {
  appt: Appointment;
  patient?: Patient;
  top: number;
  height: number;
  rangeStart: number;
  rangeEnd: number;
  onOpen: () => void;
  onLock: (locked: boolean) => void;
  onHover: (minutes: number | null) => void;
  onCommit: (id: string, newStart: number) => void;
};

/** بطاقة موعد: اضغط مطوّلًا ثم اسحبها لأعلى/أسفل لتغيير وقتها (الخطوة 15 دقيقة) */
function DraggableCard({ appt, patient, top, height, rangeStart, rangeEnd, onOpen, onLock, onHover, onCommit }: CardProps) {
  const dragY = useSharedValue(0);
  const active = useSharedValue(0);
  const lastSnap = useSharedValue(-1);
  const origStart = toMinutes(appt.startTime);
  const dur = appt.durationMin;

  const pan = Gesture.Pan()
    .activateAfterLongPress(300)
    .onStart(() => {
      active.value = 1;
      lastSnap.value = -1;
      runOnJS(onLock)(true);
    })
    .onUpdate((e) => {
      dragY.value = e.translationY;
      const delta = Math.round(((e.translationY / SLOT_H) * STEP) / 15) * 15;
      const next = Math.max(rangeStart, Math.min(rangeEnd - dur, origStart + delta));
      if (next !== lastSnap.value) {
        lastSnap.value = next;
        runOnJS(onHover)(next);
      }
    })
    .onEnd((e) => {
      const delta = Math.round(((e.translationY / SLOT_H) * STEP) / 15) * 15;
      const next = Math.max(rangeStart, Math.min(rangeEnd - dur, origStart + delta));
      if (next !== origStart) runOnJS(onCommit)(appt.id, next);
    })
    .onFinalize(() => {
      dragY.value = 0;
      active.value = 0;
      runOnJS(onLock)(false);
      runOnJS(onHover)(null);
    });

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: dragY.value }, { scale: active.value ? 1.02 : 1 }],
    zIndex: active.value ? 20 : 1,
    opacity: active.value ? 0.95 : 1,
  }));

  return (
    <Animated.View style={[{ position: "absolute", top, start: LABEL_W, end: 0, height }, anim]}>
      <GestureDetector gesture={pan}>
        <View
          style={{
            flex: 1,
            borderRadius: 16,
            backgroundColor: appt.status === "done" ? PL.goodSoft : PL.cardStrong,
            borderWidth: 1,
            borderColor: PL.border,
          }}
        >
          <Pressable onPress={onOpen} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10 }}>
            <ProcAvatar procedure={appt.procedure} name={patient?.name ?? "؟"} gender={patient?.gender} size={42} />
            <View style={{ flex: 1 }}>
              <Text w="bold" numberOfLines={1} style={{ color: PL.navy }}>
                {patient?.name ?? "مريض محذوف"}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 12, color: PL.muted }}>
                {appt.procedure} • {appt.durationMin} د
              </Text>
            </View>
            <Ionicons name="reorder-three" size={20} color={PL.blueSoft} />
          </Pressable>
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

/** الجدول (الواجهة الجديدة): اضغط مطوّلًا على موعد ثم اسحبه لتغيير وقته */
export default function PlannerSchedule() {
  const router = useRouter();
  const { isWide } = useLayout();
  const [selPatient, setSelPatient] = useState<string | null>(null);
  const [date, setDate] = useState(toISO(new Date()));
  const [scrollOn, setScrollOn] = useState(true);
  const [hover, setHover] = useState<number | null>(null);
  const patients = useClinic((s) => s.patients);
  const appointments = useClinic((s) => s.appointments);
  const updateAppointment = useClinic((s) => s.updateAppointment);

  const byId = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);
  const day = useMemo(
    () => appointments.filter((a) => a.date === date && live(a)).sort((a, b) => (a.startTime < b.startTime ? -1 : 1)),
    [appointments, date],
  );

  /** نطاق العرض: 9 → 20 على الأقل، ويتّسع لأي موعد خارجه */
  const [rangeStart, rangeEnd] = useMemo(() => {
    let s = 9 * 60;
    let e = 20 * 60;
    for (const a of day) {
      s = Math.min(s, Math.floor(toMinutes(a.startTime) / 60) * 60);
      e = Math.max(e, Math.ceil((toMinutes(a.startTime) + a.durationMin) / 60) * 60);
    }
    return [s, Math.min(e, 24 * 60)];
  }, [day]);
  const slots = Math.ceil((rangeEnd - rangeStart) / STEP);
  const yOf = (min: number) => ((min - rangeStart) / STEP) * SLOT_H;

  const week = useMemo(() => {
    const start = addDays(date, -fromISO(date).getDay());
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [date]);

  const clashes = (from: number, dur: number, ignoreId: string) =>
    day.some((a) => {
      if (a.id === ignoreId) return false;
      const s = toMinutes(a.startTime);
      return from < s + a.durationMin && s < from + dur;
    });

  const commit = (id: string, newStart: number) => {
    const a = day.find((x) => x.id === id);
    if (!a) return;
    if (clashes(newStart, a.durationMin, id)) {
      Alert.alert("الوقت محجوز", "يتقاطع هذا الوقت مع موعد آخر.");
      return;
    }
    updateAppointment(id, { startTime: minutesToTime(newStart) });
  };

  const isFree = (t: number) => !day.some((a) => toMinutes(a.startTime) < t + STEP && t < toMinutes(a.startTime) + a.durationMin);
  const today = toISO(new Date());

  return (
    <PlannerShell
      title="جدول العيادة"
     
      back
      right={
        <Pressable
          onPress={() => router.push("/calendar" as never)}
          hitSlop={8}
          accessibilityLabel="التقويم الكامل"
          style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="calendar" size={24} color={PL.navy} />
        </Pressable>
      }
      scroll={false}
      maxWidth={1200}
    >
      <View style={{ flex: 1, flexDirection: "row", gap: 16 }}>
      <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Pressable onPress={() => setDate(addDays(date, 1))} hitSlop={8}>
          <Ionicons name="chevron-forward" size={22} color={PL.navy} />
        </Pressable>
        <Pressable onPress={() => setDate(today)} style={{ flex: 1, backgroundColor: PL.card, borderRadius: 999, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: PL.border }}>
          <Text w="semi" style={{ color: PL.navy, fontSize: 13.5 }}>
            {fmtDateFull(date)}
          </Text>
        </Pressable>
        <Pressable onPress={() => setDate(addDays(date, -1))} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={PL.navy} />
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>
        {week.map((d) => {
          const on = d === date;
          const count = appointments.filter((a) => a.date === d && live(a)).length;
          return (
            <Pressable
              key={d}
              onPress={() => setDate(d)}
              style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 16, backgroundColor: on ? PL.navy : PL.card, borderWidth: 1, borderColor: on ? PL.navy : PL.border }}
            >
              <Text style={{ fontSize: 10.5, color: on ? "#fff" : PL.muted }}>{DAY_NAMES[fromISO(d).getDay()]}</Text>
              <Text w="bold" style={{ fontSize: 16, color: on ? "#fff" : PL.navy }}>
                {fromISO(d).getDate()}
              </Text>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: count ? (on ? "#fff" : PL.blue) : "transparent" }} />
            </Pressable>
          );
        })}
      </View>

      <WaitlistBanner day={date} />

      <View style={{ height: 34, justifyContent: "center", marginBottom: 4 }}>
        {hover !== null ? (
          <View style={{ alignSelf: "center", backgroundColor: PL.navy, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 5 }}>
            <Text w="bold" style={{ color: "#fff", fontSize: 13 }}>
              الوقت الجديد: {fmtTime(minutesToTime(hover))}
            </Text>
          </View>
        ) : (
          <Text style={{ textAlign: "center", fontSize: 11.5, color: PL.muted }}>اضغط مطوّلًا على موعد ثم اسحبه لتغيير وقته</Text>
        )}
      </View>

      <ScrollView scrollEnabled={scrollOn} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ height: slots * SLOT_H }}>
          {Array.from({ length: slots }, (_, i) => {
            const t = rangeStart + i * STEP;
            return (
              <View key={t} style={{ position: "absolute", top: i * SLOT_H, start: 0, end: 0, height: SLOT_H, flexDirection: "row" }}>
                <Text w="semi" style={{ width: LABEL_W, fontSize: 12, color: PL.navySoft, paddingTop: 4 }}>
                  {fmtTime(minutesToTime(t))}
                </Text>
                <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: PL.border, paddingTop: 4, paddingBottom: 4 }}>
                  {isFree(t) ? (
                    <Pressable
                      onPress={() => router.push({ pathname: "/clinic/appointment-form", params: { date, startTime: minutesToTime(t) } } as never)}
                      style={{ flex: 1, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", borderColor: PL.border, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}
                    >
                      <Ionicons name="add" size={16} color={PL.blueSoft} />
                      <Text w="semi" style={{ fontSize: 12, color: PL.blueSoft }}>
                        موعد جديد
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
          {day.map((a) => {
            const p = byId.get(a.patientId);
            return (
              <DraggableCard
                key={a.id}
                appt={a}
                patient={p}
                top={yOf(toMinutes(a.startTime)) + 4}
                height={Math.max(44, (a.durationMin / STEP) * SLOT_H - 8)}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                onOpen={() => {
                  if (!p) return;
                  if (isWide) setSelPatient(p.id);
                  else router.push({ pathname: "/planner/patient/[id]", params: { id: p.id } } as never);
                }}
                onLock={(l) => setScrollOn(!l)}
                onHover={setHover}
                onCommit={commit}
              />
            );
          })}
        </View>
      </ScrollView>
      </View>
      {isWide ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {selPatient ? (
            <PatientPanel id={selPatient} />
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 60 }}>
              <Ionicons name="hand-left-outline" size={34} color={PL.blueSoft} />
              <Text w="semi" style={{ color: PL.muted, marginTop: 8 }}>
                اضغط على موعد لعرض تفاصيل مريضه هنا
              </Text>
            </View>
          )}
        </ScrollView>
      ) : null}
      </View>
    </PlannerShell>
  );
}
