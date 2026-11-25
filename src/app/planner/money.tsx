import { useMemo } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { PCard, PlannerShell, SectionTitle } from "@/components/planner/kit";
import { Text } from "@/components/ui/Text";
import { PL } from "@/design/planner";
import { toISO, fmtDateShort } from "@/lib/dates";
import { fmtMoney } from "@/lib/format";
import { patientBalance, useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";

/** المالية (الواجهة الجديدة): المقبوض والمستحق وأعلى الذمم وآخر الدفعات */
export default function PlannerMoney() {
  const router = useRouter();
  const currency = useSettings((s) => s.currency);
  const patients = useClinic((s) => s.patients);
  const sessions = useClinic((s) => s.sessions);
  const payments = useClinic((s) => s.payments);

  const byId = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);
  const month = toISO(new Date()).slice(0, 7);
  const collected = payments.filter((p) => p.date.startsWith(month)).reduce((a, p) => a + p.amount, 0);
  const charged = sessions.filter((s) => s.date.startsWith(month)).reduce((a, s) => a + s.cost, 0);
  const balances = useMemo(() => patients.map((p) => ({ patient: p, ...patientBalance(p.id, sessions, payments) })), [patients, sessions, payments]);
  const totalDebt = balances.reduce((a, b) => a + Math.max(0, b.balance), 0);
  const debtors = balances.filter((b) => b.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 8);
  const recent = payments.slice(0, 8);

  const open = (id: string) => router.push({ pathname: "/planner/patient/[id]", params: { id } } as never);

  return (
    <PlannerShell title="المالية" back nav="tools">
      <View style={{ flexDirection: "row", gap: 10 }}>
        <PCard style={{ flex: 1, backgroundColor: PL.goodSoft }}>
          <Text style={{ fontSize: 12, color: PL.good }}>المقبوض هذا الشهر</Text>
          <Text w="bold" style={{ fontSize: 18, color: PL.good }}>
            {fmtMoney(collected, currency)}
          </Text>
        </PCard>
        <PCard style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, color: PL.navySoft }}>قيمة العلاج هذا الشهر</Text>
          <Text w="bold" style={{ fontSize: 18, color: PL.navy }}>
            {fmtMoney(charged, currency)}
          </Text>
        </PCard>
      </View>
      <PCard style={{ marginTop: 10, backgroundColor: PL.badSoft }}>
        <Text style={{ fontSize: 12, color: PL.bad }}>إجمالي الذمم المستحقة</Text>
        <Text w="bold" style={{ fontSize: 18, color: PL.bad }}>
          {fmtMoney(totalDebt, currency)}
        </Text>
      </PCard>

      <SectionTitle title="أعلى الذمم" />
      {debtors.length === 0 ? (
        <PCard style={{ alignItems: "center", paddingVertical: 20 }}>
          <Text w="semi" style={{ color: PL.navy }}>لا ذمم مستحقة</Text>
        </PCard>
      ) : (
        debtors.map((d) => (
          <PCard key={d.patient.id} onPress={() => open(d.patient.id)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text w="semi" style={{ color: PL.navy }}>{d.patient.name}</Text>
            <Text w="bold" style={{ color: PL.bad }}>{fmtMoney(d.balance, currency)}</Text>
          </PCard>
        ))
      )}

      <SectionTitle title="آخر الدفعات" />
      {recent.length === 0 ? (
        <PCard style={{ alignItems: "center", paddingVertical: 20 }}>
          <Text w="semi" style={{ color: PL.navy }}>لا دفعات بعد</Text>
        </PCard>
      ) : (
        recent.map((p) => (
          <PCard key={p.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <View>
              <Text w="semi" style={{ color: PL.navy }}>{byId.get(p.patientId)?.name ?? "مريض محذوف"}</Text>
              <Text style={{ fontSize: 12, color: PL.muted }}>{fmtDateShort(p.date)}</Text>
            </View>
            <Text w="bold" style={{ color: PL.good }}>+{fmtMoney(p.amount, currency)}</Text>
          </PCard>
        ))
      )}
    </PlannerShell>
  );
}
