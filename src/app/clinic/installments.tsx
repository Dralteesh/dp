import { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DateField } from "@/components/pickers";
import { PatientPick } from "@/components/clinic/PatientPick";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Field } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { addDays, fmtDateShort, todayISO } from "@/lib/dates";
import { fmtMoney, parseAmount, toWesternDigits } from "@/lib/format";
import { uid } from "@/lib/id";
import { whatsappLink } from "@/lib/phone";
import { useClinic } from "@/store/useClinic";
import { useExtras } from "@/store/useExtras";
import { useSettings } from "@/store/useSettings";
import type { InstallPlan, InstallmentItem } from "@/types/extras";

/** يقسّم المبلغ إلى n دفعات شهرية؛ الأخيرة تأخذ فرق التقريب */
export function buildItems(total: number, n: number, firstDue: string): InstallmentItem[] {
  const each = Math.floor(total / n);
  const out: InstallmentItem[] = [];
  const d0 = new Date(firstDue + "T12:00:00");
  for (let i = 0; i < n; i++) {
    const d = new Date(d0.getFullYear(), d0.getMonth() + i, d0.getDate(), 12);
    // إن لم يوجد اليوم في الشهر (31 مثلًا) نأخذ آخر يوم فيه
    if (d.getDate() !== d0.getDate()) d.setDate(0);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out.push({ id: uid(), due: iso, amount: i === n - 1 ? total - each * (n - 1) : each });
  }
  return out;
}

