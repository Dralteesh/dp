import { useMemo, useState } from "react";
import { Alert, Linking, View } from "react-native";
import { useRouter } from "expo-router";
import { MoneyField, useMoneyInput } from "@/components/MoneyField";
import { MedicalAlertBar } from "@/components/clinic/MedicalAlertBar";
import { VisitSheet, visitNeedsSheet } from "@/components/clinic/VisitSheet";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { STATUS_META } from "@/constants/clinic";
import { TYPE_META } from "@/constants/shiftTypes";
import { itemTeeth } from "@/lib/clinicLink";
import { fmtTime, toISO, toMinutes } from "@/lib/dates";
import { fmtMoney } from "@/lib/format";
import { patientBalance, useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";

/** شاشة اليوم: مرضى اليوم بالترتيب، لكلٍّ أسنانه وإجراؤه وتنبيهاته ورصيده، وأزرار وصل ← إنهاء ← دفع */
export default function TodayScreen() {
  const router = useRouter();
  const currency = useSettings((s) => s.currency);
  const patients = useClinic((s) => s.patients);
  const appointments = useClinic((s) => s.appointments);
  const plans = useClinic((s) => s.plans);
  const sessions = useClinic((s) => s.sessions);
  const payments = useClinic((s) => s.payments);
  const setStatus = useClinic((s) => s.setAppointmentStatus);
  const addPayment = useClinic((s) => s.addPayment);
  const today = toISO(new Date());
  const green = TYPE_META.private.hex;

  const [visitFor, setVisitFor] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<string | null>(null);
  const money = useMoneyInput();

  const list = useMemo(
    () =>
      appointments
        .filter((a) => a.date === today && a.status !== "cancelled" && a.status !== "postponed")
        .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)),
    [appointments, today],
  );
  const byId = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);
  const costOf = (ids: string[] | undefined) =>
    plans.flatMap((p) => p.items).filter((i) => ids?.includes(i.id) && !i.done).reduce((a, i) => a + i.cost, 0);
  const expected = list.reduce((a, x) => a + costOf(x.planItemIds), 0);
  const doneCount = list.filter((a) => a.status === "done").length;

  const finish = (id: string) => {
    const a = appointments.find((x) => x.id === id);
    if (!a) return;
    if (visitNeedsSheet(a)) setVisitFor(id);
    else setStatus(id, "done");
  };

  const pay = () => {
    const a = appointments.find((x) => x.id === payFor);
    const r = money.result();
    if (!a || !r) return Alert.alert("المبلغ غير صالح", money.cur === "usd" ? "اكتب مبلغًا وسعر الدولار." : "اكتب مبلغًا أكبر من صفر.");
    addPayment({ patientId: a.patientId, date: today, amount: r.amount, foreign: r.foreign, note: "دفعة عند الزيارة" });
    money.reset();
    setPayFor(null);
  };

  return (
    <Screen title="اليوم في العيادة" subtitle={`${doneCount}/${list.length} منتهٍ • متوقع ${fmtMoney(expected, currency)}`} back>
      <Button label="موعد جديد" icon="add" type="private" onPress={() => router.push({ pathname: "/clinic/appointment-form", params: { date: today } })} />
      <View className="mt-3">
        {list.length === 0 ? (
          <EmptyState icon="calendar-clear-outline" title="لا مواعيد اليوم" hint="اضغط «موعد جديد» أو راجع «يحتاجون موعدًا»" />
        ) : (
          list.map((a) => {
            const p = byId.get(a.patientId);
            const st = STATUS_META[a.status];
            const bal = patientBalance(a.patientId, sessions, payments).balance;
            const items = plans.flatMap((pl) => pl.items).filter((i) => a.planItemIds?.includes(i.id));
            const teeth = a.teeth?.length ? a.teeth : items.flatMap(itemTeeth);
            return (
              <Card key={a.id} accent="private" className="mb-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text w="bold" className="text-base">
                      {p?.name ?? "مريض محذوف"}
                    </Text>
                    <Text className="text-sm text-muted">
                      {fmtTime(a.startTime)} • {a.procedure}
                      {teeth.length ? ` • سن ${[...new Set(teeth)].join("،")}` : ""}
                    </Text>
                  </View>
                  <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: st.soft }}>
                    <Text w="semi" className="text-xs" style={{ color: st.hex }}>
                      {st.label}
                    </Text>
                  </View>
                </View>
                {p ? <MedicalAlertBar patient={p} compact /> : null}
                <Text className="text-xs mt-1.5" style={{ color: bal > 0 ? "#DC2626" : "#16A34A" }}>
                  {bal > 0 ? `على المريض ${fmtMoney(bal, currency)}` : "حسابه مسدَّد"}
                  {costOf(a.planItemIds) ? ` • تكلفة اليوم ${fmtMoney(costOf(a.planItemIds), currency)}` : ""}
                </Text>
                <View className="flex-row flex-wrap gap-2 mt-3">
                  {a.status === "scheduled" ? <Chip label="وصل" icon="log-in-outline" color={STATUS_META.arrived.hex} onPress={() => setStatus(a.id, "arrived")} /> : null}
                  {a.status === "scheduled" || a.status === "arrived" ? (
                    <>
                      <Chip label="إنهاء" icon="checkmark-done" color={STATUS_META.done.hex} selected onPress={() => finish(a.id)} />
                      <Chip label="لم يحضر" onPress={() => setStatus(a.id, "no_show")} />
                    </>
                  ) : null}
                  <Chip label="دفع" icon="cash-outline" color={green} onPress={() => { money.reset(); setPayFor(a.id); }} />
                  {p?.phone ? (
                    <Chip label="اتصال" icon="call-outline" onPress={() => Linking.openURL(`tel:${p.phone}`)} />
                  ) : null}
                  {p ? <Chip label="الملف" icon="person-outline" onPress={() => router.push({ pathname: "/clinic/patient/[id]", params: { id: p.id } })} /> : null}
                </View>
              </Card>
            );
          })
        )}
      </View>

      <VisitSheet apptId={visitFor} onClose={() => setVisitFor(null)} />
      <Sheet visible={!!payFor} onClose={() => setPayFor(null)} title="دفعة">
        <MoneyField label="المبلغ" m={money} autoFocus />
        <Button label="تسجيل الدفعة" icon="checkmark" type="private" onPress={pay} />
      </Sheet>
    </Screen>
  );
}
