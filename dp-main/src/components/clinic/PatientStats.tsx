import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { fmtMoney } from "@/lib/format";
import { todayISO } from "@/lib/dates";
import type { Appointment, ClinicSession, Patient } from "@/types";

type Props = {
  patient: Patient;
  appointments: Appointment[];
  sessions: ClinicSession[];
  balance: number;
  currency: string;
};

/** أربعة مؤشرات سريعة أعلى ملف المريض (إضافة: لا تستبدل شيئًا) */
export function PatientStats({ patient, appointments, sessions, balance, currency }: Props) {
  const today = todayISO();
  const upcoming = appointments.filter(
    (a) => a.patientId === patient.id && a.date >= today && (a.status === "scheduled" || a.status === "arrived"),
  ).length;
  const last = sessions
    .filter((s) => s.patientId === patient.id)
    .sort((a, b) => (a.date < b.date ? 1 : a.createdAt < b.createdAt ? 1 : -1))[0];

  const tiles: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; hex: string; soft: string }[] = [
    { icon: "medical-outline", label: "أسنان مسجّلة", value: String(Object.keys(patient.teeth).length), hex: "#0E6FA5", soft: "#D6EBF7" },
    { icon: "calendar-outline", label: "مواعيد قادمة", value: String(upcoming), hex: "#2563EB", soft: "#DBEAFE" },
    {
      icon: "card-outline",
      label: "الرصيد المستحق",
      value: fmtMoney(Math.max(balance, 0), currency),
      hex: balance > 0 ? "#DC2626" : "#16A34A",
      soft: balance > 0 ? "#FEE2E2" : "#DCFCE7",
    },
    {
      icon: "pulse-outline",
      label: "آخر إجراء",
      value: last ? `${last.procedure}${last.tooth ? ` · ${last.tooth}` : ""}` : "—",
      hex: "#7C3AED",
      soft: "#EDE9FE",
    },
  ];

  return (
    <View className="flex-row flex-wrap gap-2 mb-3">
      {tiles.map((t) => (
        <View
          key={t.label}
          className="rounded-2xl p-3 flex-row items-center gap-2.5"
          style={{ backgroundColor: t.soft, width: "48.5%" }}
        >
          <View className="w-9 h-9 rounded-xl items-center justify-center bg-white/70">
            <Ionicons name={t.icon} size={18} color={t.hex} />
          </View>
          <View className="flex-1">
            <Text className="text-[11px]" style={{ color: t.hex }} numberOfLines={1}>
              {t.label}
            </Text>
            <Text w="bold" className="text-sm" style={{ color: t.hex }} numberOfLines={1}>
              {t.value}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
