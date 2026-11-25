import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { TOOTH_STATUS } from "@/constants/clinic";
import { fmtDateShort, todayISO } from "@/lib/dates";
import { uid } from "@/lib/id";
import { ICD_DENTAL, compareTeeth } from "@/lib/icd";
import { useClinic } from "@/store/useClinic";
import { useExtras } from "@/store/useExtras";
import type { ExamDiagnosis } from "@/types/extras";

const label = (s: string) => (s === "healthy" ? "سليم" : (TOOTH_STATUS as Record<string, { label: string }>)[s]?.label ?? s);

/** الفحوصات: لقطة لحالة الأسنان مع تشخيصات ICD-10، ومقارنة فحصين */
export default function ExamsScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const patient = useClinic((s) => s.patients.find((p) => p.id === patientId));
  const exams = useExtras((s) => s.dentalExams);
  const addExam = useExtras((s) => s.addExam);
  const removeExam = useExtras((s) => s.removeExam);
  const green = TYPE_META.private.hex;

  const [open, setOpen] = useState(false);
  const [dx, setDx] = useState<ExamDiagnosis[]>([]);
  const [tooth, setTooth] = useState("");
  const [q, setQ] = useState("");
  const [notes, setNotes] = useState("");
  const [cmp, setCmp] = useState<string[]>([]);

  if (!patient) return <Screen title="الفحوصات" back><Text className="text-muted">المريض غير موجود.</Text></Screen>;
  const mine = exams.filter((e) => e.patientId === patient.id).sort((a, b) => (a.date < b.date ? 1 : b.date < a.date ? -1 : b.createdAt - a.createdAt));
  const matches = ICD_DENTAL.filter((c) => !q.trim() || c.code.toLowerCase().includes(q.trim().toLowerCase()) || c.label.includes(q.trim())).slice(0, 8);

  const toggleCmp = (id: string) => setCmp((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c.slice(-1), id]));
  const pair = cmp.length === 2 ? cmp.map((id) => mine.find((e) => e.id === id)!).filter(Boolean).sort((a, b) => (a.date <= b.date ? -1 : 1)) : null;
  const diffs = pair && pair.length === 2 ? compareTeeth(pair[0].teeth, pair[1].teeth) : null;

  return (
    <Screen title="الفحوصات والتشخيص" subtitle={patient.name} back>
      <Button
        label="فحص جديد (لقطة الآن)"
        icon="add"
        type="private"
        onPress={() => {
          setDx([]);
          setNotes("");
          setOpen(true);
        }}
      />
      <Text className="text-xs text-muted mt-2">يحفظ الفحص حالة الأسنان الحالية في المخطط مع التشخيصات. اختر فحصين للمقارنة.</Text>

      {diffs && pair ? (
        <Card accent="private" className="mt-3">
          <Text w="bold" className="mb-1">
            التغيّر بين {fmtDateShort(pair[0].date)} و{fmtDateShort(pair[1].date)}
          </Text>
          {diffs.length === 0 ? (
            <Text className="text-muted">لا فرق في حالة الأسنان.</Text>
          ) : (
            diffs.map((d) => (
              <Text key={d.tooth} className="text-sm">
                سن {d.tooth}: {label(d.from)} ← {label(d.to)}
              </Text>
            ))
          )}
        </Card>
      ) : null}

      <View className="mt-3">
        {mine.length === 0 ? (
          <EmptyState icon="clipboard-outline" title="لا فحوصات" hint="سجّل أول فحص بعد تحديث مخطط الأسنان" />
        ) : (
          mine.map((e) => (
            <Card key={e.id} className="mb-2">
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text w="bold">{fmtDateShort(e.date)}</Text>
                  <Text className="text-xs text-muted">{Object.keys(e.teeth).length} أسنان بحالة غير سليمة</Text>
                  {e.diagnoses.map((d) => (
                    <Text key={d.id} className="text-sm mt-0.5">
                      {d.tooth ? `سن ${d.tooth}: ` : ""}
                      {d.label} <Text className="text-xs text-muted">({d.code})</Text>
                    </Text>
                  ))}
                  {e.notes ? <Text className="text-sm text-muted mt-1">{e.notes}</Text> : null}
                </View>
                <Pressable
                  hitSlop={8}
                  onPress={() =>
                    Alert.alert("حذف", "حذف هذا الفحص؟", [
                      { text: "إلغاء", style: "cancel" },
                      { text: "حذف", style: "destructive", onPress: () => removeExam(e.id) },
                    ])
                  }
                >
                  <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                </Pressable>
              </View>
              <View className="flex-row gap-2 mt-3">
                <Chip label={cmp.includes(e.id) ? "مختار للمقارنة ✓" : "قارن"} selected={cmp.includes(e.id)} color={green} onPress={() => toggleCmp(e.id)} />
              </View>
            </Card>
          ))
        )}
      </View>

      <Sheet visible={open} onClose={() => setOpen(false)} title="فحص جديد">
        <Text w="semi" className="mb-1">
          التشخيصات ({dx.length})
        </Text>
        {dx.map((d) => (
          <Pressable key={d.id} onPress={() => setDx((x) => x.filter((y) => y.id !== d.id))} className="flex-row justify-between py-1.5 border-b border-line">
            <Text className="flex-1 text-sm">
              {d.tooth ? `سن ${d.tooth}: ` : ""}
              {d.label} ({d.code})
            </Text>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </Pressable>
        ))}
        <Field label="رقم السن (اختياري)" value={tooth} onChangeText={setTooth} keyboardType="number-pad" maxLength={2} />
        <Field label="ابحث عن تشخيص" value={q} onChangeText={setQ} placeholder="نخر، K02، التهاب لثة..." />
        {matches.map((c) => (
          <Pressable
            key={c.code}
            className="py-2.5 border-b border-line"
            onPress={() => setDx((x) => [...x, { id: uid(), tooth: tooth.trim() || undefined, code: c.code, label: c.label }])}
          >
            <Text className="text-sm">
              {c.label} <Text className="text-xs text-muted">({c.code})</Text>
            </Text>
          </Pressable>
        ))}
        <View className="h-3" />
        <Field label="ملاحظات" value={notes} onChangeText={setNotes} multiline />
        <Button
          label="حفظ الفحص"
          icon="checkmark"
          type="private"
          onPress={() => {
            const teeth: Record<string, string> = {};
            for (const [k, v] of Object.entries(patient.teeth)) teeth[k] = v as string;
            addExam({ patientId: patient.id, date: todayISO(), teeth, diagnoses: dx, notes: notes.trim() || undefined });
            setOpen(false);
          }}
        />
      </Sheet>
    </Screen>
  );
}