/** الأقساط: خطط تقسيط للمريض مع متابعة المتأخر. السداد يسجّل دفعة في حساب المريض تلقائيًا. */
export default function InstallmentsScreen() {
  const params = useLocalSearchParams<{ patientId?: string; planId?: string; amount?: string; title?: string }>();
  const plans = useExtras((s) => s.installPlans);
  const addPlan = useExtras((s) => s.addInstallPlan);
  const updatePlan = useExtras((s) => s.updateInstallPlan);
  const removePlan = useExtras((s) => s.removeInstallPlan);
  const patients = useClinic((s) => s.patients);
  const addPayment = useClinic((s) => s.addPayment);
  const removePayment = useClinic((s) => s.removePayment);
  const currency = useSettings((s) => s.currency);
  const clinicName = useSettings((s) => s.clinicName);
  const green = TYPE_META.private.hex;
  const byId = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);
  const today = todayISO();

  const [open, setOpen] = useState(false);
  const [pid, setPid] = useState<string | undefined>(params.patientId);
  const [title, setTitle] = useState("");
  const [total, setTotal] = useState("");
  const [count, setCount] = useState("3");
  const [first, setFirst] = useState(addDays(today, 30));

  const list = useMemo(
    () =>
      plans
        .filter((p) => !params.patientId || p.patientId === params.patientId)
        .map((p) => ({ p, rest: p.items.filter((i) => !i.paidOn), late: p.items.filter((i) => !i.paidOn && i.due < today) }))
        .sort((a, b) => b.late.length - a.late.length || a.p.createdAt - b.p.createdAt),
    [plans, params.patientId, today],
  );
  // قادمٌ من «تقسيط المتبقي» في خطة علاج: نملأ الخطة الجديدة مسبقًا
  useEffect(() => {
    if (!params.planId) return;
    setTitle(params.title ? `تقسيط: ${params.title}` : "");
    setTotal(params.amount ?? "");
    setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const lateTotal = list.reduce((s, x) => s + x.late.reduce((a, i) => a + i.amount, 0), 0);

  const create = () => {
    const t = parseAmount(toWesternDigits(total));
    const n = Math.round(Number(toWesternDigits(count)));
    if (!pid) return Alert.alert("اختر المريض");
    if (!t || t <= 0) return Alert.alert("المبلغ غير صحيح");
    if (!n || n < 1 || n > 36) return Alert.alert("عدد الدفعات", "اكتب رقمًا بين 1 و36.");
    addPlan({ patientId: pid, title: title.trim() || "تقسيط علاج", items: buildItems(Math.round(t), n, first), treatmentPlanId: params.planId });
    setOpen(false);
    setTitle("");
    setTotal("");
  };

  const pay = (plan: InstallPlan, item: InstallmentItem) => {
    addPayment({ patientId: plan.patientId, date: today, amount: item.amount, note: `قسط: ${plan.title}`, planId: plan.treatmentPlanId });
    // الدفعة الجديدة تُضاف في أول القائمة؛ نربطها بالقسط ليمكن التراجع عنها
    const added = useClinic.getState().payments[0];
    const paymentId = added && added.patientId === plan.patientId && added.amount === item.amount ? added.id : undefined;
    updatePlan(plan.id, { items: plan.items.map((i) => (i.id === item.id ? { ...i, paidOn: today, paymentId } : i)) });
  };
  const unpay = (plan: InstallPlan, item: InstallmentItem) => {
    if (item.paymentId) removePayment(item.paymentId);
    updatePlan(plan.id, { items: plan.items.map((i) => (i.id === item.id ? { ...i, paidOn: undefined, paymentId: undefined } : i)) });
  };

  return (
    <Screen
      title="الأقساط"
      subtitle={lateTotal > 0 ? `متأخر: ${fmtMoney(lateTotal, currency)}` : "لا متأخرات"}
      back
      overlay={<Fab color={green} onPress={() => setOpen(true)} />}
    >
      {list.length === 0 ? (
        <EmptyState icon="calendar-outline" title="لا خطط تقسيط" hint="اضغط + لإنشاء خطة لمريض" />
      ) : (
        list.map(({ p, rest, late }) => {
          const pt = byId.get(p.patientId);
          return (
            <Card key={p.id} accent="private" className="mb-3">
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text w="bold">{pt?.name ?? "مريض محذوف"}</Text>
                  <Text className="text-xs text-muted">
                    {p.title} • متبقٍ {rest.length} من {p.items.length}
                  </Text>
                </View>
                {late.length ? (
                  <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: "#FEE2E2" }}>
                    <Text w="semi" className="text-xs" style={{ color: "#991B1B" }}>
                      {late.length} متأخر
                    </Text>
                  </View>
                ) : null}
              </View>
              <View className="mt-2">
                {p.items.map((i, k) => {
                  const isLate = !i.paidOn && i.due < today;
                  return (
                    <View key={i.id} className="flex-row items-center justify-between py-1.5 border-b border-line">
                      <Text className="text-sm" style={{ color: isLate ? "#991B1B" : undefined }}>
                        {k + 1}. {fmtDateShort(i.due)} • {fmtMoney(i.amount, currency)}
                      </Text>
                      {i.paidOn ? (
                        <Chip label="مسدَّد ✓" onPress={() => Alert.alert("التراجع عن السداد", "سيُحذف الدفع المرتبط من حساب المريض.", [{ text: "إلغاء", style: "cancel" }, { text: "تراجع", style: "destructive", onPress: () => unpay(p, i) }])} />
                      ) : (
                        <Chip label="سدّد" icon="checkmark" color={green} onPress={() => pay(p, i)} />
                      )}
                    </View>
                  );
                })}
              </View>
              <View className="flex-row flex-wrap gap-2 mt-3">
                {late.length && pt?.phone ? (
                  <Chip
                    label="تذكير واتساب"
                    icon="logo-whatsapp"
                    color="#16A34A"
                    onPress={() =>
                      Linking.openURL(
                        whatsappLink(pt.phone!, `السلام عليكم ${pt.name}، تذكير بقسط مستحق بقيمة ${fmtMoney(late.reduce((a, i) => a + i.amount, 0), currency)}${clinicName ? ` لدى ${clinicName}` : ""}. شكرًا لك.`),
                      )
                    }
                  />
                ) : null}
                <Pressable
                  hitSlop={8}
                  className="justify-center"
                  onPress={() =>
                    Alert.alert("حذف الخطة", "تُحذف الخطة فقط، أما الدفعات المسجلة فتبقى في حساب المريض.", [
                      { text: "إلغاء", style: "cancel" },
                      { text: "حذف", style: "destructive", onPress: () => removePlan(p.id) },
                    ])
                  }
                >
                  <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                </Pressable>
              </View>
            </Card>
          );
        })
      )}

      <Sheet visible={open} onClose={() => setOpen(false)} title="خطة تقسيط جديدة">
        <PatientPick value={pid} onChange={setPid} />
        <Field label="العنوان (اختياري)" value={title} onChangeText={setTitle} placeholder="تقسيط تقويم" />
        <Field label={`المبلغ الإجمالي (${currency})`} value={total} onChangeText={setTotal} keyboardType="numeric" />
        <Field label="عدد الدفعات (شهرية)" value={count} onChangeText={setCount} keyboardType="number-pad" />
        <DateField label="تاريخ أول دفعة" value={first} onChange={(v) => setFirst(v ?? first)} />
        <Button label="إنشاء الخطة" icon="checkmark" type="private" onPress={create} />
      </Sheet>
    </Screen>
  );
}
