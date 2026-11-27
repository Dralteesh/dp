import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MoneyField, useMoneyInput } from "@/components/MoneyField";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { itemTeeth } from "@/lib/clinicLink";
import { itemNet, patientPlanFinance } from "@/lib/planFinance";
import { Chip } from "@/components/ui/Chip";
import { fmtDateShort } from "@/lib/dates";
import { fmtMoney } from "@/lib/format";
import { completeVisit, proposalsFor, type NextProposal } from "@/lib/visitFlow";
import { patientBalance, useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";

const pKey = (p: NextProposal) => `${p.step.label}|${p.teeth.join(",")}`;

/**
 * ورقة «إنهاء الزيارة»: تنجز بنود الخطة المرتبطة (جلسة لكل بند)، وتسجّل الدفعة،
 * وتقترح المرحلة التالية من مسار العلاج بتاريخ مستهدف. تُستعمل من العيادة واليوم وملف المريض.
 */
export function VisitSheet({ apptId, onClose }: { apptId: string | null; onClose: () => void }) {
  const green = TYPE_META.private.hex;
  const currency = useSettings((s) => s.currency);
  const appt = useClinic((s) => s.appointments.find((a) => a.id === apptId));
  const plans = useClinic((s) => s.plans);
  const sessions = useClinic((s) => s.sessions);
  const payments = useClinic((s) => s.payments);
  const patient = useClinic((s) => s.patients.find((p) => p.id === appt?.patientId));
  const money = useMoneyInput();
  const expenses = useClinic((s) => s.expenses);

  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  // البنود المفتوحة: المرتبطة بالموعد أولًا ثم بقية بنود المريض
  const { linkedOpen, otherOpen } = useMemo(() => {
    const linked = new Set(appt?.planItemIds ?? []);
    const lo: { id: string; label: string; cost: number }[] = [];
    const oo: { id: string; label: string; cost: number }[] = [];
    for (const pl of plans) {
      if (pl.patientId !== appt?.patientId) continue;
      for (const it of pl.items) {
        if (it.done) continue;
        const t = itemTeeth(it);
        const row = { id: it.id, label: `${it.procedure}${t.length ? ` • سن ${t.join("،")}` : ""}`, cost: itemNet(it) };
        (linked.has(it.id) ? lo : oo).push(row);
      }
    }
    return { linkedOpen: lo, otherOpen: oo };
  }, [plans, appt?.planItemIds, appt?.patientId]);

  useEffect(() => {
    if (!apptId) return;
    setChecked(new Set(linkedOpen.map((x) => x.id)));
    money.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apptId]);

  const date = appt?.date ?? "";
  const proposals = useMemo(() => (apptId ? proposalsFor([...checked], date) : []), [checked, date, apptId, plans]);
  useEffect(() => {
    setAccepted(new Set(proposals.map(pKey)));
  }, [proposals]);

  if (!appt || !patient) return <Sheet visible={false} onClose={onClose}>{null}</Sheet>;

  const bal = patientBalance(patient.id, sessions, payments);
  const all = [...linkedOpen, ...otherOpen];
  const chargeNow = all.filter((x) => checked.has(x.id)).reduce((a, x) => a + x.cost, 0);
  const afterBalance = bal.balance + chargeNow - (money.text.trim() ? money.value || 0 : 0);

  // الخطة التي ستُسجَّل عليها الدفعة: خطة أول بند منجز في هذه الزيارة، وإلا الخطة ذات المتبقي الأكبر
  const fin = patientPlanFinance(plans, payments, expenses, patient.id);
  const firstId = all.find((x) => checked.has(x.id))?.id;
  const planOfFirst = firstId ? fin.plans.find((f) => f.plan.items.some((i) => i.id === firstId)) : undefined;
  const target = planOfFirst ?? [...fin.plans].sort((a, b) => b.remaining - a.remaining)[0];
  const suggest = (v: number) => {
    money.setCur("base");
    money.setText(String(Math.max(0, Math.round(v))));
  };

  const toggle = (id: string) =>
    setChecked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const confirm = () => {
    let pay: { amount: number; foreign?: import("@/types").ForeignAmount } | undefined;
    if (money.text.trim()) {
      const r = money.result();
      if (!r) return Alert.alert("المبلغ غير صالح", money.cur === "usd" ? "اكتب مبلغًا وسعر الدولار." : "اكتب مبلغًا أكبر من صفر.");
      pay = r;
    }
    completeVisit(appt.id, { itemIds: [...checked], payment: pay, paymentPlanId: pay ? target?.plan.id : undefined, accept: proposals.filter((p) => accepted.has(pKey(p))) });
    onClose();
  };

  const row = (x: { id: string; label: string; cost: number }) => (
    <Pressable key={x.id} onPress={() => toggle(x.id)} className="flex-row items-center gap-3 py-2 border-t border-line">
      <Ionicons name={checked.has(x.id) ? "checkbox" : "square-outline"} size={22} color={checked.has(x.id) ? green : "#94A3B8"} />
      <Text w="semi" className="flex-1">
        {x.label}
      </Text>
      <Text className="text-sm text-muted">{fmtMoney(x.cost, currency)}</Text>
    </Pressable>
  );

  return (
    <Sheet visible={!!apptId} onClose={onClose} title="إنهاء الزيارة">
      <Text w="bold">{patient.name}</Text>
      <Text className="text-xs text-muted mb-2">
        {fmtDateShort(appt.date)} • {appt.procedure}
        {appt.teeth?.length ? ` • أسنان ${appt.teeth.join("،")}` : ""}
      </Text>

      {all.length ? (
        <View className="mb-2">
          <Text w="semi" className="text-sm mb-1">
            ما أُنجز في هذه الزيارة
          </Text>
          {linkedOpen.map(row)}
          {otherOpen.length ? (
            <Text className="text-xs text-muted mt-2">بنود أخرى مفتوحة في خطته:</Text>
          ) : null}
          {otherOpen.map(row)}
        </View>
      ) : (
        <Text className="text-sm text-muted mb-2">لا بنود مفتوحة في خطة المريض؛ سيُغلق الموعد فقط.</Text>
      )}

      {proposals.length ? (
        <View className="mb-2">
          <Text w="semi" className="text-sm mb-1">
            المرحلة التالية (تظهر في «يحتاجون موعدًا»)
          </Text>
          {proposals.map((p) => {
            const on = accepted.has(pKey(p));
            return (
              <Pressable
                key={pKey(p)}
                onPress={() =>
                  setAccepted((s) => {
                    const n = new Set(s);
                    if (n.has(pKey(p))) n.delete(pKey(p));
                    else n.add(pKey(p));
                    return n;
                  })
                }
                className="flex-row items-center gap-3 py-2 border-t border-line"
              >
                <Ionicons name={on ? "checkbox" : "square-outline"} size={22} color={on ? green : "#94A3B8"} />
                <View className="flex-1">
                  <Text w="semi">
                    {p.step.label}
                    {p.teeth.length ? ` • سن ${p.teeth.join("،")}` : ""}
                  </Text>
                  <Text className="text-xs text-muted">بتاريخ مستهدف {fmtDateShort(p.step.dueOn)}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <MoneyField label="المقبوض الآن (اختياري)" m={money} />
      {chargeNow > 0 || (target && target.remaining > 0) ? (
        <View className="flex-row flex-wrap gap-2 mb-2">
          {chargeNow > 0 ? <Chip label={`كلفة الزيارة ${fmtMoney(chargeNow, currency)}`} onPress={() => suggest(chargeNow)} /> : null}
          {target && target.remaining > 0 ? <Chip label={`متبقي «${target.plan.title}» ${fmtMoney(target.remaining, currency)}`} color={green} onPress={() => suggest(target.remaining)} /> : null}
        </View>
      ) : null}
      {target && money.text.trim() ? <Text className="text-xs text-muted mb-1">تُسجَّل الدفعة على الخطة: {target.plan.title}</Text> : null}
      <Text className="text-xs text-muted mb-3">
        الرصيد الحالي {fmtMoney(bal.balance, currency)} • بعد الزيارة {fmtMoney(afterBalance, currency)}
      </Text>
      <Button label="إنهاء الزيارة" icon="checkmark-done" type="private" onPress={confirm} />
    </Sheet>
  );
}

/** هل يلزم عرض الورقة؟ (بنود مرتبطة أو إعدادات نوع) وإلا يكفي تغيير الحالة مباشرة */
export function visitNeedsSheet(a: { planItemIds?: string[]; extra?: object; visitDone?: boolean }): boolean {
  if (a.visitDone) return false;
  return !!(a.planItemIds?.length || (a.extra && Object.keys(a.extra).length));
}
