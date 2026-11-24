import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { CountdownBackground } from "@/components/countdown/CountdownBackground";
import { CounterParts } from "@/components/countdown/CounterParts";
import { ProgressRing } from "@/components/countdown/ProgressRing";
import { repeatLabel, whenLabel, type View as CdView } from "@/lib/countdown/format";
import { fontFamily, inkOn } from "@/lib/countdown/presets";
import type { Countdown } from "@/types/countdown";

type Props = {
  cd: Countdown;
  v: CdView;
  radius?: number;
  /** ملء الشاشة: أحجام أكبر وبلا حواف */
  full?: boolean;
  /** عند التقاط صورة للمشاركة: يُستبدل الفيديو بتدرّج لأن الفيديو لا يُلتقط */
  forShare?: boolean;
};

/** وجه العدّاد الكبير (التفاصيل / ملء الشاشة / صورة المشاركة) مع تطبيق موضع النص وحجمه وشفافيته */
export function CountdownFace({ cd, v, radius = 32, full, forShare }: Props) {
  const ink = inkOn(cd);
  const { pos, scale, opacity, font } = cd.text;
  const justify = pos === "top" ? "flex-start" : pos === "bottom" ? "flex-end" : "center";
  const k = (full ? 1.25 : 1) * scale;
  const rep = repeatLabel(cd.repeat);

  return (
    <View collapsable={false} style={{ flex: full ? 1 : undefined, minHeight: full ? undefined : 430, borderRadius: radius, overflow: "hidden", backgroundColor: cd.color }}>
      <CountdownBackground cd={forShare && cd.bg.kind === "video" ? { ...cd, bg: { ...cd.bg, kind: "gradient" } } : cd} animate={!forShare} />
      <View style={{ flex: 1, padding: 24, paddingTop: full ? 64 : 24, justifyContent: justify, alignItems: "center", gap: 10, opacity }}>
        <Text style={{ fontSize: 48 * k, lineHeight: 66 * k }}>{cd.emoji || "🎯"}</Text>
        <Text style={{ color: ink, fontSize: 26 * k, lineHeight: 40 * k, textAlign: "center", fontFamily: fontFamily(font) }}>{cd.title || "بدون عنوان"}</Text>
        {cd.description ? (
          <Text numberOfLines={3} style={{ color: ink, opacity: 0.8, fontSize: 14 * k, textAlign: "center" }}>
            {cd.description}
          </Text>
        ) : null}

        <View style={{ marginVertical: 8 * k }}>
          {v.state === "now" ? (
            <Text style={{ color: ink, fontSize: 40 * k, lineHeight: 56 * k, fontFamily: fontFamily(font) }}>حان الموعد 🎉</Text>
          ) : (
            <CounterParts parts={v.parts} ink={ink} font={font} base={72 * k} />
          )}
        </View>

        <Text w="semi" style={{ color: ink, opacity: 0.9, fontSize: 15 * k }}>
          {v.caption}
        </Text>
        <Text style={{ color: ink, opacity: 0.75, fontSize: 13 * k, textAlign: "center" }}>
          {whenLabel(cd)}
          {rep ? ` • ${rep}` : ""}
        </Text>
        {v.progress != null && v.state === "upcoming" ? (
          <View style={{ marginTop: 8 }}>
            <ProgressRing progress={v.progress} color={ink} size={64 * Math.min(k, 1.3)} />
          </View>
        ) : null}
      </View>
    </View>
  );
}
