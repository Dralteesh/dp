import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { fontFamily } from "@/lib/countdown/presets";
import type { View as CdView } from "@/lib/countdown/format";
import type { CdFont } from "@/types/countdown";

type Props = {
  parts: CdView["parts"];
  ink: string;
  font: CdFont;
  /** أكبر حجم رقم (يصغر تلقائيًا مع زيادة عدد الأجزاء) */
  base: number;
  opacity?: number;
  align?: "flex-start" | "center";
};

/** صفّ أرقام العدّاد: رقم كبير ووسم الوحدة تحته */
export function CounterParts({ parts, ink, font, base, opacity = 1, align = "center" }: Props) {
  const n = parts.length;
  const size = base * (n <= 1 ? 1 : n === 2 ? 0.78 : n === 3 ? 0.62 : 0.5);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: align, alignItems: "flex-end", columnGap: size * 0.3, opacity }}>
      {parts.map((p) => (
        <View key={p.key} style={{ alignItems: "center" }}>
          <Text style={{ color: ink, fontSize: size, lineHeight: size * 1.25, fontFamily: fontFamily(font) }}>{p.text}</Text>
          <Text w="semi" style={{ color: ink, opacity: 0.8, fontSize: Math.max(11, size * 0.26) }}>
            {p.tag}
          </Text>
        </View>
      ))}
    </View>
  );
}
