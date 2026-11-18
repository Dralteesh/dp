import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Chip";
import { SectionHeader } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { useTheme } from "@/hooks/useTheme";
import { fmtUsd } from "@/lib/currency";
import { fmtMoney } from "@/lib/format";
import { buildReport, periodRange, topDebtors, type Period } from "@/lib/reports";
import { useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "اليوم" },
  { value: "week", label: "الأسبوع" },
  { value: "month", label: "الشهر" },
  { value: "year", label: "السنة" },
];

function Stat({ label, value, bg, fg }: { label: string; value: string; bg: string; fg: string }) {
  return (
    <View className="flex-1 rounded-2xl p-3" style={{ backgroundColor: bg }}>
      <Text className="text-xs" style={{ color: fg }}>
        {label}
      </Text>
      <Text w="bold" style={{ color: fg }}>
        {value}
      </Text>
    </View>
  );
}

/** تقارير العيادة: مقبوضات، مستحقات، إجراءات، حضور، وأكبر الذمم */
export default function ReportsScreen() {
  useTheme();
  const router = useRouter();
  const currency = useSettings((s) => s.currency);
  const patients = useClinic((s) => s.patients);
  const sessions = useClinic((s) => s.sessions);
  const payments = useClinic((s) => s.payments);
  const appointments = useClinic((s) => s.appointments);
  const expenses = useClinic((s) => s.expenses);
  const [period, setPeriod] = useState<Period>("month");

  const report = useMemo(
    () => buildReport(period, { sessions, payments, appointments, patients, expenses }),
    [period, sessions, payments, appointments, patients, expenses],
  );
  const debtors = useMemo(() => topDebtors(patients, sessions, payments), [patients, sessions, payments]);
  const totalDebt = useMemo(() => topDebtors(patients, sessions, payments, 100000).reduce((a, d) => a + d.balance, 0), [patients, sessions, payments]);
  const range = periodRange(period);

  const max = Math.max(1, ...report.series.map((s) => s.value));
  const green = TYPE_META.private.hex;
  const a = report.appointments;
  const apptTotal = a.done + a.no_show + a.cancelled + a.other;

  return (
    <Screen title="التقارير" subtitle={`${range.from} → ${range.to}`} back>
      <Segmented value={period} onChange={setPeriod} options={PERIODS} />

      <View className="flex-row gap-2.5 mt-4">
        <Stat label="المقبوض" value={fmtMoney(report.collected, currency)} bg={TYPE_META.private.soft} fg={TYPE_META.private.inkHex} />
        <Stat label="المستحق (جلسات)" value={fmtMoney(report.charged, currency)} bg={TYPE_META.hospital.soft} fg={TYPE_META.hospital.inkHex} />
      </View>
      {report.collectedUsd > 0 ? (
        <Text className="text-xs text-muted mt-1.5 mx-1">منه بالدولار: {fmtUsd(report.collectedUsd)}</Text>
      ) : null}
      <View className="flex-row gap-2.5 mt-2.5">
        <Stat label="المصاريف" value={fmtMoney(report.expenses, currency)} bg="#FEF3C7" fg="#92400E" />
        <Stat
          label="الصافي (مقبوض - مصاريف)"
          value={fmtMoney(report.net, currency)}
          bg={report.net >= 0 ? "#DCFCE7" : "#FEE2E2"}
          fg={report.net >= 0 ? "#14532D" : "#991B1B"}
        />
      </View>
      <View className="flex-row gap-2.5 mt-2.5">
        <Stat label="الجلسات" value={String(report.sessionsCount)} bg="#F1F5F9" fg="#0F172A" />
        <Stat label="مرضى جدد" value={String(report.newPatients)} bg="#F1F5F9" fg="#0F172A" />
        <Stat label="ذمم كل المرضى" value={fmtMoney(totalDebt, currency)} bg="#FEE2E2" fg="#991B1B" />
      </View>

      <SectionHeader title={period === "year" ? "المقبوض لكل شهر" : "المقبوض لكل يوم"} />
      <Card>
        {report.collected === 0 ? (
          <Text className="text-sm text-muted text-center py-6">لا دفعات في هذه الفترة</Text>
        ) : (
          <View className="flex-row items-end justify-between" style={{ height: 120 }}>
            {report.series.map((s, i) => (
              <View key={i} className="items-center" style={{ flex: 1 }}>
                <View
                  style={{
                    width: report.series.length > 16 ? 5 : 14,
                    height: Math.max(s.value > 0 ? 4 : 1, (s.value / max) * 100),
                    borderRadius: 4,
                    backgroundColor: s.value > 0 ? green : "#E2E8F0",
                  }}
                />
                {report.series.length <= 16 ? (
                  <Text className="text-[10px] text-muted mt-1">{s.label}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </Card>

      <SectionHeader title="حسب الإجراء" />
      <Card>
        {report.byProcedure.length === 0 ? (
          <Text className="text-sm text-muted text-center py-4">لا جلسات في هذه الفترة</Text>
        ) : (
          report.byProcedure.map((p) => (
            <View key={p.name} className="mb-2.5">
              <View className="flex-row justify-between">
                <Text w="semi" className="text-sm">
                  {p.name} <Text className="text-xs text-muted">({p.count})</Text>
                </Text>
                <Text className="text-sm" style={{ fontVariant: ["tabular-nums"] }}>
                  {fmtMoney(p.total, currency)}
                </Text>
              </View>
              <View className="h-1.5 rounded-full bg-slate-100 mt-1 overflow-hidden">
                <View
                  style={{
                    width: `${Math.max(3, (p.total / Math.max(1, report.byProcedure[0].total)) * 100)}%`,
                    height: 6,
                    backgroundColor: TYPE_META.hospital.hex,
                  }}
                />
              </View>
            </View>
          ))
        )}
      </Card>

      <SectionHeader title="المواعيد" />
      <Card>
        {apptTotal === 0 ? (
          <Text className="text-sm text-muted text-center py-4">لا مواعيد في هذه الفترة</Text>
        ) : (
          <View className="flex-row justify-between">
            {[
              { l: "تمت", v: a.done },
              { l: "لم يحضر", v: a.no_show },
              { l: "ملغاة", v: a.cancelled },
              { l: "أخرى", v: a.other },
            ].map((x) => (
              <View key={x.l} className="items-center flex-1">
                <Text w="bold" className="text-xl">
                  {x.v}
                </Text>
                <Text className="text-xs text-muted">{x.l}</Text>
              </View>
            ))}
          </View>
        )}
        {apptTotal > 0 && a.no_show > 0 ? (
          <Text className="text-xs text-muted mt-2 text-center">
            نسبة عدم الحضور {Math.round((a.no_show / apptTotal) * 100)}٪
          </Text>
        ) : null}
      </Card>

      <SectionHeader title="أكبر الذمم" />
      <Card>
        {debtors.length === 0 ? (
          <Text className="text-sm text-muted text-center py-4">لا ذمم مستحقة 🎉</Text>
        ) : (
          debtors.map((d) => (
            <Pressable
              key={d.patient.id}
              onPress={() => router.push({ pathname: "/clinic/patient/[id]", params: { id: d.patient.id } })}
              className="flex-row justify-between py-2 border-b border-line"
            >
              <Text w="semi">{d.patient.name}</Text>
              <Text w="bold" style={{ color: "#DC2626" }}>
                {fmtMoney(d.balance, currency)}
              </Text>
            </Pressable>
          ))
        )}
      </Card>
    </Screen>
  );
}
