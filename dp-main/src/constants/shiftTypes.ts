import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";
import { resolveTypeColors } from "@/constants/palette";
import type { Priority, ShiftType, WorkplaceConfig } from "@/types";

export type IconName = ComponentProps<typeof Ionicons>["name"];

type TypeMeta = {
  label: string;
  short: string;
  icon: IconName;
  /** اللون الكامل */
  hex: string;
  /** خلفية فاتحة */
  soft: string;
  /** نص غامق مناسب للخلفية الفاتحة */
  inkHex: string;
  /** نص مناسب فوق اللون الكامل (الأصفر يحتاج نصًا غامقًا) */
  onSolid: string;
  /** أصناف Tailwind مكتوبة كاملة (لا تُبنى ديناميكيًا حتى لا تُحذف) */
  cls: {
    bg: string;
    soft: string;
    text: string;
    border: string;
    onSolid: string;
  };
  defaultTitle: string;
  defaults: { start: string; end: string; endsNextDay: boolean; alarmMinutes: number | null };
  /** المكان الافتراضي للحدث */
  place: string;
};

/** الأنواع الأساسية الأربعة */
export const BUILTIN_TYPES: ShiftType[] = ["hospital", "maxillo", "private", "personal"];
/** خانات الأماكن المخصّصة */
export const CUSTOM_SLOTS: ShiftType[] = ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"];
/** كل الخانات الممكنة (للألوان ومتغيرات CSS) */
export const SHIFT_TYPES: ShiftType[] = [...BUILTIN_TYPES, ...CUSTOM_SLOTS];

export const DEFAULT_PLACE = "مشفى حماه الوطني";

