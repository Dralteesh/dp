import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { MONTHS } from "@/constants/arabic";
import { TYPE_META } from "@/constants/shiftTypes";
import { useActiveTypes } from "@/hooks/useActiveTypes";
import { useTheme } from "@/hooks/useTheme";
import { fmtUsd } from "@/lib/currency";
import { fmtMoney, parseAmount } from "@/lib/format";
import { incomeSeries, shiftMonth, type MonthIncome } from "@/lib/income";
import { useClinic } from "@/store/useClinic";
import { usePlanner } from "@/store/usePlanner";
import { useSettings } from "@/store/useSettings";

/** دخلي الشهري من كل المصادر: راتب + دوامات + مناوبات + صافي العيادة */
export default function IncomeScreen() {
  useTheme();
  const currency = useSettings((s) => s.currency);
  const payRates = useSettings((s) => s.payRates);
  const monthlySalary = useSettings((s) => s.monthlySalary);
  const usdRate = useSettings((s) => s.usdRate);
  const update = useSettings((s) => s.update);

  const events = usePlanner((s) => s.events);
  const sessions = useClinic((s) => s.sessions);
  const payments = useClinic((s) => s.payments);
  const appointments = useClinic((s) => s.appointments);
  const patients = useClinic((s) => s.patients);
  const expenses = useClinic((s) => s.expenses);

  const nowD = new Date();
  const thisMonth = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(thisMonth);
  const [open, setOpen] = useState(false);
  const [fSalary, setFSalary] = useState("");
  const [fRates, setFRates] = useState<Record<string, string>>({});
  const active = useActiveTypes().filter((t) => t !== "private" && t !== "personal");
  const [fUsd, setFUsd] = useState("");

  const series = useMemo(
    () => incomeSeries(month, 6, { events, sessions, payments, appointments, patients, expenses }, { payRates, monthlySalary }),
    [month, events, sessions, payments, appointments, patients, expenses, payRates, monthlySalary],
  );
  const cur: MonthIncome = series[series.length - 1];
  const max = Math.max(1, ...series.map((s) => Math.abs(s.total)));
  const [y, m] = month.split("-").map(Number);
  const f = (n: number) => fmtMoney(n, currency);
  const noRates = !monthlySalary && !Object.values(payRates).some((v) => v);

  const openSettings = () => {
    setFSalary(monthlySalary ? String(monthlySalary) : "");
    setFRates(Object.fromEntries(active.map((t) => [t, payRates[t] ? String(payRates[t]) : ""])));
    setFUsd(usdRate ? String(usdRate) : "");
    setOpen(true);
  };
  const save = () => {
    update({
      monthlySalary: parseAmount(fSalary),
      payRates: { ...payRates, ...Object.fromEntries(active.map((t) => [t, parseAmount(fRates[t] ?? "")])) },
      usdRate: parseAmount(fUsd),
    });
    setOpen(false);
  };

  const Row = ({ color, title, sub, value }: { color: string; title: string; sub?: string; value: string }) => (
    <View className="flex-row items-center gap-3 bg-surface border border-line rounded-2xl px-4 py-3 mb-2">
      <View className="w-2.5 h-10 rounded-full" style={{ backgroundColor: color }} />
      <View className="flex-1">
        <Text w="semi">{title}</Text>
        {sub ? <Text className="text-xs text-muted">{sub}</Text> : null}
      </View>
      <Text w="bold" style={{ fontVariant: ["tabular-nums"] }}>
        {value}
      </Text>
    </View>
  );

  return (
    <Screen title="دخلي الشهري" subtitle="كل المصادر في مكان واحد" back>
      <View className="flex-row items-center justify-between mb-3">
        <Pressable onPress={() => setMonth(shiftMonth(month, -1))} hitSlop={10} className="w-10 h-10 rounded-full bg-surface border border-line items-center justify-center">
          <Ionicons name="chevron-forward" size={20} color="#0F172A" />
        </Pressable>
        <Pressable onPress={() => setMonth(thisMonth)}>
          <Text w="bold" className="text-lg text-center">
            {MONTHS[m - 1]} {y}
          </Text>
          {month !== thisMonth ? <Text className="text-hospital text-xs text-center">العودة للشهر الحالي</Text> : null}
        </Pressable>
        <Pressable onPress={() => setMonth(shiftMonth(month, 1))} hitSlop={10} className="w-10 h-10 rounded-full bg-surface border border-line items-center justify-center">
          <Ionicons name="chevron-back" size={20} color="#0F172A" />
        </Pressable>
      </View>

      <View className="rounded-3xl p-5" style={{ backgroundColor: "#1E2229" }}>
        <Text className="text-sm" style={{ color: "#9AA3AF" }}>
          إجمالي الدخل
        </Text>
        <Text w="bold" className="text-3xl mt-1" style={{ color: "#FFFFFF" }} numberOfLines={1} adjustsFontSizeToFit>
          {f(cur.total)}
        </Text>
        {usdRate > 0 ? (
          <Text className="text-sm mt-0.5" style={{ color: "#9AA3AF" }}>
            ≈ {fmtUsd(cur.total / usdRate)}
          </Text>
        ) : null}
      </View>

      {noRates ? (
        <View className="rounded-2xl p-3 mt-3" style={{ backgroundColor: "#FEF3C7" }}>
          <Text className="text-sm" style={{ color: "#92400E" }}>
            لم تُدخل راتبك وأجور الدوامات بعد، فلا يظهر هنا إلا صافي العيادة.
          </Text>
        </View>
      ) : null}

      <View className="mt-3">
        <Row color="#64748B" title="الراتب الثابت" value={f(cur.salary)} />
        {cur.shifts.map((x) => (
          <Row
            key={x.type}
            color={TYPE_META[x.type].hex}
            title={TYPE_META[x.type].label}
            sub={`${x.count} يومًا • ${x.hours} ساعة${x.rate ? ` • ${f(x.rate)} لليوم` : ""}`}
            value={f(x.pay)}
          />
        ))}
        <Row
          color={TYPE_META.private.hex}
          title="صافي العيادة الخاصة"
          sub={`مقبوض ${f(cur.clinic.collected)} − مصاريف ${f(cur.clinic.expenses)}`}
          value={f(cur.clinic.net)}
        />
        {cur.personal.count > 0 ? (
          <Row color={TYPE_META.personal.hex} title="أنشطة شخصية" sub={`${cur.personal.count} نشاطًا • ${cur.personal.hours} ساعة (لا تدخل في الدخل)`} value="—" />
        ) : null}
      </View>

      <SectionHeader title="آخر 6 أشهر" />
      <Card>
        <View className="flex-row items-end justify-between" style={{ height: 120 }}>
          {series.map((s) => {
            const h = Math.max(4, (Math.max(0, s.total) / max) * 100);
            const active = s.month === month;
            return (
              <Pressable key={s.month} onPress={() => setMonth(s.month)} className="items-center flex-1">
                <View style={{ width: 22, height: h, borderRadius: 7, backgroundColor: active ? "#111418" : "#CBD5E1" }} />
                <Text className="text-xs mt-1" style={{ color: active ? "#111418" : "#64748B" }}>
                  {Number(s.month.slice(5))}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <View className="mt-4">
        <Button label="الراتب والأجور وسعر الدولار" icon="settings" variant="outline" onPress={openSettings} />
      </View>

      <Sheet visible={open} onClose={() => setOpen(false)} title="الراتب والأجور">
        <Field label={`الراتب الشهري الثابت (${currency})`} value={fSalary} onChangeText={setFSalary} keyboardType="numeric" placeholder="0" />
        {active.map((t) => (
          <Field
            key={t}
            label={`أجر اليوم: ${TYPE_META[t].label} (${currency})`}
            value={fRates[t] ?? ""}
            onChangeText={(v) => setFRates((c) => ({ ...c, [t]: v }))}
            keyboardType="numeric"
            placeholder="0"
            hint="يُضرب بعدد أيام هذا النوع في الشهر"
          />
        ))}
        <Field label={`سعر الدولار (${currency})`} value={fUsd} onChangeText={setFUsd} keyboardType="numeric" placeholder="14000" hint="يُستعمل في دفعات وأسعار الدولار" />
        <Button label="حفظ" icon="checkmark" onPress={save} />
      </Sheet>
    </Screen>
  );
}
