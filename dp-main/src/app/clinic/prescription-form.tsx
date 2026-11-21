import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DateField } from "@/components/pickers";
import { WarningLines } from "@/components/clinic/MedicalAlertBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Field, FieldRow } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { useTheme } from "@/hooks/useTheme";
import { todayISO } from "@/lib/dates";
import { drugWarnings, patientFlags } from "@/lib/alerts";
import { dosageText } from "@/lib/dosage";
import { useClinic } from "@/store/useClinic";
import type { PrescriptionLine } from "@/types";

/** وصفة جديدة: أدوية من الدليل أو إدخال حر، بعدة أسطر */
export default function PrescriptionForm() {
  useTheme();
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const patient = useClinic((s) => s.patients.find((p) => p.id === patientId));
  const drugs = useClinic((s) => s.drugs.filter((d) => d.active));
  const addPrescription = useClinic((s) => s.addPrescription);

  const [date, setDate] = useState(todayISO());
  const [lines, setLines] = useState<PrescriptionLine[]>([]);
  const [notes, setNotes] = useState("");

  if (!patient) {
    return (
      <Screen title="وصفة" back>
        <Text>المريض غير موجود.</Text>
      </Screen>
    );
  }

  const setLine = (i: number, patch: Partial<PrescriptionLine>) =>
    setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)));

  const save = () => {
    const clean = lines.map((l) => ({ drug: l.drug.trim(), dosage: l.dosage.trim() })).filter((l) => l.drug);
    if (clean.length === 0) {
      Alert.alert("أضف دواءً واحدًا على الأقل");
      return;
    }
    addPrescription({ patientId: patient.id, date, lines: clean, notes: notes.trim() || undefined });
    router.back();
  };

  const green = TYPE_META.private.hex;
  const flags = patientFlags(patient);
  const warnings: string[] = Array.from(new Set<string>(lines.flatMap((l) => drugWarnings(flags, l.drug))));

  return (
    <Screen title="وصفة جديدة" subtitle={patient.name} back>
      <DateField label="التاريخ" value={date} onChange={setDate} />
      <WarningLines lines={warnings} />

      {drugs.length > 0 ? (
        <FieldRow label="من دليل الأدوية (اضغط للإضافة)">
          <View className="flex-row flex-wrap gap-2">
            {drugs.map((d) => (
              <Chip
                key={d.id}
                label={d.name}
                selected={false}
                color={green}
                onPress={() => setLines((ls) => [...ls, { drug: d.name, dosage: dosageText(d) }])}
              />
            ))}
          </View>
        </FieldRow>
      ) : (
        <Text className="text-xs text-muted mb-3">يمكنك تجهيز أدوية متكررة من «دليل الأدوية» في شاشة العيادة.</Text>
      )}

      {lines.map((l, i) => (
        <Card key={i} className="mb-2.5">
          <View className="flex-row items-center justify-between mb-1">
            <Text w="semi" className="text-xs text-muted">
              دواء {i + 1}
            </Text>
            <Pressable hitSlop={10} onPress={() => setLines((ls) => ls.filter((_, k) => k !== i))}>
              <Ionicons name="close-circle" size={20} color="#DC2626" />
            </Pressable>
          </View>
          <Field label="الدواء" value={l.drug} onChangeText={(v) => setLine(i, { drug: v })} />
          <Field label="الجرعة" value={l.dosage} onChangeText={(v) => setLine(i, { dosage: v })} placeholder="حبة × 3 مرات يوميًا" />
        </Card>
      ))}

      <Button
        label="إضافة دواء يدويًا"
        icon="add"
        variant="outline"
        onPress={() => setLines((ls) => [...ls, { drug: "", dosage: "" }])}
      />

      <View className="mt-3">
        <Field label="تعليمات إضافية" value={notes} onChangeText={setNotes} multiline placeholder="مثال: غسول بعد الوجبات" />
      </View>
      <Button label="حفظ الوصفة" icon="checkmark" type="private" onPress={save} />
    </Screen>
  );
}
