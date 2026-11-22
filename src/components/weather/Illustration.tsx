import { useMemo } from "react";
import { SvgXml } from "react-native-svg";
import { illustrationSvg } from "@/lib/weatherSvg";
import type { Kind } from "@/lib/weather";

/** رسمة الحالة المجسّمة (شمس/قمر/سحاب/مطر/ثلج/عاصفة/ضباب) */
export function Illustration({ kind, isDay, size = 200 }: { kind: Kind; isDay: boolean; size?: number }) {
  const xml = useMemo(() => illustrationSvg(kind, isDay), [kind, isDay]);
  return <SvgXml xml={xml} width={size} height={(size * 190) / 200} />;
}
