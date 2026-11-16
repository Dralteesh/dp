import { luminance, mix, normalizeHex } from "@/lib/color";
import type { ShiftType } from "@/types";

/** الألوان الافتراضية للأنواع الأربعة: أزرق / أصفر / أخضر / بنفسجي */
export const DEFAULT_TYPE_COLORS: Record<ShiftType, string> = {
  hospital: "#2563EB",
  maxillo: "#EAB308",
  private: "#16A34A",
  personal: "#7C3AED",
};

export type TypeColors = {
  /** اللون الكامل */
  hex: string;
  /** خلفية فاتحة */
  soft: string;
  /** نص غامق فوق الخلفية الفاتحة */
  inkHex: string;
  /** نص فوق اللون الكامل (أبيض أو غامق حسب السطوع) */
  onSolid: string;
};

// قيم مضبوطة يدويًا للألوان الافتراضية (تحافظ على التصميم الأصلي)
const TUNED: Record<ShiftType, Omit<TypeColors, "hex">> = {
  hospital: { soft: "#DBEAFE", inkHex: "#1E3A8A", onSolid: "#FFFFFF" },
  maxillo: { soft: "#FEF3C7", inkHex: "#713F12", onSolid: "#422006" },
  private: { soft: "#DCFCE7", inkHex: "#14532D", onSolid: "#FFFFFF" },
  personal: { soft: "#EDE9FE", inkHex: "#4C1D95", onSolid: "#FFFFFF" },
};

const cache = new Map<string, TypeColors>();

/** يشتق باقي ألوان النوع من لونه الأساسي */
export function resolveTypeColors(type: ShiftType, input: string | undefined): TypeColors {
  const hex = normalizeHex(input) ?? DEFAULT_TYPE_COLORS[type];
  const key = `${type}:${hex}`;
  const hit = cache.get(key);
  if (hit) return hit;

  let out: TypeColors;
  if (hex === DEFAULT_TYPE_COLORS[type]) {
    out = { hex, ...TUNED[type] };
  } else {
    const inkHex = mix(hex, "#000000", 0.62);
    out = {
      hex,
      soft: mix(hex, "#FFFFFF", 0.86),
      inkHex,
      // لون فاتح (أصفر مثلًا) يحتاج نصًا غامقًا فوقه
      onSolid: luminance(hex) > 0.45 ? mix(hex, "#000000", 0.78) : "#FFFFFF",
    };
  }
  cache.set(key, out);
  return out;
}

/** ألوان جاهزة للاختيار السريع */
export const SWATCHES = [
  "#2563EB", "#0EA5E9", "#0891B2", "#14B8A6", "#16A34A", "#65A30D", "#EAB308",
  "#F59E0B", "#F97316", "#EF4444", "#DB2777", "#7C3AED", "#6366F1", "#64748B",
];

export type Preset = { id: string; label: string; colors: Record<ShiftType, string> };

export const PRESETS: Preset[] = [
  { id: "default", label: "الافتراضي", colors: { ...DEFAULT_TYPE_COLORS } },
  {
    id: "calm",
    label: "هادئ",
    colors: { hospital: "#4F86C6", maxillo: "#E3B341", private: "#4C9A6A", personal: "#8B6FC0" },
  },
  {
    id: "vivid",
    label: "نابض",
    colors: { hospital: "#0066FF", maxillo: "#FFC800", private: "#00B050", personal: "#A020F0" },
  },
  {
    id: "contrast",
    label: "تباين عالٍ",
    colors: { hospital: "#1D4ED8", maxillo: "#CA8A04", private: "#15803D", personal: "#6D28D9" },
  },
];
