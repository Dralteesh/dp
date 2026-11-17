import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import type { AgendaItem } from "@/lib/agenda";
import { fmtTime, toMinutes } from "@/lib/dates";

/** مدة بالدقائق بين وقتين (مع احتساب العبور لليوم التالي) */
function duration(item: AgendaItem): string {
  let m = toMinutes(item.endTime) - toMinutes(item.startTime);
  if (m <= 0 || item.endsNextDay) m += 24 * 60;
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} د`;
  return r ? `${h} س ${r} د` : `${h} س`;
}

/** بطاقة كبيرة للحدث الجاري أو التالي (من بطاقة «You have a meeting») */
export function NextUpCard({ item, live, onPress }: { item: AgendaItem; live: boolean; onPress: () => void }) {
  const m = TYPE_META[item.type];
  return (
    <PressableScale onPress={onPress} className="rounded-[28px] p-5 mb-3" style={{ backgroundColor: m.hex }}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pe-3">
          <Text className="text-xs" style={{ color: m.onSolid, opacity: 0.8 }}>
            {live ? "الآن" : "التالي"} • {m.label}
          </Text>
          <Text w="bold" style={{ fontSize: 28, lineHeight: 38, color: m.onSolid }} numberOfLines={2}>
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text className="text-sm" style={{ color: m.onSolid, opacity: 0.85 }} numberOfLines={1}>
              {item.subtitle}
            </Text>
          ) : null}
        </View>
        <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.25)" }}>
          <Ionicons name={m.icon} size={22} color={m.onSolid} />
        </View>
      </View>

      <View className="flex-row items-end justify-between mt-5">
        <View>
          <Text w="bold" style={{ fontSize: 26, color: m.onSolid, fontVariant: ["tabular-nums"] }}>
            {fmtTime(item.startTime)}
          </Text>
          <Text className="text-xs" style={{ color: m.onSolid, opacity: 0.75 }}>
            البداية
          </Text>
        </View>
        <View className="rounded-full px-4 py-1.5" style={{ backgroundColor: "rgba(0,0,0,0.28)" }}>
          <Text w="bold" className="text-sm" style={{ color: "#FFFFFF" }}>
            {duration(item)}
          </Text>
        </View>
        <View className="items-end">
          <Text w="bold" style={{ fontSize: 26, color: m.onSolid, fontVariant: ["tabular-nums"] }}>
            {fmtTime(item.endTime)}
          </Text>
          <Text className="text-xs" style={{ color: m.onSolid, opacity: 0.75 }}>
            {item.endsNextDay ? "النهاية (الغد)" : "النهاية"}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
}
