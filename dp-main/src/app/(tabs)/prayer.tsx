import { useCallback, useMemo, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { PrayerScene, SkyGradient } from "@/components/prayer/PrayerScene";
import { StarField } from "@/components/prayer/StarField";
import { Text } from "@/components/ui/Text";
import { PRAYER_THEMES, skyKey } from "@/constants/prayerThemes";
import { useNow } from "@/hooks/useNow";
import { addDays, combine, fmtCountdown, fmtDateFull, fmtTimeDate, todayISO } from "@/lib/dates";
import { CITY, PRAYER_LABELS, PRAYER_METHODS, PRAYER_ORDER, getPrayerTimes, nextPrayer } from "@/lib/prayer";
import { usePrayerLog, type FardKey } from "@/store/usePrayerLog";
import { useSettings } from "@/store/useSettings";

export default function PrayerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const now = useNow(1000);
  const prayerMethod = useSettings((s) => s.prayerMethod);
  const madhab = useSettings((s) => s.madhab);
  const prayerAdjust = useSettings((s) => s.prayerAdjust);
  const prayerNotify = useSettings((s) => s.prayerNotify);
  const toggleNotify = useSettings((s) => s.toggleNotify);
  const doneLog = usePrayerLog((s) => s.done);
  const markDone = usePrayerLog((s) => s.markDone);
  const unmark = usePrayerLog((s) => s.unmark);

  // الشاشة داكنة: نجعل أيقونات شريط الحالة فاتحة وهي ظاهرة فقط
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

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
  const sky = useMemo(
    () => skyKey(new Date(), { prayerMethod, madhab, prayerAdjust }, next.key),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [minuteKey, prayerMethod, madhab, prayerAdjust, next.key],
  );
  const theme = PRAYER_THEMES[sky];

  const remaining = next.time.getTime() - now.getTime();
  const span = next.time.getTime() - next.previous.getTime();
  const progress = Math.min(1, Math.max(0, 1 - remaining / span));

  // اللوح السفلي يتحدد ارتفاعه بمحتواه، والمشهد يستند إليه ويدخل تحته قليلًا
  const [panelH, setPanelH] = useState(340);
  const sceneH = (width * 300) / 360;

  return (
    <View style={{ flex: 1 }}>
      {focused ? <StatusBar style="light" /> : null}
      <SkyGradient colors={theme.sky} />
      {theme.night ? <StarField /> : null}

      <View
        pointerEvents="none"
        style={{ position: "absolute", left: 0, right: 0, bottom: panelH - 40, height: sceneH }}
      >
        <PrayerScene sky={sky} progress={progress} />
      </View>

      {/* الترويسة */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row gap-2">
            {([
              ["alarm-outline", "/reminders-prayer"],
              ["compass-outline", "/qibla"],
              ["stats-chart-outline", "/prayer-stats"],
            ] as const).map(([icon, route]) => (
              <Pressable
                key={route}
                onPress={() => router.push(route)}
                hitSlop={8}
                className="w-9 h-9 rounded-full items-center justify-center"
                style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
              >
                <Ionicons name={icon} size={18} color="#FFFFFF" />
              </Pressable>
            ))}
          </View>
          <View className="items-center">
            <Text w="semi" className="text-white">
              الصلاة القادمة
            </Text>
            <Text className="text-white text-xs" style={{ opacity: 0.8 }}>
              {CITY.name} • {PRAYER_METHODS[prayerMethod].label}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={8}
            className="w-9 h-9 rounded-full items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
          >
            <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        <Text
          w="bold"
          className="text-white text-center"
          style={{ fontSize: 50, lineHeight: 64, marginTop: 6, fontVariant: ["tabular-nums"] }}
        >
          {fmtCountdown(remaining)}
        </Text>
        <Text className="text-white text-center" style={{ opacity: 0.92 }}>
          {PRAYER_LABELS[next.key]} • {fmtTimeDate(next.time)}
        </Text>
      </View>

      <View style={{ flex: 1 }} />

      {/* اللوح السفلي: التاريخ + الصلوات */}
      <View
        onLayout={(e) => setPanelH(e.nativeEvent.layout.height)}
        style={{
          backgroundColor: theme.glass,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingTop: 14,
          paddingHorizontal: 14,
          // مساحة للشريط السفلي العائم
          paddingBottom: 12 + 86 + insets.bottom,
        }}
      >
        <View className="flex-row items-center justify-between px-1 mb-1.5">
          <Pressable hitSlop={10} onPress={() => setIso(addDays(iso, -1))}>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </Pressable>
          <Pressable onPress={() => setIso(todayISO())} className="items-center">
            <Text w="bold" className="text-white">
              {fmtDateFull(iso)}
            </Text>
            {!isToday ? (
              <Text className="text-white text-xs" style={{ opacity: 0.85 }}>
                العودة لليوم
              </Text>
            ) : null}
          </Pressable>
          <Pressable hitSlop={10} onPress={() => setIso(addDays(iso, 1))}>
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {PRAYER_ORDER.map((k) => {
          const isNext = isToday && next.key === k && next.time.getTime() === times[k].getTime();
          const on = prayerNotify[k];
          const fard = k !== "sunrise";
          const prayed = fard && !!doneLog[iso]?.[k as FardKey];
          return (
            <View
              key={k}
              className="flex-row items-center justify-between px-4 rounded-2xl"
              style={{
                height: isNext ? 50 : 44,
                backgroundColor: isNext ? "rgba(255,255,255,0.2)" : "transparent",
                opacity: isNext ? 1 : 0.8,
              }}
            >
              <Text w={isNext ? "bold" : "semi"} className="text-white text-base">
                {PRAYER_LABELS[k]}
              </Text>
              <View className="flex-row items-center gap-3">
                <Text w="bold" className="text-white text-base" style={{ fontVariant: ["tabular-nums"] }}>
                  {fmtTimeDate(times[k])}
                </Text>
                {fard ? (
                  <Pressable
                    onPress={() => (prayed ? unmark(iso, k as FardKey) : markDone(iso, k as FardKey))}
                    hitSlop={10}
                    accessibilityLabel="صليت"
                  >
                    <View
                      className="w-6 h-6 rounded-full items-center justify-center"
                      style={{
                        borderWidth: 1.5,
                        borderColor: "#FFFFFF",
                        backgroundColor: prayed ? "#22C55E" : "transparent",
                        opacity: prayed ? 1 : 0.7,
                      }}
                    >
                      {prayed ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}
                    </View>
                  </Pressable>
                ) : (
                  <View style={{ width: 24 }} />
                )}
                <Pressable onPress={() => toggleNotify(k)} hitSlop={10}>
                  <Ionicons
                    name={on ? "notifications" : "notifications-off-outline"}
                    size={20}
                    color="#FFFFFF"
                    style={{ opacity: on ? 1 : 0.55 }}
                  />
                </Pressable>
              </View>
            </View>
          );
        })}

        <Text
          w="semi"
          className="text-white text-xs text-center mt-2"
          style={{ opacity: 0.85 }}
          onPress={() => router.push("/settings")}
        >
          قارن الأوقات بمسجدك، وعدّل طريقة الحساب من إعدادات الصلاة
        </Text>
      </View>
    </View>
  );
}
