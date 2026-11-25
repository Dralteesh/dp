import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { CountdownBackground } from "@/components/countdown/CountdownBackground";
import { CounterParts } from "@/components/countdown/CounterParts";
import { useTicker } from "@/hooks/useTicker";
import { tickResolution } from "@/lib/countdown/engine";
import { repeatLabel, viewOf, whenLabel } from "@/lib/countdown/format";
import { fontFamily, inkOn } from "@/lib/countdown/presets";
import type { Countdown } from "@/types/countdown";

type Props = { cd: Countdown; onPress?: () => void; onLongPress?: () => void };

/** بطاقة عدّاد في القائمة: العنوان، التاريخ، الوقت المتبقي/المنقضي، التقدّم */
export function CountdownCard({ cd, onPress, onLongPress }: Props) {
  // دقّة التحديث تتبع ما يُعرض: ثوانٍ فقط إن ظهرت الثواني (توفير للبطارية)
  const now = useTicker(tickResolution(cd, Date.now()));
  const v = viewOf(cd, now);
  const ink = inkOn(cd);
  const cardInk = cd.bg.kind === "image" || cd.bg.kind === "video" ? "#FFFFFF" : ink;
  const rep = repeatLabel(cd.repeat);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress}
      accessibilityLabel={`${cd.title} ${v.caption} ${v.parts.map((p) => `${p.text} ${p.tag}`).join(" ")}`}
      style={{ borderRadius: 28, overflow: "hidden", minHeight: 172, backgroundColor: cd.color }}
    >
      <CountdownBackground cd={cd} />
      <View style={{ flex: 1, padding: 16, justifyContent: "space-between", gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 22, lineHeight: 30 }}>{cd.emoji || "🎯"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: cardInk, fontSize: 17, lineHeight: 26, fontFamily: fontFamily(cd.text.font) }}>
              {cd.title || "بدون عنوان"}
            </Text>
            <Text numberOfLines={1} style={{ color: cardInk, opacity: 0.78, fontSize: 12 }}>
              {whenLabel(cd)}
              {rep ? ` • ${rep}` : ""}
            </Text>
          </View>
          {cd.bg.kind === "video" ? <Ionicons name="videocam" size={16} color={cardInk} /> : null}
          {cd.pinned ? <Ionicons name="pin" size={16} color={cardInk} /> : null}
          {cd.favorite ? <Ionicons name="star" size={16} color="#FBBF24" /> : null}
        </View>

        <View style={{ gap: 6 }}>
          {v.state === "now" ? (
            <Text style={{ color: cardInk, fontSize: 30, lineHeight: 42, fontFamily: fontFamily(cd.text.font) }}>حان الموعد 🎉</Text>
          ) : (
            <CounterParts parts={v.parts} ink={cardInk} font={cd.text.font} base={46} opacity={cd.text.opacity} align="flex-start" />
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text w="semi" style={{ color: cardInk, opacity: 0.85, fontSize: 12 }}>
              {v.caption}
            </Text>
            {v.progress != null && v.state === "upcoming" ? (
              <>
                <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.28)", overflow: "hidden" }}>
                  <View style={{ position: "absolute", start: 0, top: 0, bottom: 0, width: `${Math.round(v.progress * 100)}%`, backgroundColor: cardInk, borderRadius: 3 }} />
                </View>
                <Text w="semi" style={{ color: cardInk, opacity: 0.85, fontSize: 11 }}>
                  {Math.floor(v.progress * 100)}%
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}
