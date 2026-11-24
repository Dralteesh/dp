import { useColorScheme } from "react-native";
import type { Mode } from "@/design/tokens";
import { useCountdowns } from "@/store/useCountdowns";

/** الوضع الفعلي لشاشات العدّادات: ليلي/نهاري حسب اختيار المستخدم أو النظام */
export function useCdMode(): Mode {
  const theme = useCountdowns((s) => s.theme);
  const sys = useColorScheme();
  if (theme === "light") return "day";
  if (theme === "dark") return "night";
  return sys === "dark" ? "night" : "day";
}
