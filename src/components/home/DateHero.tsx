import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { DAYS, MONTHS } from "@/constants/arabic";
import { fmtCountdown, fmtTimeDate } from "@/lib/dates";
import { CITY, PRAYER_LABELS } from "@/lib/prayer";
import type { PrayerKey } from "@/types";

type Props = {
  now: Date;
  next: { key: PrayerKey; time: Date };
};

const two = (n: number) => String(n).padStart(2, "0");

/** ترويسة الشاشة الرئيسية: تاريخ ضخم + ساعة حماة + الصلاة القادمة (من تصميم Today) */
export function DateHero({ now, next }: Props) {
  const remaining = next.time.getTime() - now.getTime();
  return (
    <View className="mb-4">
      <Text className="text-muted text-base">{DAYS[now.getDay()]}</Text>
      <View className="flex-row items-stretch justify-between">
        <View>
          <Text
            w="bold"
            style={{ fontSize: 66, lineHeight: 78, color: "#1E2229", fontVariant: ["tabular-nums"], letterSpacing: -1 }}
          >
            {`${now.getDate()}.${two(now.getMonth() + 1)}`}
          </Text>
          <Text w="bold" style={{ fontSize: 30, lineHeight: 40, color: "#1E2229", marginTop: -6 }}>
            {MONTHS[now.getMonth()]}
          </Text>
        </View>

        <View className="flex-row items-center">
          <View style={{ width: 1, alignSelf: "stretch", backgroundColor: "#1E2229", opacity: 0.5, marginHorizontal: 14 }} />
          <View className="justify-center gap-3">
            <View>
              <Text w="bold" className="text-xl" style={{ fontVariant: ["tabular-nums"] }}>
                {fmtTimeDate(now)}
              </Text>
              <Text className="text-xs text-muted">{CITY.name}</Text>
            </View>
            <View>
              <Text w="bold" className="text-xl" style={{ fontVariant: ["tabular-nums"] }}>
                {fmtTimeDate(next.time)}
              </Text>
              <Text className="text-xs text-muted">
                {PRAYER_LABELS[next.key]} • بعد {fmtCountdown(remaining)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
