import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DateField } from "@/components/pickers";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, FieldRow } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { useTheme } from "@/hooks/useTheme";
import { toISO } from "@/lib/dates";
import { fmtMoney, parseAmount } from "@/lib/format";
import { useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";
import { useProcedures } from "@/hooks/useProcedures";

/** خطط علاج المريض: بنود مرتبة بتكلفة، وإنجاز البند يضيف جلسة لحساب المريض */
export default function PlanScreen() {
  const procedures = useProcedures();
  useTheme();
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const currency = useSettings((s) => s.currency);
  const patient = useClinic((s) => s.patients.find((p) => p.id === patientId));
  const allPlans = useClinic((s) => s.plans);
  const plans = allPlans.filter((p) => p.patientId === patientId);
  const addPlan = useClinic((s) => s.addPlan);
  const removePlan = useClinic((s) => s.removePlan);
  const addPlanItem = useClinic((s) => s.addPlanItem);
  const removePlanItem = useClinic((s) => s.removePlanItem);
  const completePlanItem = useClinic((s) => s.completePlanItem);
  const undoPlanItem = useClinic((s) => s.undoPlanItem);

  const [newOpen, setNewOpen] = useState(false);
  const [title, setTitle] = useState("");

  const [itemFor, setItemFor] = useState<string | null>(null);
  const [proc, setProc] = useState("");
  const [tooth, setTooth] = useState("");
  const [cost, setCost] = useState("");

  const [doneFor, setDoneFor] = useState<{ planId: string; itemId: string } | null>(null);
  const [doneDate, setDoneDate] = useState(toISO(new Date()));

  const green = TYPE_META.private.hex;

  if (!patient) {
    return (
      <Screen title="خطة العلاج" back>
        <Text>المريض غير موجود.</Text>
      </Screen>
    );
  }

  const createPlan = () => {
    const id = addPlan(patient.id, title.trim() || "خطة علاج", []);
    setNewOpen(false);
    setTitle("");
    setItemFor(id);
    setProc("");
    setTooth("");
    setCost("");
  };

  const saveItem = () => {
    if (!itemFor) return;
    if (!proc.trim()) return Alert.alert("اكتب الإجراء");
    addPlanItem(itemFor, { procedure: proc.trim(), tooth: tooth.trim() || undefined, cost: parseAmount(cost) });
    setItemFor(null);
  };

  return (
    <Screen title="خطط العلاج" subtitle={patient.name} back>
      <Button label="خطة جديدة" icon="add" type="private" onPress={() => { setTitle(""); setNewOpen(true); }} />

      <View className="mt-3">
        {plans.length === 0 ? (
          <EmptyState icon="clipboard-outline" title="لا خطط" hint="أنشئ خطة وأضف بنودها بتكلفتها التقديرية" />
        ) : (
          plans.map((plan) => {
            const total = plan.items.reduce((a, i) => a + i.cost, 0);
            const done = plan.items.filter((i) => i.done);
            const doneCost = done.reduce((a, i) => a + i.cost, 0);
            const pct = plan.items.length ? Math.round((done.length / plan.items.length) * 100) : 0;
            return (
              <Card key={plan.id} className="mb-4">
                <View className="flex-row items-center justify-between">
                  <Text w="bold" className="flex-1">
                    {plan.title}
                  </Text>
                  <Pressable
                    hitSlop={10}
                    onPress={() =>
                      Alert.alert("حذف الخطة", "تُحذف الخطة فقط، أما الجلسات التي أُنجزت منها فتبقى في حساب المريض.", [
                        { text: "إلغاء", style: "cancel" },
                        { text: "حذف", style: "destructive", onPress: () => removePlan(plan.id) },
                      ])
                    }
                  >
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </Pressable>
                </View>
                <Text className="text-xs text-muted mt-1">
                  {done.length}/{plan.items.length} منجز • الإجمالي {fmtMoney(total, currency)} • المنجز {fmtMoney(doneCost, currency)}
                </Text>
                <View className="h-2 rounded-full bg-slate-100 mt-2 mb-3 overflow-hidden">
                  <View style={{ width: `${pct}%`, height: 8, backgroundColor: green }} />
                </View>

                {plan.items.map((it, n) => (
                  <View key={it.id} className="flex-row items-center gap-3 py-2 border-t border-line">
                    <Pressable
                      onPress={() => {
                        if (it.done) {
                          Alert.alert("التراجع عن الإنجاز", "ستُحذف الجلسة التي أُنشئت لهذا البند من حساب المريض.", [
                            { text: "إلغاء", style: "cancel" },
                            { text: "تراجع", style: "destructive", onPress: () => undoPlanItem(plan.id, it.id) },
                          ]);
                        } else {
                          setDoneDate(toISO(new Date()));
                          setDoneFor({ planId: plan.id, itemId: it.id });
                        }
                      }}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={it.done ? "checkmark-circle" : "ellipse-outline"}
                        size={26}
                        color={it.done ? green : "#94A3B8"}
                      />
                    </Pressable>
                    <View className="flex-1">
                      <Text w="semi" style={{ textDecorationLine: it.done ? "line-through" : "none", opacity: it.done ? 0.6 : 1 }}>
                        {n + 1}. {it.procedure}
                        {it.tooth ? ` • سن ${it.tooth}` : ""}
                      </Text>
                      <Text className="text-xs text-muted">{fmtMoney(it.cost, currency)}</Text>
                    </View>
                    {!it.done ? (
                      <Pressable hitSlop={10} onPress={() => removePlanItem(plan.id, it.id)}>
                        <Ionicons name="close" size={18} color="#94A3B8" />
                      </Pressable>
                    ) : null}
                  </View>
                ))}
                <View className="mt-2">
                  <Button
                    label="إضافة بند"
                    icon="add"
                    variant="soft"
                    small
                    onPress={() => {
                      setItemFor(plan.id);
                      setProc("");
                      setTooth("");
                      setCost("");
                    }}
                  />
                </View>
              </Card>
            );
          })
        )}
      </View>

      <Sheet visible={newOpen} onClose={() => setNewOpen(false)} title="خطة جديدة">
        <Field label="عنوان الخطة" value={title} onChangeText={setTitle} placeholder="مثال: تأهيل الفك العلوي" />
        <Button label="إنشاء وإضافة البنود" icon="arrow-forward" type="private" onPress={createPlan} />
      </Sheet>

      <Sheet visible={!!itemFor} onClose={() => setItemFor(null)} title="بند جديد">
        <FieldRow label="إجراء شائع">
          <View className="flex-row flex-wrap gap-2">
            {procedures.slice(0, 10).map((p) => (
              <Chip key={p.name} label={p.name} selected={proc === p.name} color={green} onPress={() => setProc(p.name)} />
            ))}
          </View>
        </FieldRow>
        <Field label="الإجراء" value={proc} onChangeText={setProc} />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="السن (اختياري)" value={tooth} onChangeText={setTooth} keyboardType="number-pad" />
          </View>
          <View className="flex-1">
            <Field label={`التكلفة (${currency})`} value={cost} onChangeText={setCost} keyboardType="decimal-pad" />
          </View>
        </View>
        <Button label="إضافة" icon="checkmark" type="private" onPress={saveItem} />
      </Sheet>

      <Sheet visible={!!doneFor} onClose={() => setDoneFor(null)} title="إنجاز البند">
        <Text className="text-sm text-muted mb-3">
          سيُضاف هذا البند كجلسة في حساب المريض بتكلفته، ويُحتسب في المستحق.
        </Text>
        <DateField label="تاريخ الجلسة" value={doneDate} onChange={setDoneDate} />
        <Button
          label="تأكيد الإنجاز"
          icon="checkmark-done"
          type="private"
          onPress={() => {
            if (doneFor) completePlanItem(doneFor.planId, doneFor.itemId, doneDate);
            setDoneFor(null);
          }}
        />
      </Sheet>
    </Screen>
  );
}
