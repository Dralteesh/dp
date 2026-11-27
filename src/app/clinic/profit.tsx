import { useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GoalBar } from "@/components/clinic/GoalBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { EXPENSE_CATEGORIES } from "@/constants/clinic";
import { useTheme } from "@/hooks/useTheme";
import { toISO } from "@/lib/dates";
import { shareXlsx, type SheetData } from "@/lib/exportXlsx";
import { fmtMoney } from "@/lib/format";
import { sharePdf } from "@/lib/pdf";
import { profitHtml, type DocCtx } from "@/lib/pdfHtml";
import { patientPlanFinance } from "@/lib/planFinance";
import { buildProfit, monthLabel, shiftMonth } from "@/lib/profit";
import { patientBalance, useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";

/** الربح الشهري: المقبوض والمصاريف وربح الخطط والإجراءات، مع تصدير PDF وExcel */
export default function ProfitScreen() {
  useTheme();
  const green = TYPE_META.private.hex;
  const se = useSettings();
  const currency = se.currency;
  const nowMonth = toISO(new Date()).slice(0, 7);
  const [month, setMonth] = useState(nowMonth);
  const [busy, setBusy] = useState(false);
  const patients = useClinic((s) => s.patients);
  const sessions = useClinic((s) => s.sessions);
  const payments = useClinic((s) => s.payments);
  const expenses = useClinic((s) => s.expenses);
  const plans = useClinic((s) => s.plans);

  const r = useMemo(() => buildProfit(month, { sessions, payments, expenses, plans, patients }), [month, sessions, payments, expenses, plans, patients]);
  const byId = useMemo(() => new Map(patients.map((p) => [p.id, p.name])), [patients]);

  const ctx = (): DocCtx => ({ clinicName: se.clinicName, doctorName: se.doctorName, logo: se.clinicLogo || undefined, currency, dateISO: toISO(new Date()) });

  const pdf = async () => {
    if (busy) return;
    setBusy(true);
    const err = await sharePdf(profitHtml(ctx(), r), `ربح-${month}`);
    setBusy(false);
    if (err) Alert.alert("PDF", err);
  };

  /** Excel: أوراق الشهر (الدفعات/المصاريف) + أرصدة المرضى وخطط العلاج الحالية */
  const excel = async () => {
    if (busy) return;
    setBusy(true);
    const inM = (d: string) => d.startsWith(month);
    const sheets: SheetData[] = [
      {
        name: "الملخص",
        rows: [["البند", "المبلغ"], ["المقبوض (صافي)", r.collected], ["منه استرداد", r.refunds], ["المصاريف", r.expenses], ["صافي الربح", r.net], ["المستحق الجديد", r.charged]],
      },
      {
        name: "الدفعات",
        rows: [
          ["التاريخ", "المريض", "المبلغ", "النوع", "الخطة", "ملاحظة"],
          ...payments
            .filter((p) => inM(p.date))
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((p) => [p.date, byId.get(p.patientId) ?? "", p.amount, p.refund ? "استرداد" : "دفعة", plans.find((x) => x.id === p.planId)?.title ?? "", p.note ?? ""]),
        ],
      },
      {
        name: "المصاريف",
        rows: [
          ["التاريخ", "النوع", "المبلغ", "الخطة", "ملاحظة"],
          ...expenses.filter((e) => inM(e.date)).sort((a, b) => a.date.localeCompare(b.date)).map((e) => [e.date, EXPENSE_CATEGORIES[e.category] ?? e.category, e.amount, plans.find((x) => x.id === e.planId)?.title ?? "", e.note ?? ""]),
        ],
      },
      {
        name: "الذمم",
        rows: [
          ["المريض", "الهاتف", "المستحق", "المدفوع", "المتبقي"],
          ...patients
            .map((p) => ({ p, b: patientBalance(p.id, sessions, payments) }))
            .filter((x) => x.b.balance > 0)
            .sort((a, b) => b.b.balance - a.b.balance)
            .map((x) => [x.p.name, x.p.phone ?? "", x.b.charged, x.b.paid, x.b.balance]),
        ],
      },
      {
        name: "الخطط",
        rows: [
          ["المريض", "الخطة", "التكلفة", "الخصم", "الصافي", "المدفوع", "المتبقي", "مصاريف الخطة"],
          ...patients.flatMap((p) => patientPlanFinance(plans, payments, expenses, p.id).plans.map((f) => [p.name, f.plan.title, f.gross, f.discount, f.net, f.paid, f.remaining, f.expenses])),
        ],
      },
    ];
    const err = await shareXlsx(sheets, `مالية-${se.clinicName || "العيادة"}-${month}`);
    setBusy(false);
    if (err) Alert.alert("Excel", err);
  };

  const Stat = ({ label, value, color }: { label: string; value: number; color?: string }) => (
    <View style={{ width: "50%" }} className="mb-2">
      <Text className="text-xs text-muted">{label}</Text>
      <Text w="bold" style={{ color: color ?? "#0F172A" }}>{fmtMoney(value, currency)}</Text>
    </View>
  );

  return (
    <Screen title="الربح الشهري" subtitle={monthLabel(month)} back>
      <View className="flex-row items-center justify-between mb-3">
        <Pressable hitSlop={10} onPress={() => setMonth(shiftMonth(month, -1))} accessibilityLabel="الشهر السابق">
          <Ionicons name="chevron-forward" size={24} color="#475569" />
        </Pressable>
        <Text w="bold">{monthLabel(month)}</Text>
        <Pressable hitSlop={10} disabled={month >= nowMonth} onPress={() => setMonth(shiftMonth(month, 1))} accessibilityLabel="الشهر التالي">
          <Ionicons name="chevron-back" size={24} color={month >= nowMonth ? "#CBD5E1" : "#475569"} />
        </Pressable>
      </View>

      {month === nowMonth ? <GoalBar showEmpty /> : null}

      <Card className="mb-3">
        <View className="flex-row flex-wrap">
          <Stat label="المقبوض (صافي)" value={r.collected} color="#16A34A" />
          <Stat label="المصاريف" value={r.expenses} color="#DC2626" />
          <Stat label="صافي الربح" value={r.net} color={r.net >= 0 ? "#16A34A" : "#DC2626"} />
          <Stat label="المستحق الجديد" value={r.charged} />
        </View>
        {r.refunds > 0 ? <Text className="text-xs text-muted">منها استرداد {fmtMoney(r.refunds, currency)}</Text> : null}
      </Card>

      <View className="flex-row gap-2 mb-4">
        <View className="flex-1">
          <Button label="تقرير PDF" icon="document-text-outline" type="private" disabled={busy} onPress={pdf} />
        </View>
        <View className="flex-1">
          <Button label="تصدير Excel" icon="grid-outline" variant="soft" type="private" disabled={busy} onPress={excel} />
        </View>
      </View>

      <Text w="bold" className="mb-2">المصاريف حسب النوع</Text>
      <Card className="mb-3">
        {r.expenseByCat.length === 0 ? <Text className="text-muted text-center">لا مصاريف</Text> : r.expenseByCat.map((x) => (
          <View key={x.cat} className="flex-row justify-between py-1">
            <Text>{x.cat}</Text>
            <Text w="semi">{fmtMoney(x.total, currency)}</Text>
          </View>
        ))}
      </Card>

      <Text w="bold" className="mb-2">الإيراد حسب الإجراء</Text>
      <Card className="mb-3">
        {r.byProcedure.length === 0 ? <Text className="text-muted text-center">لا جلسات</Text> : r.byProcedure.slice(0, 10).map((x) => (
          <View key={x.name} className="flex-row justify-between py-1">
            <Text className="flex-1" numberOfLines={1}>{x.name} <Text className="text-xs text-muted">({x.count})</Text></Text>
            <Text w="semi">{fmtMoney(x.total, currency)}</Text>
          </View>
        ))}
      </Card>

      <Text w="bold" className="mb-2">ربح الخطط</Text>
      <Card>
        {r.byPlan.length === 0 ? <Text className="text-muted text-center text-xs">لا دفعات أو مصاريف مربوطة بخطط هذا الشهر</Text> : r.byPlan.slice(0, 12).map((x, i) => (
          <View key={`${x.patient}-${x.title}-${i}`} className="py-1.5 border-b border-line">
            <Text w="semi" numberOfLines={1}>{x.patient} — {x.title}</Text>
            <Text className="text-xs text-muted">
              مقبوض {fmtMoney(x.collected, currency)} • مصاريف {fmtMoney(x.expenses, currency)} • ربح {fmtMoney(x.profit, currency)}
            </Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
