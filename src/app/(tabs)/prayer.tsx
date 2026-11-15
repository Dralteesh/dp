import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useNow } from "@/hooks/useNow";
import { addDays, combine, fmtCountdown, fmtDateFull, fmtTimeDate, todayISO } from "@/lib/dates";
import { CITY, PRAYER_LABELS, PRAYER_METHODS, PRAYER_ORDER, getPrayerTimes, nextPrayer } from "@/lib/prayer";
import { useSettings } from "@/store/useSettings";
import type { PrayerKey } from "@/types";

const ICONS: Record<PrayerKey, keyof typeof Ionicons.glyphMap> = {
  fajr: "partly-sunny-outline",
  sunrise: "sunny-outline",
  dhuhr: "sunny",
  asr: "cloudy-outline",
  maghrib: "moon-outline",
  isha: "moon",
};

export default function PrayerScreen() {
  const router = useRouter();
  const now = useNow(1000);
  const prayerMethod = useSettings((s) => s.prayerMethod);
  const madhab = useSettings((s) => s.madhab);
  const prayerAdjust = useSettings((s) => s.prayerAdjust);
  const prayerNotify = useSettings((s) => s.prayerNotify);
  const toggleNotify = useSettings((s) => s.toggleNotify);

  const [iso, setIso] = useState(todayISO());
  const isToday = iso === todayISO();

  const times = useMemo(
    () => getPrayerTimes(combine(iso, "12:00"), { prayerMethod, madhab, prayerAdjust }),
    [iso, prayerMethod, madhab, prayerAdjust],
  );

  const minuteKey = Math.floor(now.getTime() / 60000);
  const next = useMemo(
    () => nextPrayer(new Date(), { prayerMethod, madhab, prayerAdjust }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [minuteKey, prayerMethod, madhab, prayerAdjust],
  );

  return (
    <Screen title="أوقات الصلاة" subtitle={`${CITY.name} • ${PRAYER_METHODS[prayerMethod].label}`}>
      {/* بطاقة الصلاة القادمة */}
      <View className="rounded-3xl p-5 mb-4" style={{ backgroundColor: "#14532D" }}>
        <Text className="text-green-200 text-sm">الصلاة القادمة</Text>
        <View className="flex-row items-end justify-between">
          <Text w="bold" className="text-white text-4xl leading-[52px]">
            {PRAYER_LABELS[next.key]}
          </Text>
          <Text w="bold" className="text-white text-3xl mb-1" style={{ fontVariant: ["tabular-nums"] }}>
            {fmtCountdown(next.time.getTime() - now.getTime())}
          </Text>
        </View>
        <Text className="text-green-100">{fmtTimeDate(next.time)}</Text>
      </View>

      {/* تنقّل بين الأيام */}
      <View className="flex-row items-center justify-between mb-3">
        <Pressable
          onPress={() => setIso(addDays(iso, -1))}
          className="w-10 h-10 rounded-full bg-surface border border-line items-center justify-center"
        >
          <Ionicons name="chevron-forward" size={20} color="#0F172A" />
        </Pressable>
        <Pressable onPress={() => setIso(todayISO())} className="items-center">
          <Text w="bold">{fmtDateFull(iso)}</Text>
          {!isToday ? <Text className="text-hospital text-xs">العودة لليوم</Text> : null}
        </Pressable>
        <Pressable
          onPress={() => setIso(addDays(iso, 1))}
          className="w-10 h-10 rounded-full bg-surface border border-line items-center justify-center"
        >
          <Ionicons name="chevron-back" size={20} color="#0F172A" />
        </Pressable>
      </View>

      <Card className="p-2">
        {PRAYER_ORDER.map((k, i) => {
          const isNext = isToday && next.key === k && next.time.getTime() === times[k].getTime();
          const notifyOn = prayerNotify[k];
          return (
            <View
              key={k}
              className={`flex-row items-center gap-3 px-3 py-3 rounded-xl ${isNext ? "bg-private-soft" : ""} ${
                i > 0 && !isNext ? "" : ""
              }`}
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: isNext ? "#16A34A" : "#F1F5F9" }}
              >
                <Ionicons name={ICONS[k]} size={20} color={isNext ? "#FFFFFF" : "#475569"} />
              </View>
              <Text w={isNext ? "bold" : "semi"} className="flex-1 text-base">
                {PRAYER_LABELS[k]}
              </Text>
              <Text w="bold" className="text-base" style={{ fontVariant: ["tabular-nums"] }}>
                {fmtTimeDate(times[k])}
              </Text>
              <Pressable onPress={() => toggleNotify(k)} hitSlop={10}>
                <Ionicons
                  name={notifyOn ? "notifications" : "notifications-off-outline"}
                  size={22}
                  color={notifyOn ? "#16A34A" : "#94A3B8"}
                />
              </Pressable>
            </View>
          );
        })}
      </Card>

      <Text className="text-xs text-muted mt-3 leading-5">
        قارن الأوقات بتقويم الأوقاف أو مسجدك. إن اختلفت بدقائق غيّر طريقة الحساب أو اضبط التعديل اليدوي لكل صلاة من
        الإعدادات.
      </Text>
      <Text w="semi" className="text-hospital mt-2" onPress={() => router.push("/settings")}>
        فتح إعدادات الصلاة
      </Text>
    </Screen>
  );
}
