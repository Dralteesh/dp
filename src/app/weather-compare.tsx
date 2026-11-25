import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { ICON_OF, kindOf, labelOf } from "@/lib/weather";
import { aqiInfo, fmtTemp, fmtWind, rainSoon, severeAlerts } from "@/lib/weatherInsights";
import { useWeather } from "@/store/useWeather";
import { screenBg } from "@/lib/ui";

/** مقارنة الطقس بين مدنك المحفوظة جنبًا إلى جنب */
export default function WeatherCompareScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cities = useWeather((s) => s.cities);
  const cache = useWeather((s) => s.cache);
  const units = useWeather((s) => s.units);
  const refreshAll = useWeather((s) => s.refreshAll);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let alive = true;
    refreshAll().finally(() => alive && setBusy(false));
    return () => {
      alive = false;
    };
  }, [refreshAll]);

  const rows: { label: string; icon: string; get: (c: string) => string }[] = [
    { label: "الحرارة الآن", icon: "thermometer-outline", get: (id) => (cache[id] ? fmtTemp(cache[id].now.temp, units) : "—") },
    { label: "يُحسّ كـ", icon: "body-outline", get: (id) => (cache[id] ? fmtTemp(cache[id].now.feels, units) : "—") },
    { label: "العظمى / الصغرى", icon: "swap-vertical-outline", get: (id) => (cache[id]?.days[0] ? `${fmtTemp(cache[id].days[0].max, units)} / ${fmtTemp(cache[id].days[0].min, units)}` : "—") },
    { label: "احتمال المطر", icon: "umbrella-outline", get: (id) => (cache[id]?.days[0] ? `${Math.round(cache[id].days[0].pop)}%` : "—") },
    { label: "الرطوبة", icon: "water-outline", get: (id) => (cache[id] ? `${Math.round(cache[id].now.humidity)}%` : "—") },
    { label: "الرياح", icon: "flag-outline", get: (id) => (cache[id] ? fmtWind(cache[id].now.wind, units) : "—") },
    { label: "مؤشر UV", icon: "sunny-outline", get: (id) => (cache[id]?.days[0] ? String(Math.round(cache[id].days[0].uv)) : "—") },
    { label: "جودة الهواء", icon: "leaf-outline", get: (id) => (cache[id]?.aqi ? `${Math.round(cache[id].aqi!.us)} · ${aqiInfo(cache[id].aqi!.us).label}` : "—") },
    { label: "المطر القادم", icon: "rainy-outline", get: (id) => (cache[id] ? rainSoon(cache[id]).text : "—") },
    { label: "تنبيهات", icon: "warning-outline", get: (id) => (cache[id] ? severeAlerts(cache[id]).map((a) => a.title).join("، ") || "لا يوجد" : "—") },
  ];

  const COL = 118;
  return (
    <View style={{ flex: 1, backgroundColor: screenBg(), paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="رجوع" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chevron-forward" size={22} color="#0A3A57" />
        </Pressable>
        <Text w="bold" style={{ fontSize: 17, flex: 1 }}>
          مقارنة المدن
        </Text>
        {busy ? <ActivityIndicator /> : null}
      </View>
      {cities.length < 2 ? (
        <View style={{ padding: 28, alignItems: "center", gap: 8 }}>
          <Ionicons name="git-compare-outline" size={40} color="#4F7189" />
          <Text style={{ textAlign: "center", color: "#4F7189" }}>أضف مدينة ثانية على الأقل من شاشة الطقس لتظهر المقارنة.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
            <View style={{ direction: "rtl" }}>
              <View style={{ flexDirection: "row" }}>
                <View style={{ width: 120 }} />
                {cities.map((c) => {
                  const w = cache[c.id];
                  return (
                    <View key={c.id} style={{ width: COL, alignItems: "center", paddingVertical: 8 }}>
                      <Ionicons name={(w ? ICON_OF[kindOf(w.now.code)] : "cloud-outline") as never} size={26} color="#0A3A57" />
                      <Text w="bold" numberOfLines={1} style={{ fontSize: 14 }}>
                        {c.name}
                      </Text>
                      <Text style={{ fontSize: 10.5, color: "#4F7189" }} numberOfLines={1}>
                        {w ? labelOf(w.now.code, w.now.isDay) : "…"}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {rows.map((r, i) => (
                <View key={r.label} style={{ flexDirection: "row", alignItems: "center", backgroundColor: i % 2 ? "transparent" : "#E6F1F8", borderRadius: 12 }}>
                  <View style={{ width: 120, flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 12, paddingHorizontal: 8 }}>
                    <Ionicons name={r.icon as never} size={15} color="#4F7189" />
                    <Text w="semi" style={{ fontSize: 11.5, color: "#4F7189", flex: 1 }}>
                      {r.label}
                    </Text>
                  </View>
                  {cities.map((c) => (
                    <View key={c.id} style={{ width: COL, alignItems: "center", paddingHorizontal: 4 }}>
                      <Text w="bold" style={{ fontSize: 12.5, textAlign: "center" }}>
                        {r.get(c.id)}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
      )}
    </View>
  );
}
