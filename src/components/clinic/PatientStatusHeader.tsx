import { useMemo } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { usePatientTypes } from "@/hooks/usePatientTypes";
import { planSummary } from "@/lib/clinicLink";
import { fmtDateShort, fmtTime, todayISO } from "@/lib/dates";
import { fmtMoney } from "@/lib/format";
import { PATIENT_TYPES } from "@/lib/patientType";
import { patientBalance, useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";

/** «الحالة الآن» لمريض: الموعد القادم، المتبقي من الخطة، الرصيد، والأنواع الفعّالة — شريط واحد يربط الأقسام */
export function PatientStatusHeader({ patientId }: { patientId: string }) {
  const currency = useSettings((s) => s.currency);
  const appointments = useClinic((s) => s.appointments);
  const plans = useClinic((s) => s.plans);
  const sessions = useClinic((s) => s.sessions);
  const payments = useClinic((s) => s.payments);
  const { types } = usePatientTypes(patientId);
  const today = todayISO();

  const next = useMemo(
    () =>
      appointments
        .filter((a) => a.patientId === patientId && a.status === "scheduled" && a.date >= today)
        .sort((a, b) => (a.date === b.date ? (a.startTime < b.startTime ? -1 : 1) : a.date < b.date ? -1 : 1))[0],
    [appointments, patientId, today],
  );
  const sum = planSummary(plans, patientId);
  const bal = patientBalance(patientId, sessions, payments);

  const cell = (icon: "calendar-outline" | "clipboard-outline" | "wallet-outline", label: string, value: string, hex: string) => (
    <View className="flex-1 rounded-2xl p-2.5" style={{ backgroundColor: hex + "18" }}>
      <View className="flex-row items-center gap-1">
        <Ionicons name={icon} size={13} color={hex} />
        <Text className="text-xs" style={{ color: hex }}>
          {label}
        </Text>
      </View>
      <Text w="bold" className="text-sm mt-0.5" style={{ color: hex }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );

  return (
    <Card className="mt-3">
      <View className="flex-row gap-2">
        {cell("calendar-outline", "الموعد القادم", next ? `${fmtDateShort(next.date)} ${fmtTime(next.startTime)}` : "لا يوجد", next ? "#2563EB" : "#D97706")}
        {cell("clipboard-outline", "المتبقي من الخطة", sum.open ? `${sum.open} بند • ${fmtMoney(sum.openCost, currency)}` : "لا بنود مفتوحة", "#0F766E")}
        {cell("wallet-outline", "الرصيد", bal.balance > 0 ? fmtMoney(bal.balance, currency) : "مسدَّد", bal.balance > 0 ? "#DC2626" : "#16A34A")}
      </View>
      {types.length ? (
        <View className="flex-row flex-wrap gap-1.5 mt-2">
          {types.map((k) => (
            <View key={k} className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: PATIENT_TYPES[k].hex + "22" }}>
              <Text w="semi" className="text-xs" style={{ color: PATIENT_TYPES[k].hex }}>
                {PATIENT_TYPES[k].label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}
