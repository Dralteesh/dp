import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { TYPE_META, type IconName } from "@/constants/shiftTypes";
import type { ShiftType } from "@/types";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: "solid" | "soft" | "outline" | "danger" | "ghost";
  /** يلوّن الزر بلون النوع */
  type?: ShiftType;
  icon?: IconName;
  disabled?: boolean;
  small?: boolean;
  className?: string;
};

export function Button({
  label,
  onPress,
  variant = "solid",
  type,
  icon,
  disabled,
  small,
  className = "",
}: Props) {
  useTheme();
  const meta = type ? TYPE_META[type] : null;

  let bg = "bg-ink";
  let text = "text-white";
  let iconColor = "#FFFFFF";
  let border = "border border-transparent";

  if (variant === "solid" && meta) {
    bg = meta.cls.bg;
    text = meta.cls.onSolid;
    iconColor = meta.onSolid;
  } else if (variant === "soft") {
    bg = meta ? meta.cls.soft : "bg-slate-100";
    text = meta ? meta.cls.text : "text-ink";
    iconColor = meta ? meta.inkHex : "#0F172A";
  } else if (variant === "outline") {
    bg = "bg-surface";
    text = meta ? meta.cls.text : "text-ink";
    border = meta ? `border ${meta.cls.border}` : "border border-line";
    iconColor = meta ? meta.inkHex : "#0F172A";
  } else if (variant === "danger") {
    bg = "bg-red-50";
    text = "text-danger";
    iconColor = "#DC2626";
  } else if (variant === "ghost") {
    bg = "bg-transparent";
    text = "text-ink";
    iconColor = "#0F172A";
  }

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center justify-center gap-2 rounded-2xl ${bg} ${border} ${
        small ? "px-3 py-2" : "px-4 py-3"
      } ${disabled ? "opacity-40" : ""} ${className}`}
    >
      {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={iconColor} /> : null}
      <Text w="semi" className={`${text} ${small ? "text-sm" : "text-base"}`}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** زر دائري صغير بأيقونة فقط */
export function IconButton({
  icon,
  onPress,
  color = "#0F172A",
  className = "",
}: {
  icon: IconName;
  onPress?: () => void;
  color?: string;
  className?: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      className={`w-10 h-10 rounded-full bg-surface border border-line items-center justify-center ${className}`}
    >
      <View>
        <Ionicons name={icon} size={20} color={color} />
      </View>
    </PressableScale>
  );
}
