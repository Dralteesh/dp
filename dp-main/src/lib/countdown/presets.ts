import { mix, luminance } from "../color";
import type { CdFont, CdRepeatType, CdTextPos, CdUnitMode, Countdown } from "../../types/countdown";

export const CD_COLORS = ["#6366F1", "#8B5CF6", "#EC4899", "#F43F5E", "#F97316", "#F59E0B", "#10B981", "#14B8A6", "#0EA5E9", "#2563EB", "#64748B", "#1E293B"];

export type GradientPreset = { id: string; name: string; colors: [string, string] };
export const CD_GRADIENTS: GradientPreset[] = [
  { id: "auto", name: "من اللون", colors: ["#6366F1", "#312E81"] },
  { id: "aurora", name: "شفق", colors: ["#6366F1", "#8B5CF6"] },
  { id: "sunset", name: "غروب", colors: ["#F97316", "#EC4899"] },
  { id: "ocean", name: "محيط", colors: ["#0EA5E9", "#2563EB"] },
  { id: "forest", name: "غابة", colors: ["#10B981", "#047857"] },
  { id: "rose", name: "ورد", colors: ["#F43F5E", "#BE123C"] },
  { id: "gold", name: "ذهب", colors: ["#F59E0B", "#B45309"] },
  { id: "mint", name: "نعناع", colors: ["#2DD4BF", "#0F766E"] },
  { id: "plum", name: "عنّاب", colors: ["#A855F7", "#6D28D9"] },
  { id: "night", name: "ليل", colors: ["#334155", "#0F172A"] },
];

/** ألوان التدرّج الفعلية لعدّاد */
export function gradientColors(cd: Pick<Countdown, "color" | "bg">): [string, string] {
  const g = CD_GRADIENTS.find((x) => x.id === cd.bg.gradient);
  if (!g || g.id === "auto") return [cd.color, mix(cd.color, "#000000", 0.4)];
  return g.colors;
}

/** لون نص مقروء فوق خلفية العدّاد */
export function inkOn(cd: Pick<Countdown, "color" | "bg">): string {
  if (cd.bg.kind === "image" || cd.bg.kind === "video") return "#FFFFFF";
  const base = cd.bg.kind === "color" ? cd.color : gradientColors(cd)[0];
  return luminance(base) > 0.6 ? "#111827" : "#FFFFFF";
}

export const CD_EMOJIS = ["🎂", "✈️", "🎓", "📝", "💍", "🎉", "🏆", "🕋", "🌙", "🏥", "🦷", "💼", "🏠", "🚗", "👶", "❤️", "🎯", "📅", "⚽", "🌴", "🎁", "📚", "💪", "⭐"];

export const UNIT_OPTIONS: { value: CdUnitMode; label: string }[] = [
  { value: "auto", label: "تلقائي" },
  { value: "full", label: "كامل" },
  { value: "days", label: "أيام" },
  { value: "weeks", label: "أسابيع" },
  { value: "months", label: "أشهر" },
  { value: "years", label: "سنوات" },
  { value: "hours", label: "ساعات" },
  { value: "minutes", label: "دقائق" },
  { value: "seconds", label: "ثوانٍ" },
];

export const REPEAT_OPTIONS: { value: CdRepeatType; label: string }[] = [
  { value: "none", label: "بلا تكرار" },
  { value: "daily", label: "يوميًا" },
  { value: "weekly", label: "أسبوعيًا" },
  { value: "monthly", label: "شهريًا" },
  { value: "yearly", label: "سنويًا" },
  { value: "days", label: "كل N يوم" },
];

export const TEXT_POS_OPTIONS: { value: CdTextPos; label: string }[] = [
  { value: "top", label: "أعلى" },
  { value: "center", label: "وسط" },
  { value: "bottom", label: "أسفل" },
];
export const FONT_OPTIONS: { value: CdFont; label: string; family: string }[] = [
  { value: "cairo", label: "Cairo", family: "Cairo_700Bold" },
  { value: "amiri", label: "أميري", family: "AmiriQuran_400Regular" },
];
export const fontFamily = (f: CdFont, bold = true) => (f === "amiri" ? "AmiriQuran_400Regular" : bold ? "Cairo_700Bold" : "Cairo_400Regular");

/** تذكيرات جاهزة (بالدقائق قبل الحدث) */
export const REMINDER_PRESETS = [10, 30, 60, 180, 1440, 2880, 10080];

export function blankCountdown(): Omit<Countdown, "id" | "createdAt" | "updatedAt"> {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    title: "",
    description: "",
    emoji: "🎯",
    direction: "down",
    date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    time: "09:00",
    repeat: { type: "none" },
    unit: "auto",
    color: CD_COLORS[0],
    bg: { kind: "gradient", gradient: "auto", dim: 0.35 },
    text: { pos: "center", scale: 1, opacity: 1, font: "cairo" },
    reminders: [],
    notifyAtEvent: true,
    favorite: false,
    pinned: false,
  };
}

/** يكمّل أي حقول ناقصة (نسخ قديمة، مزامنة، استيراد) ويصحّح القيم الخارجة عن النطاق */
export function normalizeCountdown(raw: Partial<Countdown> & { id: string }): Countdown {
  const b = blankCountdown();
  const clamp = (n: unknown, lo: number, hi: number, d: number) => (typeof n === "number" && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d);
  const now = Date.now();
  return {
    ...b,
    ...raw,
    title: String(raw.title ?? ""),
    direction: raw.direction === "up" ? "up" : "down",
    repeat: { type: raw.repeat?.type ?? "none", every: raw.repeat?.every },
    bg: { ...b.bg, ...raw.bg },
    text: {
      pos: raw.text?.pos ?? b.text.pos,
      font: raw.text?.font ?? b.text.font,
      scale: clamp(raw.text?.scale, 0.7, 1.5, 1),
      opacity: clamp(raw.text?.opacity, 0.4, 1, 1),
    },
    reminders: Array.isArray(raw.reminders) ? raw.reminders.filter((r) => r && Number.isFinite(r.minutes)) : [],
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
  };
}
