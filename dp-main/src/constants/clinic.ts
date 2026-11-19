import type { AppointmentStatus, ProcedureDef, ToothStatus } from "@/types";

/** الإجراءات الافتراضية (قيم افتراضية فقط؛ يعدّلها المستخدم من «تعديل الإجراءات») */
export const DEFAULT_PROCEDURES: ProcedureDef[] = [
  { id: "p-exam", name: "كشف واستشارة", minutes: 20, icon: { kind: "asset", key: "exam" }, keywords: ["كشف", "استشارة", "فحص", "معاينة", "تشخيص"] },
  { id: "p-filling", name: "حشوة", minutes: 45, icon: { kind: "asset", key: "filling" }, keywords: ["حشوة", "حشو", "ترميم", "تسوس", "نخر", "كومبوزيت", "املغم", "حشوه"] },
  { id: "p-rct", name: "معالجة لبية", minutes: 60, icon: { kind: "asset", key: "rct" }, keywords: ["معالجة لبية", "لبية", "عصب", "سحب عصب", "قناة", "قنوات", "RCT", "علاج عصب"] },
  { id: "p-extraction", name: "قلع", minutes: 30, icon: { kind: "asset", key: "extraction" }, keywords: ["قلع", "خلع", "استئصال", "ضرس عقل", "جراحة فموية"] },
  { id: "p-cleaning", name: "تنظيف وتلميع", minutes: 30, icon: { kind: "asset", key: "cleaning" }, keywords: ["تنظيف", "تلميع", "جير", "تقشير", "ازالة جير", "لثة"] },
  { id: "p-ortho", name: "تقويم - مراجعة", minutes: 20, icon: { kind: "asset", key: "ortho" }, keywords: ["تقويم", "مراجعة تقويم", "تفعيل تقويم", "اسلاك", "براكيت", "تقويم اسنان"] },
  { id: "p-crown", name: "تاج / جسر", minutes: 60, icon: { kind: "asset", key: "crown" }, keywords: ["تاج", "جسر", "تلبيسة", "تلبيس", "كراون", "قشرة", "فينير", "طقم", "تركيب"] },
  { id: "p-implant", name: "زرع", minutes: 90, icon: { kind: "asset", key: "implant" }, keywords: ["زرع", "زرعة", "implant", "غرسة"] },
  { id: "p-whitening", name: "تبييض", minutes: 60, icon: { kind: "asset", key: "whitening" }, keywords: ["تبييض", "تبيض", "بلييتش", "تفتيح"] },
  { id: "p-followup", name: "مراجعة", minutes: 15, icon: { kind: "asset", key: "followup" }, keywords: ["مراجعة", "متابعة", "اعادة", "فحص دوري"] },
];

/** للاستعمال خارج React (قيم افتراضية فقط، وللعرض يُفضَّل useProcedures) */
export const PROCEDURES: { name: string; minutes: number }[] = DEFAULT_PROCEDURES.map((p) => ({ name: p.name, minutes: p.minutes }));

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
  sealant: { label: "سدّ شقوق", hex: "#22A06B", soft: "#DCFCE7" },
};

/** خلفية بطاقة مخطط الأسنان (بنفسجي مزرق قريب من الصورة المرجعية) — سهل التعديل */
export const ODONTO_BG = "#4A4BA3";

/** ترتيب الأسنان الدائمة (FDI) كما تُرى من وجه المريض: يمين المريض على اليسار */
export const UPPER_TEETH = [
  "18", "17", "16", "15", "14", "13", "12", "11",
  "21", "22", "23", "24", "25", "26", "27", "28",
];
export const LOWER_TEETH = [
  "48", "47", "46", "45", "44", "43", "42", "41",
  "31", "32", "33", "34", "35", "36", "37", "38",
];
/** الأسنان اللبنية (FDI 51–85): 5 في كل ربع */
export const UPPER_PRIMARY = ["55", "54", "53", "52", "51", "61", "62", "63", "64", "65"];
export const LOWER_PRIMARY = ["85", "84", "83", "82", "81", "71", "72", "73", "74", "75"];

export const EXPENSE_CATEGORIES: Record<import("@/types").ExpenseCategory, string> = {
  rent: "إيجار",
  materials: "مواد",
  lab: "مخبر",
  salary: "رواتب",
  utilities: "كهرباء وماء",
  maintenance: "صيانة",
  other: "أخرى",
};