export const TYPE_META: Record<ShiftType, TypeMeta> = {
  hospital: {
    label: "عيادة المشفى",
    short: "المشفى",
    icon: "medkit",
    hex: "#2563EB",
    soft: "#DBEAFE",
    inkHex: "#1E3A8A",
    onSolid: "#FFFFFF",
    cls: {
      bg: "bg-hospital",
      soft: "bg-hospital-soft",
      text: "text-hospital-ink",
      border: "border-hospital",
      onSolid: "text-white",
    },
    defaultTitle: "دوام عيادة المشفى",
    defaults: { start: "08:00", end: "14:00", endsNextDay: false, alarmMinutes: null },
    place: DEFAULT_PLACE,
  },
  maxillo: {
    label: "مناوبة جراحة الوجه والفكين",
    short: "مناوبة",
    icon: "moon",
    hex: "#EAB308",
    soft: "#FEF3C7",
    inkHex: "#713F12",
    onSolid: "#422006",
    cls: {
      bg: "bg-maxillo",
      soft: "bg-maxillo-soft",
      text: "text-maxillo-ink",
      border: "border-maxillo",
      onSolid: "text-maxillo-ink",
    },
    defaultTitle: "مناوبة جراحة الوجه والفكين",
    defaults: { start: "08:00", end: "08:00", endsNextDay: true, alarmMinutes: 60 },
    place: DEFAULT_PLACE,
  },
  private: {
    label: "العيادة الخاصة",
    short: "الخاصة",
    icon: "storefront",
    hex: "#0E6FA5",
    soft: "#D6EBF7",
    inkHex: "#0A3A5A",
    onSolid: "#FFFFFF",
    cls: {
      bg: "bg-private",
      soft: "bg-private-soft",
      text: "text-private-ink",
      border: "border-private",
      onSolid: "text-white",
    },
    defaultTitle: "دوام العيادة الخاصة",
    defaults: { start: "16:00", end: "20:00", endsNextDay: false, alarmMinutes: null },
    place: "",
  },
  personal: {
    label: "الأنشطة الشخصية",
    short: "شخصي",
    icon: "sparkles",
    hex: "#7C3AED",
    soft: "#EDE9FE",
    inkHex: "#4C1D95",
    onSolid: "#FFFFFF",
    cls: {
      bg: "bg-personal",
      soft: "bg-personal-soft",
      text: "text-personal-ink",
      border: "border-personal",
      onSolid: "text-white",
    },
    defaultTitle: "",
    defaults: { start: "18:00", end: "19:00", endsNextDay: false, alarmMinutes: null },
    place: "",
  },
  w1: {
    label: "مكان عمل",
    short: "مكان",
    icon: "briefcase",
    hex: "#0891B2",
    soft: "#EEEEEE",
    inkHex: "#1E293B",
    onSolid: "#FFFFFF",
    cls: {
      bg: "bg-w1",
      soft: "bg-w1-soft",
      text: "text-w1-ink",
      border: "border-w1",
      onSolid: "text-white",
    },
    defaultTitle: "",
    defaults: { start: "08:00", end: "14:00", endsNextDay: false, alarmMinutes: null },
    place: "",
  },
  w2: {
    label: "مكان عمل",
    short: "مكان",
    icon: "briefcase",
    hex: "#DB2777",
    soft: "#EEEEEE",
    inkHex: "#1E293B",
    onSolid: "#FFFFFF",
    cls: {
      bg: "bg-w2",
      soft: "bg-w2-soft",
      text: "text-w2-ink",
      border: "border-w2",
      onSolid: "text-white",
    },
    defaultTitle: "",
    defaults: { start: "08:00", end: "14:00", endsNextDay: false, alarmMinutes: null },
    place: "",
  },
  w3: {
    label: "مكان عمل",
    short: "مكان",
    icon: "briefcase",
    hex: "#EA580C",
    soft: "#EEEEEE",
    inkHex: "#1E293B",
    onSolid: "#FFFFFF",
    cls: {
      bg: "bg-w3",
      soft: "bg-w3-soft",
      text: "text-w3-ink",
      border: "border-w3",
      onSolid: "text-white",
    },
    defaultTitle: "",
    defaults: { start: "08:00", end: "14:00", endsNextDay: false, alarmMinutes: null },
    place: "",
  },
  w4: {
    label: "مكان عمل",
    short: "مكان",
    icon: "briefcase",
    hex: "#65A30D",
    soft: "#EEEEEE",
    inkHex: "#1E293B",
    onSolid: "#FFFFFF",
    cls: {
      bg: "bg-w4",
      soft: "bg-w4-soft",
      text: "text-w4-ink",
      border: "border-w4",
      onSolid: "text-white",
    },
    defaultTitle: "",
    defaults: { start: "08:00", end: "14:00", endsNextDay: false, alarmMinutes: null },
    place: "",
  },
  w5: {
    label: "مكان عمل",
    short: "مكان",
    icon: "briefcase",
    hex: "#4F46E5",
    soft: "#EEEEEE",
    inkHex: "#1E293B",
    onSolid: "#FFFFFF",
    cls: {
      bg: "bg-w5",
      soft: "bg-w5-soft",
      text: "text-w5-ink",
      border: "border-w5",
      onSolid: "text-white",
    },
    defaultTitle: "",
    defaults: { start: "08:00", end: "14:00", endsNextDay: false, alarmMinutes: null },
    place: "",
  },
  w6: {
    label: "مكان عمل",
    short: "مكان",
    icon: "briefcase",
    hex: "#0D9488",
    soft: "#EEEEEE",
    inkHex: "#1E293B",
    onSolid: "#FFFFFF",
    cls: {
      bg: "bg-w6",
      soft: "bg-w6-soft",
      text: "text-w6-ink",
      border: "border-w6",
      onSolid: "text-white",
    },
    defaultTitle: "",
    defaults: { start: "08:00", end: "14:00", endsNextDay: false, alarmMinutes: null },
    place: "",
  },
  w7: {
    label: "مكان عمل",
    short: "مكان",
    icon: "briefcase",
    hex: "#B45309",
    soft: "#EEEEEE",
    inkHex: "#1E293B",
    onSolid: "#FFFFFF",
    cls: {
      bg: "bg-w7",
      soft: "bg-w7-soft",
      text: "text-w7-ink",
      border: "border-w7",
      onSolid: "text-white",
    },
    defaultTitle: "",
    defaults: { start: "08:00", end: "14:00", endsNextDay: false, alarmMinutes: null },
    place: "",
  },
  w8: {
    label: "مكان عمل",
    short: "مكان",
    icon: "briefcase",
    hex: "#64748B",
    soft: "#EEEEEE",
    inkHex: "#1E293B",
    onSolid: "#FFFFFF",
    cls: {
      bg: "bg-w8",
      soft: "bg-w8-soft",
      text: "text-w8-ink",
      border: "border-w8",
      onSolid: "text-white",
    },
    defaultTitle: "",
    defaults: { start: "08:00", end: "14:00", endsNextDay: false, alarmMinutes: null },
    place: "",
  },
};

