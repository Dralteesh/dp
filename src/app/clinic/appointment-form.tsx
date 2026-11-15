import { useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DateField, TimeField } from "@/components/pickers";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, FieldRow } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { DURATIONS, PROCEDURES, STATUS_META } from "@/constants/clinic";
import { fmtTime, minutesToTime, toISO, toMinutes } from "@/lib/dates";
import { initial } from "@/lib/format";
import { useClinic } from "@/store/useClinic";
import type { AppointmentStatus } from "@/types";

const GREEN = "#16A34A";

export default function AppointmentFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    patientId?: string;
    date?: string;
    procedure?: string;
  }>();

  const patients = useClinic((s) => s.patients);
  const appointments = useClinic((s) => s.appointments);
  const addAppointment = useClinic((s) => s.addAppointment);
  const updateAppointment = useClinic((s) => s.updateAppointment);
  const removeAppointment = useClinic((s) => s.removeAppointment);

  const existing = params.id ? appointments.find((a) => a.id === params.id) : undefined;

  const [patientId, setPatientId] = useState<string | undefined>(existing?.patientId ?? params.patientId);
  const [date, setDate] = useState(existing?.date ?? params.date ?? toISO(new Date()));
  const [startTime, setStartTime] = useState(existing?.startTime ?? "16:00");
  const [duration, setDuration] = useState(existing?.durationMin ?? 30);
  const [procedure, setProcedure] = useState(existing?.procedure ?? params.procedure ?? "كشف واستشارة");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [status, setStatus] = useState<AppointmentStatus>(existing?.status ?? "scheduled");
  const [pickOpen, setPickOpen] = useState(false);
  const [q, setQ] = useState("");

  const patient = patients.find((p) => p.id === patientId);
  const list = useMemo(
    () => patients.filter((p) => !q.trim() || p.name.includes(q.trim()) || (p.phone ?? "").includes(q.trim())),
    [patients, q],
  );

  const endTime = minutesToTime(toMinutes(startTime) + duration);

  /** تعارض مع موعد آخر في نفس اليوم؟ */
  const findConflict = () => {
    const s = toMinutes(startTime);
    const e = s + duration;
    return appointments.find((a) => {
      if (a.id === existing?.id || a.date !== date) return false;
      if (["cancelled", "postponed", "no_show"].includes(a.status)) return false;
      const as = toMinutes(a.startTime);
      return s < as + a.durationMin && as < e;
    });
  };

  const doSave = () => {
    const payload = {
      patientId: patientId!,
      date,
      startTime,
      durationMin: duration,
      procedure: procedure.trim() || "كشف واستشارة",
      notes: notes.trim() || undefined,
    };
    if (existing) updateAppointment(existing.id, { ...payload, status });
    else addAppointment(payload);
    router.back();
  };

  const save = () => {
    if (!patientId) {
      Alert.alert("اختر المريض", "حدّد المريض صاحب الموعد.");
      return;
    }
    const c = findConflict();
    if (c) {
      const other = patients.find((p) => p.id === c.patientId)?.name ?? "مريض آخر";
      Alert.alert("تعارض في الوقت", `يوجد موعد لـ ${other} الساعة ${fmtTime(c.startTime)}. هل تريد الحجز رغم ذلك؟`, [
        { text: "تعديل الوقت", style: "cancel" },
        { text: "حجز رغم التعارض", onPress: doSave },
      ]);
      return;
    }
    doSave();
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert("حذف الموعد", "هل تريد حذف هذا الموعد؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: () => {
          removeAppointment(existing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen title={existing ? "تعديل الموعد" : "موعد جديد"} subtitle="العيادة الخاصة" back>
      <Card accent="private">
        <FieldRow label="المريض">
          <Pressable
            onPress={() => setPickOpen(true)}
            className="flex-row items-center gap-3 bg-slate-50 border border-line rounded-xl px-3.5 py-3"
          >
            <View className="w-8 h-8 rounded-full bg-private-soft items-center justify-center">
              <Text w="bold" className="text-private-ink">
                {patient ? initial(patient.name) : "؟"}
              </Text>
            </View>
            <Text className="flex-1" w={patient ? "semi" : "regular"} style={{ color: patient ? "#0F172A" : "#94A3B8" }}>
              {patient?.name ?? "اختر مريضًا"}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#94A3B8" />
          </Pressable>
        </FieldRow>
        {patient?.medicalAlerts ? (
          <View className="flex-row items-center gap-2 bg-red-50 rounded-xl px-3 py-2 mb-2">
            <Ionicons name="warning" size={16} color="#DC2626" />
            <Text className="flex-1 text-sm text-danger">{patient.medicalAlerts}</Text>
          </View>
        ) : null}
      </Card>

      <Card className="mt-3">
        <DateField label="التاريخ" value={date} onChange={(v) => v && setDate(v)} />
        <TimeField label={`الوقت (ينتهي ${fmtTime(endTime)})`} value={startTime} onChange={setStartTime} />
        <FieldRow label="المدة بالدقائق">
          <View className="flex-row flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <Chip key={d} label={`${d}`} selected={duration === d} color={GREEN} onPress={() => setDuration(d)} />
            ))}
          </View>
        </FieldRow>
      </Card>

      <Card className="mt-3">
        <FieldRow label="الإجراء">
          <View className="flex-row flex-wrap gap-2">
            {PROCEDURES.map((p) => (
              <Chip
                key={p.name}
                label={p.name}
                selected={procedure === p.name}
                color={GREEN}
                onPress={() => {
                  setProcedure(p.name);
                  setDuration(p.minutes);
                }}
              />
            ))}
          </View>
        </FieldRow>
        <Field label="أو اكتب إجراءً آخر" value={procedure} onChangeText={setProcedure} />
        <Field label="ملاحظات" value={notes} onChangeText={setNotes} multiline />
        {existing ? (
          <FieldRow label="الحالة">
            <View className="flex-row flex-wrap gap-2">
              {(Object.keys(STATUS_META) as AppointmentStatus[]).map((s) => (
                <Chip key={s} label={STATUS_META[s].label} selected={status === s} color={STATUS_META[s].hex} onPress={() => setStatus(s)} />
              ))}
            </View>
          </FieldRow>
        ) : null}
      </Card>

      <View className="flex-row gap-3 mt-5">
        <View className="flex-1">
          <Button label="حفظ الموعد" icon="checkmark" type="private" onPress={save} />
        </View>
        {existing ? <Button label="حذف" variant="danger" icon="trash-outline" onPress={confirmDelete} /> : null}
      </View>

      <Sheet visible={pickOpen} onClose={() => setPickOpen(false)} title="اختر المريض">
        <Field value={q} onChangeText={setQ} placeholder="بحث بالاسم أو الهاتف" />
        {list.length === 0 ? (
          <EmptyState icon="people-outline" title="لا يوجد مرضى" hint="أضف مريضًا من شاشة العيادة" />
        ) : (
          list.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => {
                setPatientId(p.id);
                setPickOpen(false);
              }}
              className="flex-row items-center gap-3 py-2.5 border-b border-line"
            >
              <View className="w-9 h-9 rounded-full bg-private-soft items-center justify-center">
                <Text w="bold" className="text-private-ink">
                  {initial(p.name)}
                </Text>
              </View>
              <Text w="semi" className="flex-1">
                {p.name}
              </Text>
              {patientId === p.id ? <Ionicons name="checkmark-circle" size={20} color={GREEN} /> : null}
            </Pressable>
          ))
        )}
      </Sheet>
    </Screen>
  );
}
