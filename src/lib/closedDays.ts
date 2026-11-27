import { Alert } from "react-native";
import { useSettings } from "@/store/useSettings";

/** هل التاريخ ضمن أيام أُغلقت ماليًا؟ */
export const isClosedDay = (iso: string): boolean => {
  const c = useSettings.getState().closedThrough;
  return !!c && iso <= c;
};

/**
 * يُنفّذ العملية فورًا إن كان اليوم مفتوحًا، وإلا يطلب تأكيدًا صريحًا («بإذن»).
 * الأيام المغلقة تحمي أرقام التقارير من تعديل غير مقصود.
 */
export function confirmIfClosed(iso: string | string[], what: string, onOk: () => void): void {
  const dates = Array.isArray(iso) ? iso : [iso];
  const hit = dates.find((d) => d && isClosedDay(d));
  if (!hit) return onOk();
  Alert.alert("يوم مغلق ماليًا", `${what} بتاريخ ${hit} يقع ضمن أيام أُغلقت. هل تريد المتابعة رغم ذلك؟`, [
    { text: "إلغاء", style: "cancel" },
    { text: "متابعة", style: "destructive", onPress: onOk },
  ]);
}
