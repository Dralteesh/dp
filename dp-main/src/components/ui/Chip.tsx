import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { TYPE_META, type IconName } from "@/constants/shiftTypes";
import { useActiveTypes } from "@/hooks/useActiveTypes";
import type { ShiftType } from "@/types";
import { useTheme } from "@/hooks/useTheme";

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  /** لون التحديد (hex)، الافتراضي أسود فحمي */
  color?: string;
  textColor?: string;
};

export function Chip({ label, selected, onPress, icon, color = "#0F172A", textColor = "#FFFFFF" }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-1.5 rounded-full px-3.5 py-2 border"
      style={{
        backgroundColor: selected ? color : "#FFFFFF",
        borderColor: selected ? color : "#E3E1D8",
      }}
    >
      {icon ? <Ionicons name={icon} size={14} color={selected ? textColor : "#475569"} /> : null}
      <Text w="semi" className="text-sm" style={{ color: selected ? textColor : "#475569" }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** شارة صغيرة بلون النوع */
export function TypeBadge({ type, short }: { type: ShiftType; short?: boolean }) {
  useTheme();
  const m = TYPE_META[type];
  return (
    <View
      className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
      style={{ backgroundColor: m.soft }}
    >
      <Ionicons name={m.icon} size={12} color={m.inkHex} />
      <Text w="semi" className="text-xs" style={{ color: m.inkHex }}>
        {short ? m.short : m.label}
      </Text>
    </View>
  );
}

/** اختيار نوع من الأنواع الأربعة */
export function TypeSelector({
  value,
  onChange,
  allowNone,
}: {
  value?: ShiftType;
  onChange: (t: ShiftType | undefined) => void;
  /** يسمح بإلغاء الاختيار بالضغط ثانيةً */
  allowNone?: boolean;
}) {
  useTheme();
  const types = useActiveTypes();
  return (
    <View className="flex-row flex-wrap gap-2">
      {types.map((t) => {
        const m = TYPE_META[t];
        return (
          <Chip
            key={t}
            label={m.label}
            icon={m.icon}
            selected={value === t}
            color={m.hex}
            textColor={m.onSolid}
            onPress={() => onChange(allowNone && value === t ? undefined : t)}
          />
        );
      })}
    </View>
  );
}

/** تبويبات أقراص: الفعّال أسود والباقي أبيض بإطار (من تصميم Today / Calendar) */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            className="flex-1 items-center rounded-full py-2.5 border"
            style={{ backgroundColor: active ? "#111418" : "#FFFFFF", borderColor: active ? "#111418" : "#D9D6CC" }}
          >
            <Text w={active ? "bold" : "semi"} style={{ color: active ? "#FFFFFF" : "#475569" }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
