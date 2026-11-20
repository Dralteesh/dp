import { useMemo, type ReactNode } from "react";
import { View } from "react-native";
import { vars } from "nativewind";
import { resolveTypeColors } from "@/constants/palette";
import { SHIFT_TYPES } from "@/constants/shiftTypes";
import { rgbTriplet } from "@/lib/color";
import { useSettings } from "@/store/useSettings";

/** يحقن ألوان الأنواع كمتغيرات CSS لتتبعها كل الأصناف (bg-hospital …) */
export function ThemeRoot({ children }: { children: ReactNode }) {
  const typeColors = useSettings((s) => s.typeColors);
  const style = useMemo(() => {
    const v: Record<string, string> = {};
    for (const t of SHIFT_TYPES) {
      const c = resolveTypeColors(t, typeColors?.[t]);
      v[`--c-${t}`] = rgbTriplet(c.hex);
      v[`--c-${t}-soft`] = rgbTriplet(c.soft);
      v[`--c-${t}-ink`] = rgbTriplet(c.inkHex);
    }
    return vars(v);
  }, [typeColors]);
  return <View style={[{ flex: 1 }, style]}>{children}</View>;
}
