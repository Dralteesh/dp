import { useTheme } from "@/hooks/useTheme";
import { TYPE_META } from "@/constants/shiftTypes";
import { useState } from "react";
import { Alert, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AlertFlagPicker } from "@/components/clinic/AlertFlagPicker";
import { DictateField } from "@/components/DictateField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Field, FieldRow } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { toWesternDigits } from "@/lib/format";
import type { AlertFlag } from "@/types";
import { useClinic } from "@/store/useClinic";


export default function PatientFormScreen() {
  useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const patients = useClinic((s) => s.patients);
  const addPatient = useClinic((s) => s.addPatient);
  const updatePatient = useClinic((s) => s.updatePatient);

  const existing = id ? patients.find((p) => p.id === id) : undefined;

  const [name, setName] = useState(existing?.name ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [gender, setGender] = useState<"male" | "female" | undefined>(existing?.gender);
  const [birthYear, setBirthYear] = useState(existing?.birthYear ? String(existing.birthYear) : "");
  const [status, setStatus] = useState<"active" | "finished">(existing?.status ?? "active");
  const [alerts, setAlerts] = useState(existing?.medicalAlerts ?? "");
  const [flags, setFlags] = useState<AlertFlag[]>(existing?.alertFlags ?? []);
  const [notes, setNotes] = useState(existing?.notes ?? "");

  const save = () => {
    const n = name.trim();
    if (!n) {
      Alert.alert("الاسم مطلوب", "اكتب اسم المريض.");
      return;
    }
    const year = Number(toWesternDigits(birthYear));
    const payload = {
      name: n,
      phone: phone.trim() || undefined,
      gender,
      birthYear: year >= 1900 && year <= new Date().getFullYear() ? year : undefined,
      status,
      medicalAlerts: alerts.trim() || undefined,
      alertFlags: flags.length ? flags : undefined,
      notes: notes.trim() || undefined,
    };
    if (existing) {
      updatePatient(existing.id, payload);
      router.back();
    } else {
      const newId = addPatient(payload);
      router.replace({ pathname: "/clinic/patient/[id]", params: { id: newId } });
    }
  };

  return (
    <Screen title={existing ? "تعديل المريض" : "مريض جديد"} back>
      <Card accent="private">
        <Field label="الاسم" value={name} onChangeText={setName} placeholder="اسم المريض" autoFocus={!existing} />
        <Field
          label="الهاتف"
          value={phone}
          onChangeText={setPhone}
          placeholder="09xxxxxxxx"
          keyboardType="phone-pad"
          hint="يُستعمل للاتصال وتذكير واتساب"
        />
        <FieldRow label="الجنس">
          <View className="flex-row gap-2">
            <Chip label="ذكر" selected={gender === "male"} color={TYPE_META.private.hex} onPress={() => setGender(gender === "male" ? undefined : "male")} />
            <Chip label="أنثى" selected={gender === "female"} color={TYPE_META.private.hex} onPress={() => setGender(gender === "female" ? undefined : "female")} />
          </View>
        </FieldRow>
        <Field label="سنة الميلاد" value={birthYear} onChangeText={setBirthYear} placeholder="1990" keyboardType="number-pad" maxLength={4} />
        <FieldRow label="حالة العلاج">
          <View className="flex-row gap-2">
            <Chip label="قيد المعالجة" selected={status === "active"} color={TYPE_META.private.hex} onPress={() => setStatus("active")} />
            <Chip label="أنهى العلاج" selected={status === "finished"} color="#64748B" onPress={() => setStatus("finished")} />
          </View>
        </FieldRow>
      </Card>

      <Card className="mt-3">
        <Field
          label="تنبيهات طبية"
          value={alerts}
          onChangeText={setAlerts}
          placeholder="حساسية، سكري، سيولة دم، حمل..."
          multiline
        />
        <AlertFlagPicker value={flags} onChange={setFlags} />
        <DictateField label="ملاحظات" value={notes} onChangeText={setNotes} placeholder="ملاحظات عامة" multiline />
      </Card>

      <View className="mt-5">
        <Button label="حفظ" icon="checkmark" type="private" onPress={save} />
      </View>
    </Screen>
  );
}
