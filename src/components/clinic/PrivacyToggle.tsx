import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDevice } from "@/store/useDevice";

/** عين لإخفاء/إظهار الأرقام المالية أمام المرضى (لهذا الجهاز فقط) */
export function PrivacyToggle({ color = "#64748B" }: { color?: string }) {
  const hide = useDevice((s) => !!s.hideMoney);
  const set = useDevice((s) => s.set);
  return (
    <Pressable hitSlop={10} onPress={() => set({ hideMoney: !hide })} accessibilityLabel={hide ? "إظهار الأرقام المالية" : "إخفاء الأرقام المالية"}>
      <Ionicons name={hide ? "eye-off-outline" : "eye-outline"} size={20} color={color} />
    </Pressable>
  );
}
