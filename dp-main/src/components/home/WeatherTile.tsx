import { useEffect } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Illustration } from "@/components/weather/Illustration";
import { SkyGradient } from "@/components/prayer/PrayerScene";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { kindOf, labelOf } from "@/lib/weather";
import { kindGradient } from "@/lib/weatherSvg";
import { fmtTemp } from "@/lib/weatherInsights";
import { useFabRequest } from "@/store/useFabRequest";
import { useShortcutMenu } from "@/store/useShortcutMenu";
import { useWeather } from "@/store/useWeather";

/** مربع الطقس بجانب بطاقة الصلاة: سماء متدرّجة بلون الحالة + رسمة مجسّمة كبيرة (نفس لغة بطاقة الصلاة) */
export function WeatherTile({ fill }: { fill?: boolean } = {}) {
  const router = useRouter();
  const cities = useWeather((s) => s.cities);
  const index = useWeather((s) => s.index);
  const cache = useWeather((s) => s.cache);
  const units = useWeather((s) => s.units);
  const refresh = useWeather((s) => s.refresh);
  const showMenu = useShortcutMenu((s) => s.show);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const city = cities[index] ?? cities[0];
  const w = city ? cache[city.id] : undefined;
  const kind = w ? kindOf(w.now.code) : "cloudy";
  const isDay = w ? w.now.isDay : true;
  const [top, bottom] = kindGradient(kind, isDay);

  return (
    <PressableScale
      onPress={() => router.push("/weather")}
      onLongPress={() =>
        showMenu("الطقس", [
          {
            label: "المدن",
            icon: "location-outline",
            onPress: () => {
              useFabRequest.getState().request("weather");
              router.push("/weather");
            },
          },
          { label: "تحديث الآن", icon: "refresh-outline", onPress: () => refresh().catch(() => {}) },
        ])
      }
      containerClassName={fill ? "w-full" : "w-[118px]"}
      className="rounded-[28px] overflow-hidden"
      style={{ height: 158 }}
    >
      <SkyGradient colors={[top, top, bottom]} />

      {/* الرسمة المجسّمة: تتجاوز الحافة قليلًا لإحساس العمق */}
      <View pointerEvents="none" style={{ position: "absolute", end: -16, top: -6 }}>
        <Illustration kind={kind} isDay={isDay} size={104} />
      </View>

      <View style={{ position: "absolute", start: 14, end: 12, bottom: 12 }}>
        <Text w="bold" className="text-white" style={{ fontSize: 36, lineHeight: 44, fontVariant: ["tabular-nums"] }}>
          {w ? fmtTemp(w.now.temp, units) : "--"}
        </Text>
        <Text className="text-white text-xs" style={{ opacity: 0.92 }} numberOfLines={1}>
          {w ? labelOf(w.now.code, w.now.isDay) : "الطقس"}
        </Text>
        <Text w="semi" className="text-white text-xs" style={{ opacity: 0.75 }} numberOfLines={1}>
          {city?.name ?? ""}
        </Text>
      </View>
    </PressableScale>
  );
}
