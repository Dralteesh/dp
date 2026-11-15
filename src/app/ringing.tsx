import { useEffect } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { useNow } from "@/hooks/useNow";
import { getAlarmModule } from "@/lib/alarm";
import { fmtTimeDate } from "@/lib/dates";
import { useAlarms } from "@/store/useAlarms";

/** شاشة الرنين: دائرة نابضة + إيقاف + غفوة */
export default function RingingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const now = useNow(1000);
  const alarms = useAlarms((s) => s.alarms);

  // المعرّف الأصلي: dp:a:<alarmId>:<date> أو dp:e:<eventId>:<date>
  const parts = (id ?? "").split(":");
  const alarm = parts[1] === "a" ? alarms.find((a) => a.id === parts[2]) : undefined;
  const snoozeMin = alarm?.snoozeMinutes ?? 5;

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
    close();
  };
  const snooze = async () => {
    const mod = getAlarmModule();
    if (mod && id) await mod.snoozeCurrentAlarm(id, snoozeMin);
    close();
  };

  return (
    <View className="flex-1 items-center justify-between bg-red-600 px-6 py-16">
      <View className="items-center">
        <Text w="bold" className="text-white text-6xl leading-[72px]" style={{ fontVariant: ["tabular-nums"] }}>
          {fmtTimeDate(now)}
        </Text>
        <Text w="semi" className="text-red-100 text-xl mt-1">
          {alarm?.label ?? "منبّه"}
        </Text>
      </View>

      <View className="items-center justify-center" style={{ width: 220, height: 220 }}>
        <Animated.View
          style={[
            { position: "absolute", width: 140, height: 140, borderRadius: 70, backgroundColor: "#FFFFFF" },
            ring,
          ]}
        />
        <View className="w-32 h-32 rounded-full bg-white items-center justify-center">
          <Ionicons name="alarm" size={64} color="#DC2626" />
        </View>
      </View>

      <View className="w-full gap-3">
        <PressableScale
          onPress={stop}
          className="bg-white rounded-3xl py-5 items-center flex-row justify-center gap-2"
        >
          <Ionicons name="stop-circle" size={26} color="#DC2626" />
          <Text w="bold" className="text-red-600 text-xl">
            إيقاف
          </Text>
        </PressableScale>
        <PressableScale
          onPress={snooze}
          className="rounded-3xl py-4 items-center flex-row justify-center gap-2"
          style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
        >
          <Ionicons name="moon" size={22} color="#FFFFFF" />
          <Text w="semi" className="text-white text-lg">
            غفوة {snoozeMin} دقائق
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}
