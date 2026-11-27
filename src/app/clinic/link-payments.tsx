import { useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { useTheme } from "@/hooks/useTheme";
import { fmtDateShort } from "@/lib/dates";
import { fmtMoney } from "@/lib/format";
import { useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";
import type { Payment, TreatmentPlan } from "@/types";

/** الخطة المقترحة لدفعة: أحدث خطة أُنشئت قبل تاريخ الدفعة، وإلا أقدم خطة للمريض */
function suggestPlan(pay: Payment, plans: TreatmentPlan[]): string | undefined {
  const mine = plans.filter((p) => p.patientId === pay.patientId).sort((a, b) => a.createdAt - b.createdAt);
  if (!mine.length) return undefined;
  const at = new Date(`${pay.date}T23:59:59`).getTime();
  const before = mine.filter((p) => p.createdAt <= at);
  return (before.length ? before[before.length - 1] : mine[0]).id;
}

/** الدفعات القديمة بلا خطة: اقتراح خطة لكل دفعة وتطبيقها فرديًا أو دفعة واحدة */
export default function LinkPaymentsScreen() {
  useTheme();
  const green = TYPE_META.private.hex;
  const currency = useSettings((s) => s.currency);
  const payments = useClinic((s) => s.payments);
  const plans = useClinic((s) => s.plans);
  const patients = useClinic((s) => s.patients);
  const updatePayment = useClinic((s) => s.updatePayment);
  const byId = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);

  const planIds = useMemo(() => new Set(plans.map((p) => p.id)), [plans]);
  // دفعات بلا خطة (أو خطتها محذوفة) لمرضى لديهم خطط
  const loose = useMemo(() => payments.filter((p) => !p.refund && (!p.planId || !planIds.has(p.planId)) && plans.some((x) => x.patientId === p.patientId)), [payments, plans, planIds]);
  // اختيار المستخدم يتقدّم على المقترح
  const [choice, setChoice] = useState<Record<string, string | undefined>>({});
  const pick = (p: Payment) => (p.id in choice ? choice[p.id] : suggestPlan(p, plans));

  const applyAll = () => {
    let n = 0;
    for (const p of loose) {
      const id = pick(p);
      if (id) {
        updatePayment(p.id, { planId: id });
        n++;
      }
    }
    Alert.alert("تم", `رُبطت ${n} دفعة بخططها.`);
  };

  return (
    <Screen title="ربط الدفعات بالخطط" subtitle={`${loose.length} دفعة بلا خطة`} back>
      {loose.length === 0 ? (
        <EmptyState icon="checkmark-done-outline" title="كل الدفعات مربوطة" hint="لا دفعات عامة لمرضى لديهم خطط علاج" />
      ) : (
        <>
          <Text className="text-xs text-muted mb-3 leading-5">لكل دفعة خطة مقترحة (أحدث خطة قبل تاريخ الدفعة). غيّرها إن لزم ثم اضغط «ربط»، أو طبّق المقترحات كلها.</Text>
          <Button label="تطبيق كل المقترحات" icon="git-merge-outline" type="private" onPress={applyAll} />
          <View className="mt-3">
            {loose.map((p) => {
              const mine = plans.filter((x) => x.patientId === p.patientId);
              const sel = pick(p);
              return (
                <Card key={p.id} className="mb-2">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pe-2">
                      <Text w="semi" numberOfLines={1}>{byId.get(p.patientId)?.name ?? "مريض"}</Text>
                      <Text className="text-xs text-muted">
                        {fmtDateShort(p.date)}
                        {p.note ? ` • ${p.note}` : ""}
                      </Text>
                    </View>
                    <Text w="bold" style={{ color: "#16A34A" }}>+{fmtMoney(p.amount, currency)}</Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2 mt-2">
                    {mine.map((x) => (
                      <Chip key={x.id} label={x.title} selected={sel === x.id} color={green} onPress={() => setChoice((c) => ({ ...c, [p.id]: x.id }))} />
                    ))}
                  </View>
                  <View className="mt-2 self-start">
                    <Button small label="ربط" icon="link-outline" variant="soft" type="private" disabled={!sel} onPress={() => sel && updatePayment(p.id, { planId: sel })} />
                  </View>
                </Card>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}
