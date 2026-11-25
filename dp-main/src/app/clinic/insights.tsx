import { useMemo, useState } from "react";
import { View } from "react-native";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Chip";
import { SectionHeader } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { fmtMoney, toWesternDigits } from "@/lib/format";
import { ageBuckets, genderCounts, noShowRate, splitIncome, topProcedures, topTeeth, weekdayCounts } from "@/lib/insights";
import { periodRange, type Period } from "@/lib/reports";
import { useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";

const DAYS = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

function Bars({ rows, color }: { rows: Array<{ label: string; n: number; extra?: string }>; color: string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  if (!rows.length) return <Text className="text-muted">لا بيانات في هذه الفترة.</Text>;
  return (
    <View>
      {rows.map((r) => (
        <View key={r.label} className="mb-2">
          <View className="flex-row justify-between">
            <Text w="semi" className="flex-1" numberOfLines={1}>
              {r.label}
            </Text>
            <Text className="text-xs text-muted">
              {r.n}
              {r.extra ? ` • ${r.extra}` : ""}
            </Text>
          </View>
          <View className="h-2 rounded-full mt-1" style={{ backgroundColor: "#E2E8F0" }}>
            <View style={{ width: `${(r.n / max) * 100}%`, height: 8, borderRadius: 4, backgroundColor: color }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** إحصاءات: الإجراءات والأسنان والأيام والأعمار والجنس وعدم الحضور وتقسيم الدخل */
export default function InsightsScreen() {
  const [period, setPeriod] = useState<Period | "all">("month");
  const patients = useClinic((s) => s.patients);
  const sessions = useClinic((s) => s.sessions);
  const payments = useClinic((s) => s.payments);
  const appointments = useClinic((s) => s.appointments);
  const currency = useSettings((s) => s.currency);
  const split = useSettings((s) => s.incomeSplit);
  const update = useSettings((s) => s.update);
  const green = TYPE_META.private.hex;
  const r = period === "all" ? null : periodRange(period);

  const procs = useMemo(() => topProcedures(sessions, r), [sessions, period]); // eslint-disable-line react-hooks/exhaustive-deps
  const teeth = useMemo(() => topTeeth(sessions, r), [sessions, period]); // eslint-disable-line react-hooks/exhaustive-deps
  const days = useMemo(() => weekdayCounts(appointments, r), [appointments, period]); // eslint-disable-line react-hooks/exhaustive-deps
  const ns = useMemo(() => noShowRate(appointments, r), [appointments, period]); // eslint-disable-line react-hooks/exhaustive-deps
  const ages = useMemo(() => ageBuckets(patients), [patients]);
  const g = useMemo(() => genderCounts(patients), [patients]);
  const collected = useMemo(
    () => payments.filter((p) => !r || (p.date >= r.from && p.date <= r.to)).reduce((a, p) => a + p.amount, 0),
    [payments, period], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const parts = splitIncome(collected, split.doctorPct, split.materialsPct);
  const num = (s: string) => Math.max(0, Math.min(100, Number(toWesternDigits(s)) || 0));

  return (
    <Screen title="إحصاءات" subtitle="العلاجات والمرضى" back>
      <Segmented
        value={period}
        onChange={setPeriod}
        options={[
          { value: "week", label: "أسبوع" },
          { value: "month", label: "شهر" },
          { value: "year", label: "سنة" },
          { value: "all", label: "الكل" },
        ]}
      />
      <SectionHeader title="العلاجات الأكثر تنفيذًا" />
      <Card>
        <Bars rows={procs.map((p) => ({ label: p.key, n: p.n, extra: fmtMoney(p.sum, currency) }))} color={green} />
      </Card>
      <SectionHeader title="الأسنان الأكثر معالجة" />
      <Card>
        <Bars rows={teeth.map((t) => ({ label: `سن ${t.key}`, n: t.n }))} color="#2563EB" />
      </Card>
      <SectionHeader title="المواعيد حسب اليوم" />
      <Card>
        <Bars rows={days.map((n, i) => ({ label: DAYS[i], n }))} color="#7C3AED" />
      </Card>
      <SectionHeader title="الحضور" />
      <Card>
        <Text w="bold" style={{ fontSize: 24, color: ns.rate > 0.2 ? "#DC2626" : green }}>
          {Math.round(ns.rate * 100)}% عدم حضور
        </Text>
        <Text className="text-xs text-muted">
          {ns.missed} لم يحضروا من {ns.done + ns.missed} موعد محسوم
        </Text>
      </Card>
      <SectionHeader title="أعمار المرضى" />
      <Card>
        <Bars rows={ages} color="#D97706" />
      </Card>
      <SectionHeader title="الجنس" />
      <Card>
        <Text>
          ذكور {g.male} • إناث {g.female}
          {g.unknown ? ` • غير مسجّل ${g.unknown}` : ""}
        </Text>
      </Card>

      <SectionHeader title="تقسيم الدخل" />
      <Card>
        <Text className="text-xs text-muted mb-2">يُطبَّق على المقبوض في الفترة المختارة ({fmtMoney(collected, currency)}). الباقي بعد الحصتين للعيادة.</Text>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="نسبة الطبيب %" value={String(split.doctorPct || "")} onChangeText={(v) => update({ incomeSplit: { ...split, doctorPct: num(v) } })} keyboardType="number-pad" placeholder="0" />
          </View>
          <View className="flex-1">
            <Field label="نسبة المواد %" value={String(split.materialsPct || "")} onChangeText={(v) => update({ incomeSplit: { ...split, materialsPct: num(v) } })} keyboardType="number-pad" placeholder="0" />
          </View>
        </View>
        {split.doctorPct + split.materialsPct > 0 ? (
          <View>
            <Text>الطبيب: {fmtMoney(parts.doctor, currency)}</Text>
            <Text>المواد: {fmtMoney(parts.materials, currency)}</Text>
            <Text w="bold">العيادة: {fmtMoney(parts.clinic, currency)}</Text>
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}
