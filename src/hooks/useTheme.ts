import { useSettings } from "@/store/useSettings";
import type { ShiftType } from "@/types";
import { TYPE_META } from "@/constants/shiftTypes";

/**
 * يشترك في ألوان الأنواع: استدعِه داخل أي مكوّن يقرأ TYPE_META
 * حتى يُعاد رسمه فور تغيير الألوان من شاشة «المظهر والشعارات».
 */
export function useTheme() {
  return useSettings((s) => s.colors);
}

/** لون نوع واحد (hex) مع الاشتراك في تغييره */
export function useTypeColor(type: ShiftType): string {
  useSettings((s) => s.colors);
  return TYPE_META[type].hex;
}
