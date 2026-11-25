import { useMemo, type ReactNode } from "react";
import { View } from "react-native";
import { vars } from "nativewind";
import { resolveTypeColors } from "@/constants/palette";
import { SHIFT_TYPES } from "@/constants/shiftTypes";
import { PL } from "@/design/planner";
import { rgbTriplet } from "@/lib/color";
import { useSettings } from "@/store/useSettings";

/** يحقن ألوان الأنواع كمتغيرات CSS لتتبعها كل الأصناف (bg-hospital …) */
export function ThemeRoot({ children }: { children: ReactNode }) {
  const typeColors = useSettings((s) => s.typeColors);
  const uiMode = useSettings((s) => s.uiMode);
  const style = useMemo(() => {
    const v: Record<string, string> = {};
    for (const t of SHIFT_TYPES) {
      const c = resolveTypeColors(t, typeColors?.[t]);
      v[`--c-${t}`] = rgbTriplet(c.hex);
      v[`--c-${t}-soft`] = rgbTriplet(c.soft);
      v[`--c-${t}-ink`] = rgbTriplet(c.inkHex);
    }
    // الواجهة الجديدة: تلوين كل الشاشات القديمة بألوان Alteesh Planner
    if (uiMode === "planner") {
      v["--c-bg"] = rgbTriplet(PL.bg);
      v["--c-surface"] = rgbTriplet(PL.white);
      v["--c-line"] = rgbTriplet(PL.border);
      v["--c-muted"] = rgbTriplet(PL.muted);
      v["--c-ink"] = rgbTriplet(PL.navy);
      v["--c-danger"] = rgbTriplet(PL.bad);
    }
    return vars(v);
  }, [typeColors, uiMode]);
  return <View style={[{ flex: 1 }, style]}>{children}</View>;
}
