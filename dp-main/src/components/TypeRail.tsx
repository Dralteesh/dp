import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TYPE_META } from "@/constants/shiftTypes";
import { useActiveTypes } from "@/hooks/useActiveTypes";
import { useTheme } from "@/hooks/useTheme";
import type { ShiftType } from "@/types";

/** شريط جانبي داكن لتصفية القائمة حسب النوع (من تصميم Tasks List) */
export function TypeRail({
  value,
  onChange,
  counts,
}: {
  value: ShiftType | "all";
  onChange: (v: ShiftType | "all") => void;
  counts?: Partial<Record<ShiftType, number>>;
}) {
  useTheme();
  const types = useActiveTypes();
  return (
    <View className="rounded-3xl items-center py-3 gap-2.5" style={{ backgroundColor: "#1E2229", width: 54, alignSelf: "flex-start" }}>
      <Pressable
        onPress={() => onChange("all")}
        className="w-10 h-10 rounded-xl items-center justify-center"
        style={{ backgroundColor: value === "all" ? "#FFFFFF" : "#2B313B" }}
      >
        <Ionicons name="apps" size={18} color={value === "all" ? "#1E2229" : "#9AA3AF"} />
      </Pressable>
      {types.map((t) => {
        const m = TYPE_META[t];
        const on = value === t;
        return (
          <Pressable
            key={t}
            onPress={() => onChange(on ? "all" : t)}
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: on ? m.hex : "#2B313B", borderWidth: on ? 0 : 1, borderColor: m.hex }}
          >
            <Ionicons name={m.icon} size={18} color={on ? m.onSolid : m.hex} />
          </Pressable>
        );
      })}
    </View>
  );
}
