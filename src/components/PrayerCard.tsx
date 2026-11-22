import { useMemo } from "react";
import { View } from "react-native";
import { PrayerScene, SkyGradient } from "@/components/prayer/PrayerScene";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { PRAYER_THEMES, skyKey } from "@/constants/prayerThemes";
import { fmtCountdown, fmtTimeDate } from "@/lib/dates";
import { CITY, PRAYER_LABELS } from "@/lib/prayer";
import { useSettings } from "@/store/useSettings";
import type { PrayerKey } from "@/types";

type Props = {
  next: { key: PrayerKey; time: Date; previous: Date };
  now: Date;
  onPress: () => void;
  /** نصف العرض بجانب بطاقة الطقس */
  compact?: boolean;
};

/** بطاقة الصلاة القادمة في شاشة اليوم: نفس سماء شاشة الصلاة بمقياس مصغّر */
export function PrayerCard({ next, now, onPress, compact }: Props) {
  const prayerMethod = useSettings((s) => s.prayerMethod);
  const madhab = useSettings((s) => s.madhab);
  useSettings((s) => s.location); // إعادة الرسم عند تغيّر الموقع
  const prayerAdjust = useSettings((s) => s.prayerAdjust);

  const minuteKey = Math.floor(now.getTime() / 60000);
  const sky = useMemo(
    () => skyKey(new Date(), { prayerMethod, madhab, prayerAdjust }, next.key),
    // يُعاد الحساب كل دقيقة فقط
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [minuteKey, prayerMethod, madhab, prayerAdjust, next.key],
  );
  const t = PRAYER_THEMES[sky];

  const remaining = next.time.getTime() - now.getTime();
  const span = next.time.getTime() - next.previous.getTime();
  const progress = Math.min(1, Math.max(0, 1 - remaining / span));

  return (
    <PressableScale
      onPress={onPress}
      containerClassName={compact ? "flex-1" : "mb-4"}
      className="rounded-[28px] overflow-hidden"
      style={{ height: 158 }}
    >
      <SkyGradient colors={t.sky} />
      <View
        pointerEvents="none"
        style={{ position: "absolute", end: -10, bottom: -6, width: 210, height: 130 }}
      >
        <PrayerScene sky={sky} variant="card" />
      </View>

      <View style={{ padding: 18 }}>
        <Text className="text-white text-xs" style={{ opacity: 0.9 }} numberOfLines={1}>
          الصلاة القادمة • {CITY.name}
        </Text>
        <Text w="bold" className="text-white" style={{ fontSize: 32, lineHeight: 44 }}>
          {PRAYER_LABELS[next.key]}
        </Text>
        <Text className="text-white text-sm" style={{ opacity: 0.9 }}>
          {fmtTimeDate(next.time)}
        </Text>
      </View>

      <View style={{ position: "absolute", end: 18, top: 16 }}>
        <Text className="text-white text-[11px]" style={{ opacity: 0.9 }}>
          المتبقي
        </Text>
        <Text w="bold" className="text-white text-2xl" style={{ fontVariant: ["tabular-nums"] }}>
          {fmtCountdown(remaining)}
        </Text>
      </View>

      <View
        style={{
          position: "absolute",
          start: 18,
          end: 18,
          bottom: 16,
          height: 6,
          borderRadius: 3,
          backgroundColor: "rgba(255,255,255,0.25)",
          overflow: "hidden",
        }}
      >
        <View style={{ width: `${progress * 100}%`, height: 6, backgroundColor: "#FFFFFF" }} />
      </View>
    </PressableScale>
  );
}
