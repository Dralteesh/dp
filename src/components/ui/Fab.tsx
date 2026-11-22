import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui/PressableScale";
import { fabSide } from "@/lib/rtl";
import type { IconName } from "@/constants/shiftTypes";

type Props = {
  onPress: () => void;
  icon?: IconName;
  color?: string;
  iconColor?: string;
  /** المسافة من الأسفل (الافتراضي بمحاذاة الزر العائم الأوسط) */
  bottom?: number;
};

/** زر عائم أسفل الشاشة (فوق شريط التبويبات) */
export function Fab({ onPress, icon = "add", color = "#6366F1", iconColor = "#FFFFFF", bottom = 28 }: Props) {
  return (
    <View style={{ position: "absolute", bottom, ...fabSide() }} pointerEvents="box-none">
      <PressableScale
        onPress={onPress}
        className="w-14 h-14 rounded-full items-center justify-center"
        style={{
          backgroundColor: color,
          borderWidth: 0,
          borderColor: "#6366F1",
          elevation: 6,
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
        }}
      >
        <Ionicons name={icon} size={28} color={iconColor} />
      </PressableScale>
    </View>
  );
}
