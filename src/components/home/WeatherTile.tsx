import { useEffect } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { ICON_OF, kindOf, labelOf, themeOf } from "@/lib/weather";
import { fmtTemp } from "@/lib/weatherInsights";
import { useWeather } from "@/store/useWeather";

/** مربع الطقس بجانب بطاقة الصلاة: يفتح تبويب الطقس */
export function WeatherTile() {
  const router = useRouter();
  const cities = useWeather((s) => s.cities);
  const index = useWeather((s) => s.index);
  const cache = useWeather((s) => s.cache);
  const units = useWeather((s) => s.units);
  const refresh = useWeather((s) => s.refresh);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const city = cities[index] ?? cities[0];
  const w = city ? cache[city.id] : undefined;
  const th = w ? themeOf(w.now.code, w.now.isDay) : null;
  const icon = w ? ICON_OF[kindOf(w.now.code)] : "cloud-offline-outline";

  return (
    <PressableScale
      onPress={() => router.push("/weather")}
      containerClassName="w-[118px]"
      className="rounded-[28px] overflow-hidden"
      style={{ height: 158, backgroundColor: th ? th.bg : "#E2E8F0", padding: 14, justifyContent: "space-between" }}
    >
      <Ionicons name={icon as never} size={40} color={th ? th.accent : "#64748B"} />
      <View>
        <Text w="bold" style={{ fontSize: 34, lineHeight: 42, color: th ? th.ink : "#0F172A" }}>
          {w ? fmtTemp(w.now.temp, units) : "--"}
        </Text>
        <Text className="text-xs" style={{ color: th ? th.ink : "#475569", opacity: 0.8 }} numberOfLines={1}>
          {w ? labelOf(w.now.code, w.now.isDay) : "الطقس"}
        </Text>
        <Text w="semi" className="text-xs" style={{ color: th ? th.ink : "#475569" }} numberOfLines={1}>
          {city?.name ?? ""}
        </Text>
      </View>
    </PressableScale>
  );
}
