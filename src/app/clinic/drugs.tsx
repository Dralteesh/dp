import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Field, FieldRow } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { useTheme } from "@/hooks/useTheme";
import { DRUG_FORMS, dosageText, parseNum } from "@/lib/dosage";
import { useClinic } from "@/store/useClinic";
import type { Drug, DrugForm } from "@/types";

/** دليل الأدوية: الدواء + الجرعة + المرات + الشكل، ويولّد نص الجرعة للوصفة */
export default function DrugsScreen() {
  useTheme();
  const drugs = useClinic((s) => s.drugs);
  const addDrug = useClinic((s) => s.addDrug);
  const updateDrug = useClinic((s) => s.updateDrug);
  const removeDrug = useClinic((s) => s.removeDrug);

  const [editing, setEditing] = useState<{ open: boolean; drug?: Drug }>({ open: false });
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [times, setTimes] = useState("3");
  const [units, setUnits] = useState("1");
  const [form, setForm] = useState<DrugForm>("tablet");
  const [notes, setNotes] = useState("");

  const green = TYPE_META.private.hex;

  const open = (d?: Drug) => {
    setName(d?.name ?? "");
    setDose(d?.doseMg ? String(d.doseMg) : "");
    setTimes(String(d?.timesPerDay ?? 3));
    setUnits(String(d?.unitsPerTime ?? 1));
    setForm(d?.form ?? "tablet");
    setNotes(d?.notes ?? "");
    setEditing({ open: true, drug: d });
  };

  const draft = {
    name: name.trim(),
    doseMg: parseNum(dose),
    timesPerDay: Math.min(12, Math.max(1, Math.round(parseNum(times) ?? 3))),
    unitsPerTime: Math.max(0.25, parseNum(units) ?? 1),
    form,
    notes: notes.trim() || undefined,
  };

  const save = () => {
    if (!draft.name) {
      Alert.alert("اسم الدواء مطلوب");
      return;
    }
    if (editing.drug) updateDrug(editing.drug.id, draft);
    else addDrug(draft);
    setEditing({ open: false });
  };

  return (
    <Screen title="دليل الأدوية" subtitle="للوصفات: اختر دواءً فتُملأ الجرعة تلقائيًا" back overlay={<Fab onPress={() => open()} color={green} bottom={20} />}>
      {drugs.length === 0 ? (
        <EmptyState icon="medkit-outline" title="لا أدوية بعد" hint="اضغط + لإضافة أول دواء (مثلًا أموكسيسيلين 500 ملغ)" />
      ) : (
        drugs.map((d) => (
          <Pressable key={d.id} onPress={() => open(d)}>
            <Card className={`mb-2.5 ${d.active ? "" : "opacity-50"}`}>
              <View className="flex-row items-center gap-3">
                <View className="flex-1">
                  <Text w="bold">{d.name}</Text>
                  <Text className="text-sm text-muted">{dosageText(d)}</Text>
                </View>
                <Ionicons name="chevron-back" size={18} color="#94A3B8" />
              </View>
            </Card>
          </Pressable>
        ))
      )}

      <Sheet visible={editing.open} onClose={() => setEditing({ open: false })} title={editing.drug ? "تعديل دواء" : "دواء جديد"}>
        <Field label="اسم الدواء" value={name} onChangeText={setName} placeholder="أموكسيسيلين" />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="الجرعة (ملغ)" value={dose} onChangeText={setDose} keyboardType="decimal-pad" placeholder="500" />
          </View>
          <View className="flex-1">
            <Field label="المرات يوميًا" value={times} onChangeText={setTimes} keyboardType="number-pad" />
          </View>
          <View className="flex-1">
            <Field label="الوحدات/مرة" value={units} onChangeText={setUnits} keyboardType="decimal-pad" />
          </View>
        </View>
        <FieldRow label="الشكل">
          <View className="flex-row flex-wrap gap-2">
            {(Object.keys(DRUG_FORMS) as DrugForm[]).map((k) => (
              <Chip key={k} label={DRUG_FORMS[k]} selected={form === k} color={green} onPress={() => setForm(k)} />
            ))}
          </View>
        </FieldRow>
        <Field label="ملاحظة (مثلًا: بعد الأكل)" value={notes} onChangeText={setNotes} />
        <Card className="mb-3 bg-slate-50">
          <Text className="text-xs text-muted">المعاينة</Text>
          <Text w="semi">{draft.name || "—"}</Text>
          <Text className="text-sm">{dosageText(draft)}</Text>
        </Card>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button label="حفظ" icon="checkmark" type="private" onPress={save} />
          </View>
          {editing.drug ? (
            <>
              <Button
                label={editing.drug.active ? "تعطيل" : "تفعيل"}
                variant="soft"
                onPress={() => {
                  updateDrug(editing.drug!.id, { active: !editing.drug!.active });
                  setEditing({ open: false });
                }}
              />
              <Button
                label="حذف"
                variant="danger"
                icon="trash-outline"
                onPress={() =>
                  Alert.alert("حذف الدواء", "يُحذف من الدليل فقط، ولا تتأثر الوصفات السابقة.", [
                    { text: "إلغاء", style: "cancel" },
                    {
                      text: "حذف",
                      style: "destructive",
                      onPress: () => {
                        removeDrug(editing.drug!.id);
                        setEditing({ open: false });
                      },
                    },
                  ])
                }
              />
            </>
          ) : null}
        </View>
      </Sheet>
    </Screen>
  );
}
