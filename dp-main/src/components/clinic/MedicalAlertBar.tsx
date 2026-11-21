import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { ALERT_META, patientFlags } from "@/lib/alerts";
import type { Patient } from "@/types";

type P = Pick<Patient, "alertFlags" | "medicalAlerts">;

/** شريط تنبيهات المريض الطبية: شارات مصنّفة بالأحمر (خطير) والأصفر (للانتباه) + النص الحر */
export function MedicalAlertBar({ patient, compact }: { patient: P; compact?: boolean }) {
  const flags = patientFlags(patient);
  const text = patient.medicalAlerts?.trim();
  if (!flags.length && !text) return null;

  const chips = flags.map((f) => {
    const high = ALERT_META[f].level === "high";
    return (
      <View
        key={f}
        className="flex-row items-center gap-1 rounded-full px-2.5 py-0.5"
        style={{ backgroundColor: high ? "#DC2626" : "#FEF3C7" }}
      >
        {high ? <Ionicons name="warning" size={11} color="#FFFFFF" /> : null}
        <Text w="semi" className="text-xs" style={{ color: high ? "#FFFFFF" : "#92400E" }}>
          {ALERT_META[f].label}
        </Text>
      </View>
    );
  });

  if (compact) return <View className="flex-row flex-wrap gap-1.5 mt-2">{chips}</View>;

  return (
    <View className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-3">
      <View className="flex-row items-center gap-2 mb-1.5">
        <Ionicons name="warning" size={20} color="#DC2626" />
        <Text w="bold" className="text-danger text-sm">
          تنبيه طبي
        </Text>
      </View>
      {chips.length ? <View className="flex-row flex-wrap gap-1.5 mb-1.5">{chips}</View> : null}
      {text ? <Text className="text-danger">{text}</Text> : null}
    </View>
  );
}

/** سطور تحذير نصية (من الوصفة/الإجراء) بإطار أصفر */
export function WarningLines({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <View className="bg-amber-50 border border-amber-300 rounded-xl p-3 mb-3 gap-1">
      {lines.map((l, i) => (
        <View key={i} className="flex-row gap-2 items-start">
          <Ionicons name="alert-circle" size={16} color="#B45309" style={{ marginTop: 3 }} />
          <Text className="flex-1 text-sm" style={{ color: "#92400E" }}>
            {l}
          </Text>
        </View>
      ))}
      <Text className="text-xs" style={{ color: "#B45309" }}>
        تذكير مساعد فقط، والقرار لك.
      </Text>
    </View>
  );
}