/** النسخة الأصلية من القيم الافتراضية (لإرجاع ما لم يُخصَّص) */
const BASE: Record<string, { label: string; short: string; icon: IconName; defaultTitle: string; defaults: TypeMeta["defaults"]; place: string }> = {};
for (const t of Object.keys(TYPE_META) as ShiftType[]) {
  const m = TYPE_META[t];
  BASE[t] = { label: m.label, short: m.short, icon: m.icon, defaultTitle: m.defaultTitle, defaults: { ...m.defaults }, place: m.place };
}

/**
 * يطبّق الألوان وإعدادات أماكن العمل على TYPE_META مباشرة (تعديل في المكان).
 * المكوّنات التي تقرأ TYPE_META تشترك في useTheme() لتُعاد رسمها عند التغيير،
 * أما الأصناف (bg-hospital …) فتتبع متغيرات CSS من ThemeRoot.
 */
export function applyTypeSettings(
  colors: Partial<Record<ShiftType, string>> | undefined,
  workplaces: Partial<Record<ShiftType, Partial<WorkplaceConfig>>> | undefined,
) {
  for (const t of SHIFT_TYPES) {
    const c = resolveTypeColors(t, colors?.[t]);
    const m = TYPE_META[t];
    m.hex = c.hex;
    m.soft = c.soft;
    m.inkHex = c.inkHex;
    m.onSolid = c.onSolid;

    const b = BASE[t];
    const w = workplaces?.[t] ?? {};
    m.label = w.label?.trim() || b.label;
    m.short = w.short?.trim() || w.label?.trim() || b.short;
    m.icon = (w.icon as IconName | undefined) || b.icon;
    m.defaultTitle = w.defaultTitle ?? b.defaultTitle;
    m.defaults = {
      start: w.start || b.defaults.start,
      end: w.end || b.defaults.end,
      endsNextDay: w.endsNextDay ?? b.defaults.endsNextDay,
      alarmMinutes: w.alarmMinutes === undefined ? b.defaults.alarmMinutes : w.alarmMinutes,
    };
    m.place = w.place ?? b.place;
  }
}

/** توافق مع الاستدعاءات القديمة */
export function applyTypeColors(colors: Partial<Record<ShiftType, string>> | undefined) {
  applyTypeSettings(colors, undefined);
}

/** الأنواع الظاهرة للمستخدم: الأساسية غير المخفية + المخصّصة التي أنشأها */
export function activeTypes(workplaces: Partial<Record<ShiftType, Partial<WorkplaceConfig>>> | undefined): ShiftType[] {
  const out: ShiftType[] = [];
  for (const t of BUILTIN_TYPES) if (!workplaces?.[t]?.hidden) out.push(t);
  for (const t of CUSTOM_SLOTS) if (workplaces?.[t]?.custom) out.push(t);
  return out.length ? out : ["hospital"];
}

export const PRIORITY_META: Record<Priority, { label: string; hex: string }> = {
  low: { label: "منخفضة", hex: "#94A3B8" },
  normal: { label: "عادية", hex: "#3B82F6" },
  high: { label: "عالية", hex: "#EF4444" },
};
