import { View } from "react-native";
import { Chip } from "@/components/ui/Chip";
import { FieldRow } from "@/components/ui/Field";
import { ALERT_META, ALERT_ORDER } from "@/lib/alerts";
import type { AlertFlag } from "@/types";

/** اختيار تنبيهات طبية مصنّفة (يضاف لحقل «تنبيهات طبية» النصي) */
export function AlertFlagPicker({ value, onChange }: { value: AlertFlag[]; onChange: (v: AlertFlag[]) => void }) {
  const toggle = (f: AlertFlag) => onChange(value.includes(f) ? value.filter((x) => x !== f) : [...value, f]);
  return (
    <FieldRow label="تنبيهات مصنّفة (تظهر بشريط بارز وتفحص الوصفات)">
      <View className="flex-row flex-wrap gap-2">
        {ALERT_ORDER.map((f) => (
          <Chip
            key={f}
            label={ALERT_META[f].label}
            selected={value.includes(f)}
            color={ALERT_META[f].level === "high" ? "#DC2626" : "#D97706"}
            onPress={() => toggle(f)}
          />
        ))}
      </View>
    </FieldRow>
  );
}
