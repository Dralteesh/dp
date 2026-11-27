import { useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PatientPick } from "@/components/clinic/PatientPick";
import { MoneyField, useMoneyInput } from "@/components/MoneyField";
import { GoalBar } from "@/components/clinic/GoalBar";
import { EditMoneySheet, type MoneyTarget } from "@/components/clinic/EditMoneySheet";
import { MoneyAddSheet, type MoneyMode } from "@/components/clinic/MoneyAddSheet";
import { PCard, PlannerShell, SectionTitle } from "@/components/planner/kit";
import { ToolGrid, type ToolItem } from "@/components/planner/ToolGrid";
import { DateField } from "@/components/pickers";
import { Button } from "@/components/ui/Button";
import { Fab } from "@/components/ui/Fab";
import { Field } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { PL } from "@/design/planner";
import { useLayout } from "@/hooks/useLayout";
import { usePlanDebts } from "@/hooks/usePlanDebts";
import { addDays, fmtDateShort, toISO } from "@/lib/dates";
import { OPENING_PROCEDURE, PERIOD_LABEL, periodStart, type FinPeriod } from "@/lib/finance";
import { fmtMoney } from "@/lib/format";
import { patientBalance, useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";

const LINKS: ToolItem[] = [
  { label: "الفواتير", icon: "receipt", path: "/clinic/invoices" },
  { label: "الأقساط", icon: "calendar", path: "/clinic/installments" },
  { label: "المصاريف", icon: "wallet", path: "/clinic/expenses" },
  { label: "التقارير", icon: "stats-chart", path: "/clinic/reports" },
  { label: "الأسعار", icon: "pricetag", path: "/clinic/prices" },
  { label: "الربح الشهري", icon: "trending-up", path: "/clinic/profit" },
  { label: "بحث شامل", icon: "search", path: "/clinic/search" },
  { label: "الإغلاق اليومي", icon: "checkmark-done", path: "/clinic/daily-close" },
  { label: "ربط الدفعات", icon: "git-merge", path: "/clinic/link-payments" },
];


/** المالية: ملخّص الفترة (مقبوض/علاج/مصاريف/صافي)، الذمم، دفعة سريعة، رصيد سابق، وروابط الفواتير والأقساط والمصاريف والتقارير */
export default function PlannerMoney() {
  const router = useRouter();
  const { isWide } = useLayout();
  const currency = useSettings((s) => s.currency);
  const patients = useClinic((s) => s.patients);
  const sessions = useClinic((s) => s.sessions);
  const payments = useClinic((s) => s.payments);
  const expenses = useClinic((s) => s.expenses);
  const addPayment = useClinic((s) => s.addPayment);
  const addSession = useClinic((s) => s.addSession);

  const today = toISO(new Date());
  const [period, setPeriod] = useState<FinPeriod>("month");
  const [showAllDebts, setShowAllDebts] = useState(false);
  const planDebts = usePlanDebts();
  const plansAll = useClinic((s) => s.plans);
  const planTitle = (id?: string) => (id ? plansAll.find((x) => x.id === id)?.title : undefined);

  // نافذة الإضافة: دفعة أو ذمة (بلا mode = تسأل أولًا)
  const [editMoney, setEditMoney] = useState<MoneyTarget>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<MoneyMode | undefined>();
  const [addPatient, setAddPatient] = useState<string | undefined>();

  const byId = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);
  const from = periodStart(period, today, addDays);
  const inRange = (d: string) => d >= from && d <= today;

  const collected = payments.filter((p) => inRange(p.date)).reduce((a, p) => a + p.amount, 0);
  const charged = sessions.filter((s) => inRange(s.date) && s.procedure !== OPENING_PROCEDURE).reduce((a, s) => a + s.cost, 0);
  const spent = expenses.filter((e) => inRange(e.date)).reduce((a, e) => a + e.amount, 0);
  const net = collected - spent;

  const balances = useMemo(() => patients.map((p) => ({ patient: p, ...patientBalance(p.id, sessions, payments) })), [patients, sessions, payments]);
  const debtorsAll = useMemo(() => balances.filter((b) => b.balance > 0).sort((a, b) => b.balance - a.balance), [balances]);
  const totalDebt = debtorsAll.reduce((a, b) => a + b.balance, 0);
  const debtors = showAllDebts ? debtorsAll : debtorsAll.slice(0, 8);
  const recent = useMemo(
    () => [...payments].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1)).slice(0, 8),
    [payments],
  );

  const open = (id: string) => router.push({ pathname: "/planner/patient/[id]", params: { id } } as never);
  const openSheet = (md?: MoneyMode, pid?: string) => {
    setAddMode(md);
    setAddPatient(pid);
    setAddOpen(true);
  };

  const Stat = ({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) => (
    <PCard style={{ flex: 1, backgroundColor: bg }}>
      <Text style={{ fontSize: 12, color }}>{label}</Text>
      <Text w="bold" style={{ fontSize: 17, color }}>
        {fmtMoney(value, currency)}
      </Text>
    </PCard>
  );

  return (
    <PlannerShell title="المالية" back maxWidth={1000} overlay={<Fab color={PL.navy} onPress={() => openSheet()} />}>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        {(Object.keys(PERIOD_LABEL) as FinPeriod[]).map((k) => {
          const on = k === period;
          return (
            <Pressable
              key={k}
              onPress={() => setPeriod(k)}
              style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 999, backgroundColor: on ? PL.navy : PL.card, borderWidth: 1, borderColor: on ? PL.navy : PL.border }}
            >
              <Text w="semi" style={{ fontSize: 13, color: on ? "#fff" : PL.navy }}>
                {PERIOD_LABEL[k]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Stat label="المقبوض" value={collected} color={PL.good} bg={PL.goodSoft} />
        <Stat label="قيمة العلاج" value={charged} color={PL.navy} bg={PL.card} />
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
        <Stat label="المصاريف" value={spent} color={PL.warn} bg={PL.warnSoft} />
        <Stat label="الصافي (مقبوض − مصاريف)" value={net} color={net >= 0 ? PL.good : PL.bad} bg={net >= 0 ? PL.goodSoft : PL.badSoft} />
      </View>

      <PCard style={{ marginTop: 10, backgroundColor: PL.badSoft, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <Text style={{ fontSize: 12, color: PL.bad }}>إجمالي الذمم المستحقة</Text>
          <Text w="bold" style={{ fontSize: 18, color: PL.bad }}>
            {fmtMoney(totalDebt, currency)}
          </Text>
        </View>
        <Text style={{ fontSize: 12, color: PL.bad }}>{debtorsAll.length} مريض</Text>
      </PCard>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
        <View style={{ flex: 1 }}>
          <Button label="دفعة جديدة" icon="add" type="private" onPress={() => openSheet("payment")} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="ذمة جديدة" icon="receipt-outline" variant="soft" onPress={() => openSheet("debt")} />
        </View>
      </View>

      <SectionTitle title="الأقسام" />
      <ToolGrid items={LINKS} cols={isWide ? 6 : 3} />

      <SectionTitle
        title="الذمم المستحقة"
        action={debtorsAll.length > 8 ? (showAllDebts ? "أقل" : `عرض الكل (${debtorsAll.length})`) : undefined}
        onAction={() => setShowAllDebts((v) => !v)}
      />
      {debtors.length === 0 ? (
        <PCard style={{ alignItems: "center", paddingVertical: 20 }}>
          <Text w="semi" style={{ color: PL.navy }}>لا ذمم مستحقة</Text>
        </PCard>
      ) : (
        debtors.map((d) => (
          <PCard key={d.patient.id} onPress={() => open(d.patient.id)} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <Text w="semi" numberOfLines={1} style={{ color: PL.navy }}>{d.patient.name}</Text>
              <Text style={{ fontSize: 11.5, color: PL.muted }}>
                مدفوع {fmtMoney(d.paid, currency)} من {fmtMoney(d.charged, currency)}
              </Text>
            </View>
            <Text w="bold" style={{ color: PL.bad }}>{fmtMoney(d.balance, currency)}</Text>
            <Pressable onPress={() => openSheet("payment", d.patient.id)} hitSlop={8} accessibilityLabel="تسجيل دفعة">
              <Ionicons name="add-circle" size={28} color={PL.good} />
            </Pressable>
          </PCard>
        ))
      )}

      <GoalBar showEmpty />

      <SectionTitle title="خطط العلاج (المتبقي)" />
      {planDebts.length === 0 ? (
        <PCard style={{ alignItems: "center", paddingVertical: 20 }}>
          <Text w="semi" style={{ color: PL.navy }}>لا متبقٍ على أي خطة</Text>
        </PCard>
      ) : (
        planDebts.slice(0, 8).map(({ patient, fin }) => (
          <PCard
            key={fin.plan.id}
            onPress={() => router.push({ pathname: "/clinic/plan", params: { patientId: patient.id } } as never)}
            style={{ marginBottom: 8 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text w="semi" numberOfLines={1} style={{ color: PL.navy }}>{patient.name}</Text>
                <Text numberOfLines={1} style={{ fontSize: 11.5, color: PL.muted }}>
                  {fin.plan.title} • مدفوع {fmtMoney(fin.paid, currency)} من {fmtMoney(fin.net, currency)}
                </Text>
              </View>
              <Text w="bold" style={{ color: PL.bad }}>{fmtMoney(fin.remaining, currency)}</Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: PL.border, marginTop: 8, overflow: "hidden" }}>
              <View style={{ width: `${Math.min(100, Math.round((fin.paid / Math.max(1, fin.net)) * 100))}%`, height: 6, backgroundColor: PL.good }} />
            </View>
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
          <PCard key={p.id} onPress={() => setEditMoney({ kind: "payment", id: p.id })} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <Text w="semi" style={{ color: PL.navy }}>{byId.get(p.patientId)?.name ?? "مريض محذوف"}</Text>
              <Text style={{ fontSize: 12, color: PL.muted }}>
                {fmtDateShort(p.date)}
                {planTitle(p.planId) ? ` • ${planTitle(p.planId)}` : ""}
                {p.note ? ` • ${p.note}` : ""}
              </Text>
            </View>
            <Text w="bold" style={{ color: PL.good }}>{p.amount < 0 ? "−" : "+"}{fmtMoney(Math.abs(p.amount), currency)}</Text>
          </PCard>
        ))
      )}

      <EditMoneySheet target={editMoney} onClose={() => setEditMoney(null)} />
      <MoneyAddSheet visible={addOpen} mode={addMode} patientId={addPatient} onClose={() => setAddOpen(false)} />
    </PlannerShell>
  );
}
