import { useSettings } from "@/store/useSettings";
import type { ShiftType } from "@/types";
import { TYPE_META } from "@/constants/shiftTypes";

/**
 * يشترك في ألوان الأنواع وإعدادات أماكن العمل: استدعِه داخل أي مكوّن يقرأ TYPE_META
 * حتى يُعاد رسمه فور تغييرها.
 */
export function useTheme() {
  useSettings((s) => s.typeColors);
  return useSettings((s) => s.workplaces);
}

/** لون نوع واحد (hex) مع الاشتراك في تغييره */
export function useTypeColor(type: ShiftType): string {
  useTheme();
  return TYPE_META[type].hex;
}
