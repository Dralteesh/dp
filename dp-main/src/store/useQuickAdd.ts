import { useMemo } from "react";
import { create } from "zustand";
import { TYPE_META } from "@/constants/shiftTypes";
import { useActiveTypes } from "@/hooks/useActiveTypes";
import { luminance, mix } from "@/lib/color";
import { useSettings } from "@/store/useSettings";
import type { QuickAddItem, ShiftType } from "@/types";

/** حالة نافذة «الإضافة السريعة» العامة (تُفتح بالضغط المطوّل على زر الرئيسية أو من زر +) */
type QuickAddState = {
  open: boolean;
  /** التاريخ المستهدف للأحداث الجديدة (YYYY-MM-DD)، وإلا اليوم */
  date?: string;
  show: (date?: string) => void;
  hide: () => void;
};

export const useQuickAdd = create<QuickAddState>((set) => ({
  open: false,
  date: undefined,
  show: (date) => set({ open: true, date }),
  hide: () => set({ open: false }),
}));

// ───────────────────────── بنود الإضافة السريعة ─────────────────────────

/** وجهات جاهزة (تظهر كاختصارات عند إضافة اختصار جديد) */
export const ROUTE_PRESETS: { route: string; label: string; icon: string }[] = [
  { route: "/tasks", label: "مهمة", icon: "checkbox-outline" },
  { route: "/notes", label: "ملاحظة", icon: "create-outline" },
  { route: "/clinic/patient-form", label: "مريض جديد", icon: "person-add-outline" },
  { route: "/clinic/appointment-form", label: "موعد عيادة", icon: "calendar-outline" },
  { route: "/alarm/new", label: "منبّه جديد", icon: "alarm-outline" },
  { route: "/calendar", label: "التقويم", icon: "calendar-number-outline" },
  { route: "/docs", label: "المستندات", icon: "document-text-outline" },
];

/** القائمة الافتراضية: كل نوع نشط، ثم مهمة، ملاحظة، مريض جديد */
const DEFAULT_ROUTES = ["/tasks", "/notes", "/clinic/patient-form"];

const typeItem = (t: ShiftType): QuickAddItem => ({
  id: `type:${t}`,
  kind: "event-type",
  type: t,
  label: "",
  icon: "",
  visible: true,
});

export function defaultQuickAdd(types: ShiftType[]): QuickAddItem[] {
  const routes = DEFAULT_ROUTES.map((r) => {
    const p = ROUTE_PRESETS.find((x) => x.route === r)!;
    return { id: `route:${r}`, kind: "route" as const, route: r, label: p.label, icon: p.icon, visible: true };
  });
  return [...types.map(typeItem), ...routes];
}

/**
 * يدمج القائمة المحفوظة مع الأنواع النشطة دون فقد ترتيب المستخدم وتخصيصه:
 * نوع جديد يُضاف في النهاية، ونوع محذوف أو مخفي من أماكن العمل لا يظهر.
 */
export function resolveQuickAdd(saved: QuickAddItem[] | null | undefined, types: ShiftType[]): QuickAddItem[] {
  if (!saved || !Array.isArray(saved)) return defaultQuickAdd(types);
  const active = new Set(types);
  const out = saved.filter((i) => i && !(i.kind === "route" && i.route === "/focus") && (i.kind !== "event-type" || (i.type && active.has(i.type))));
  const have = new Set(out.filter((i) => i.kind === "event-type").map((i) => i.type));
  for (const t of types) if (!have.has(t)) out.push(typeItem(t));
  return out;
}

/** بنود الإضافة السريعة الحالية (تتحدث مع الإعدادات وأماكن العمل) */
export function useQuickAddItems(): QuickAddItem[] {
  const types = useActiveTypes();
  const saved = useSettings((s) => s.quickAdd);
  return useMemo(() => resolveQuickAdd(saved, types), [saved, types]);
}

export type ItemLook = { label: string; icon: string; hex: string; soft: string; ink: string; onSolid: string };

/** الشكل المرئي للبند (النص والأيقونة واللون) بعد تطبيق الافتراضي من النوع */
export function itemLook(item: QuickAddItem): ItemLook {
  if (item.kind === "event-type" && item.type) {
    const m = TYPE_META[item.type];
    const base = { label: item.label || m.label, icon: item.icon || m.icon };
    if (item.hex) {
      return {
        ...base,
        hex: item.hex,
        soft: mix(item.hex, "#FFFFFF", 0.85),
        ink: mix(item.hex, "#000000", 0.55),
        onSolid: luminance(item.hex) > 0.5 ? "#0F172A" : "#FFFFFF",
      };
    }
    return { ...base, hex: m.hex, soft: m.soft, ink: m.inkHex, onSolid: m.onSolid };
  }
  const hex = item.hex || "#0F172A";
  return {
    label: item.label,
    icon: item.icon || "apps-outline",
    hex,
    soft: "#FFFFFF",
    ink: "#0F172A",
    onSolid: luminance(hex) > 0.5 ? "#0F172A" : "#FFFFFF",
  };
}
