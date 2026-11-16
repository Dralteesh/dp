import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";
import { resolveTypeColors } from "@/constants/palette";
import type { Priority, ShiftType } from "@/types";

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
  defaults: { start: string; end: string; endsNextDay: boolean };
};

export const SHIFT_TYPES: ShiftType[] = ["hospital", "maxillo", "private", "personal"];

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
    defaults: { start: "08:00", end: "14:00", endsNextDay: false },
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
    defaults: { start: "08:00", end: "08:00", endsNextDay: true },
  },
  private: {
    label: "العيادة الخاصة",
    short: "الخاصة",
    icon: "storefront",
    hex: "#16A34A",
    soft: "#DCFCE7",
    inkHex: "#14532D",
    onSolid: "#FFFFFF",
    cls: {
      bg: "bg-private",
      soft: "bg-private-soft",
      text: "text-private-ink",
      border: "border-private",
      onSolid: "text-white",
    },
    defaultTitle: "دوام العيادة الخاصة",
    defaults: { start: "16:00", end: "20:00", endsNextDay: false },
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
    defaults: { start: "18:00", end: "19:00", endsNextDay: false },
  },
};

/**
 * يطبّق الألوان المخصّصة على TYPE_META مباشرة (تعديل في المكان).
 * المكوّنات التي تقرأ TYPE_META تشترك في useTheme() لتُعاد رسمها عند التغيير،
 * أما الأصناف (bg-hospital …) فتتبع متغيرات CSS من ThemeRoot.
 */
export function applyTypeColors(colors: Partial<Record<ShiftType, string>> | undefined) {
  for (const t of SHIFT_TYPES) {
    const c = resolveTypeColors(t, colors?.[t]);
    const m = TYPE_META[t];
    m.hex = c.hex;
    m.soft = c.soft;
    m.inkHex = c.inkHex;
    m.onSolid = c.onSolid;
  }
}

export const PRIORITY_META: Record<Priority, { label: string; hex: string }> = {
  low: { label: "منخفضة", hex: "#94A3B8" },
  normal: { label: "عادية", hex: "#3B82F6" },
  high: { label: "عالية", hex: "#EF4444" },
};
