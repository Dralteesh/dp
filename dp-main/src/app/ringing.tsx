import { useEffect, useState } from "react";
import { BackHandler, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { ChallengeView } from "@/components/alarm/ChallengeView";
import { StarField } from "@/components/prayer/StarField";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { useNow } from "@/hooks/useNow";
import { getAlarmModule } from "@/lib/alarm";
import { MAX_SNOOZES_DEFAULT, bumpSnooze, clearSnooze, getSnoozeCount } from "@/lib/alarmChallenge";
import { fmtTimeDate } from "@/lib/dates";
import { useAlarms } from "@/store/useAlarms";
import { useSettings } from "@/store/useSettings";
import { useWeather } from "@/store/useWeather";
import { buildAdvice, fmtTemp } from "@/lib/weatherInsights";
import { labelOf } from "@/lib/weather";
import type { AlarmChallenge } from "@/types";

/** شاشة الرنين: لا يظهر زر «إيقاف» قبل إتمام التحدّي، والغفوة محدودة، وزر الرجوع معطّل */
export default function RingingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const now = useNow(1000);
  const alarms = useAlarms((s) => s.alarms);
  const defaultChallenge = useSettings((s) => s.defaultAlarmChallenge);

  // المعرّف الأصلي: dp:a:<alarmId>:<date> أو dp:e:<eventId>:<date>
  const parts = (id ?? "").split(":");
  const alarm = parts[1] === "a" ? alarms.find((a) => a.id === parts[2]) : undefined;
  const snoozeMin = alarm?.snoozeMinutes ?? 5;
  const maxSnoozes = alarm?.maxSnoozes ?? MAX_SNOOZES_DEFAULT;
  const challenge: AlarmChallenge = alarm?.challenge ?? defaultChallenge ?? "math";

  const [solved, setSolved] = useState(challenge === "none");

  // ملخّص الاستيقاظ: الطقس والتوصيات بعد إتمام المهمة
  const cities = useWeather((s) => s.cities);
  const cache = useWeather((s) => s.cache);
  const units = useWeather((s) => s.units);
  const wx = cities[0] ? cache[cities[0].id] : undefined;
  const brief = wx
    ? {
        line: `${cities[0].name}: ${labelOf(wx.now.code, wx.now.isDay)} · ${fmtTemp(wx.now.temp, units)}`,
        tips: buildAdvice(wx, (c) => fmtTemp(c, units)).filter((a) => a.tone !== "ok").slice(0, 3),
      }
    : null;
  const [, force] = useState(0);
  const key = id ?? "x";
  const used = getSnoozeCount(key);
  const canSnooze = used < maxSnoozes;

  useEffect(() => {
    // امنع الرجوع بزر الهاتف حتى يُحلّ التحدّي (الصوت يستمر من الخدمة الأصلية)
    const sub = BackHandler.addEventListener("hardwareBackPress", () => !solved);
    return () => sub.remove();
  }, [solved]);

  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }), -1, false);
  }, [pulse]);

  const ring = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.9 }],
    opacity: 0.55 * (1 - pulse.value),
  }));

  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const stop = async () => {
    const mod = getAlarmModule();
    if (mod && id) await mod.stopCurrentAlarm(id);
    clearSnooze(key);
    close();
  };
  const snooze = async () => {
    if (!canSnooze) return;
    const mod = getAlarmModule();
    bumpSnooze(key);
    force((n) => n + 1);
    if (mod && id) await mod.snoozeCurrentAlarm(id, snoozeMin);
    close();
  };

  return (
    <View className="flex-1 items-center justify-between px-6 py-14" style={{ backgroundColor: "#C2410C" }}>
      <StarField count={22} />
      <View className="items-center">
        <Text w="bold" className="text-white text-6xl leading-[72px]" style={{ fontVariant: ["tabular-nums"] }}>
          {fmtTimeDate(now)}
        </Text>
        <Text w="semi" className="text-orange-100 text-xl mt-1">
          {alarm?.label ?? "منبّه"}
        </Text>
      </View>

      {solved ? (
        <View className="items-center justify-center" style={{ width: 200, height: 200 }}>
          <Animated.View
            style={[{ position: "absolute", width: 130, height: 130, borderRadius: 65, backgroundColor: "#FFFFFF" }, ring]}
          />
          <View className="w-28 h-28 rounded-full bg-white items-center justify-center">
            <Ionicons name="checkmark" size={60} color="#16A34A" />
          </View>
        </View>
      ) : (
        <ChallengeView kind={challenge as Exclude<AlarmChallenge, "none">} data={alarm?.challengeData} onSolved={() => setSolved(true)} />
      )}

      {solved && brief ? (
        <View style={{ width: "100%", backgroundColor: "rgba(0,0,0,0.18)", borderRadius: 22, padding: 14, gap: 4 }}>
          <Text w="bold" className="text-white text-base">
            صباح الخير ☀️ {brief.line}
          </Text>
          {brief.tips.map((t, i) => (
            <Text key={i} className="text-orange-50 text-sm">
              • {t.text}
            </Text>
          ))}
        </View>
      ) : null}

      <View className="w-full gap-3">
        {solved ? (
          <PressableScale onPress={stop} className="bg-white rounded-3xl py-5 items-center flex-row justify-center gap-2">
            <Ionicons name="stop-circle" size={26} color="#C2410C" />
            <Text w="bold" className="text-xl" style={{ color: "#C2410C" }}>
              إيقاف المنبّه
            </Text>
          </PressableScale>
        ) : (
          <View className="rounded-3xl py-4 items-center" style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
            <Text w="semi" className="text-white">
              أنهِ التحدّي لتتمكّن من الإيقاف
            </Text>
          </View>
        )}
        {canSnooze ? (
          <PressableScale
            onPress={snooze}
            className="rounded-3xl py-4 items-center flex-row justify-center gap-2"
            style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
          >
            <Ionicons name="moon" size={22} color="#FFFFFF" />
            <Text w="semi" className="text-white text-lg">
              غفوة {snoozeMin} دقائق ({maxSnoozes - used} متبقية)
            </Text>
          </PressableScale>
        ) : (
          <Text className="text-orange-100 text-center text-sm">استُهلكت الغفوات المسموحة</Text>
        )}
      </View>
    </View>
  );
}
