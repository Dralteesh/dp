import type { AppointmentStatus, ToothStatus } from "@/types";

/** كتالوج إجراءات سريع (الاسم + المدة الافتراضية بالدقائق) */
export const PROCEDURES: { name: string; minutes: number }[] = [
  { name: "كشف واستشارة", minutes: 20 },
  { name: "حشوة", minutes: 45 },
  { name: "معالجة لبية", minutes: 60 },
  { name: "قلع", minutes: 30 },
  { name: "تنظيف وتلميع", minutes: 30 },
  { name: "تقويم - مراجعة", minutes: 20 },
  { name: "تاج / جسر", minutes: 60 },
  { name: "زرع", minutes: 90 },
  { name: "تبييض", minutes: 60 },
  { name: "مراجعة", minutes: 15 },
];

export const DURATIONS = [15, 20, 30, 45, 60, 90, 120];

export const STATUS_META: Record<
  AppointmentStatus,
  { label: string; hex: string; soft: string }
> = {
  scheduled: { label: "مجدول", hex: "#2563EB", soft: "#DBEAFE" },
  arrived: { label: "وصل", hex: "#0891B2", soft: "#CFFAFE" },
  done: { label: "تم", hex: "#16A34A", soft: "#DCFCE7" },
  no_show: { label: "لم يحضر", hex: "#DC2626", soft: "#FEE2E2" },
  postponed: { label: "مؤجل", hex: "#D97706", soft: "#FEF3C7" },
  cancelled: { label: "ملغى", hex: "#6B7280", soft: "#F3F4F6" },
};

export const TOOTH_STATUS: Record<
  ToothStatus,
  { label: string; hex: string; soft: string }
> = {
  caries: { label: "نخر", hex: "#EF4444", soft: "#FEE2E2" },
  filling: { label: "حشوة", hex: "#3B82F6", soft: "#DBEAFE" },
  rct: { label: "معالجة لبية", hex: "#F97316", soft: "#FFEDD5" },
  crown: { label: "تاج", hex: "#CA8A04", soft: "#FEF9C3" },
  implant: { label: "زرعة", hex: "#8B5CF6", soft: "#EDE9FE" },
  missing: { label: "مفقود", hex: "#6B7280", soft: "#E5E7EB" },
  extraction: { label: "مطلوب قلعه", hex: "#111827", soft: "#D1D5DB" },
};

/** ترتيب الأسنان الدائمة (FDI) كما تُرى من وجه المريض */
export const UPPER_TEETH = [
  "18", "17", "16", "15", "14", "13", "12", "11",
  "21", "22", "23", "24", "25", "26", "27", "28",
];
export const LOWER_TEETH = [
  "48", "47", "46", "45", "44", "43", "42", "41",
  "31", "32", "33", "34", "35", "36", "37", "38",
];
