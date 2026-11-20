import { useMemo, useState } from "react";
import { View } from "react-native";
import { Chip } from "@/components/ui/Chip";
import { Field, FieldRow } from "@/components/ui/Field";
import { TYPE_META } from "@/constants/shiftTypes";
import { useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";
import type { Appointment } from "@/types";

/** قائمة الأطباء: اسم الطبيب في الإعدادات + كل ما سُجّل سابقًا في المواعيد */
export function useDoctors(appointments: Appointment[]): string[] {
  const me = useSettings((s) => s.doctorName);
  return useMemo(() => {
    const set = new Set<string>();
    if (me?.trim()) set.add(me.trim());
    for (const a of appointments) if (a.doctor?.trim()) set.add(a.doctor.trim());
    return [...set];
  }, [appointments, me]);
}

/** فلتر أطباء أعلى جدول اليوم. لا يظهر إلا إن وُجد طبيبان فأكثر */
export function DoctorFilter({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const appointments = useClinic((s) => s.appointments);
  const doctors = useDoctors(appointments);
  if (doctors.length < 2) return null;
  const hex = TYPE_META.private.hex;
  return (
    <View className="flex-row flex-wrap gap-2 mb-3">
      <Chip label="كل الأطباء" selected={value === null} color={hex} onPress={() => onChange(null)} />
      {doctors.map((d) => (
        <Chip key={d} label={d} selected={value === d} color={hex} onPress={() => onChange(d)} />
      ))}
    </View>
  );
}

/** اختيار الطبيب في نموذج الموعد: أسماء سابقة أو كتابة اسم جديد */
export function DoctorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const appointments = useClinic((s) => s.appointments);
  const doctors = useDoctors(appointments);
  const [typing, setTyping] = useState(false);
  const hex = TYPE_META.private.hex;
  return (
    <>
      <FieldRow label="الطبيب (اختياري)">
        <View className="flex-row flex-wrap gap-2">
          {doctors.map((d) => (
            <Chip key={d} label={d} selected={value === d} color={hex} onPress={() => onChange(value === d ? "" : d)} />
          ))}
          <Chip label={typing ? "إخفاء" : "+ طبيب آخر"} selected={false} color="#64748B" onPress={() => setTyping((t) => !t)} />
        </View>
      </FieldRow>
      {typing ? <Field label="اسم الطبيب" value={value} onChangeText={onChange} /> : null}
    </>
  );
}
