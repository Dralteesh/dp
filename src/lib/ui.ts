import { router } from "expo-router";
import { useSettings } from "@/store/useSettings";

/** التبديل بين الواجهة الجديدة والكلاسيكية (يُحفظ الاختيار ويُعتمد عند الفتح التالي) */
export function switchUi(mode: "planner" | "classic") {
  useSettings.getState().update({ uiMode: mode });
  router.replace((mode === "planner" ? "/planner/home" : "/") as never);
}

/** خلفية الشاشات المحايدة بحسب الواجهة المعتمدة */
export function screenBg(): string {
  return useSettings.getState().uiMode === "planner" ? "#EAF3FC" : "#F4F4F4";
}
