import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { Text } from "@/components/ui/Text";

/** طبقات الخريطة التفاعلية (Windy): مطر، سحب، رياح، ضغط، حرارة، رطوبة، جودة هواء، أشعة شمس */
const LAYERS: { key: string; label: string; icon: string }[] = [
  { key: "radar", label: "رادار المطر", icon: "rainy-outline" },
  { key: "rain", label: "أمطار", icon: "umbrella-outline" },
  { key: "snowcover", label: "ثلوج", icon: "snow-outline" },
  { key: "wind", label: "رياح", icon: "flag-outline" },
  { key: "clouds", label: "سحب", icon: "cloud-outline" },
  { key: "pressure", label: "ضغط", icon: "speedometer-outline" },
  { key: "temp", label: "حرارة", icon: "thermometer-outline" },
  { key: "rh", label: "رطوبة", icon: "water-outline" },
  { key: "cams", label: "جودة الهواء", icon: "leaf-outline" },
  { key: "uvindex", label: "أشعة UV", icon: "sunny-outline" },
];

export default function WeatherMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lat, lng, name } = useLocalSearchParams<{ lat?: string; lng?: string; name?: string }>();
  const [layer, setLayer] = useState("radar");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const la = Number(lat) || 35.13;
  const ln = Number(lng) || 36.75;
  // التحريك الزمني (تشغيل/إيقاف وشريط الوقت) مدمج في خريطة Windy
  const uri =
    `https://embed.windy.com/embed2.html?lat=${la}&lon=${ln}&detailLat=${la}&detailLon=${ln}&zoom=6` +
    `&level=surface&overlay=${layer}&product=ecmwf&menu=&message=true&marker=true&calendar=now&type=map&location=coordinates&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;

  return (
    <View style={{ flex: 1, backgroundColor: "#0B1E2D", paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="رجوع" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text w="bold" style={{ color: "#fff", fontSize: 16 }}>
            الرادار والخرائط
          </Text>
          {name ? <Text style={{ color: "#fff", opacity: 0.6, fontSize: 11 }}>{name}</Text> : null}
        </View>
      </View>

      <View style={{ height: 52 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, alignItems: "center" }}>
          {LAYERS.map((l) => {
            const on = l.key === layer;
            return (
              <Pressable
                key={l.key}
                onPress={() => {
                  setLoading(true);
                  setFailed(false);
                  setLayer(l.key);
                }}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: on ? "#fff" : "rgba(255,255,255,0.12)" }}
              >
                <Ionicons name={l.icon as never} size={16} color={on ? "#0B1E2D" : "#fff"} />
                <Text w="semi" style={{ fontSize: 12.5, color: on ? "#0B1E2D" : "#fff" }}>
                  {l.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ flex: 1, marginTop: 8, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: "hidden", backgroundColor: "#0B1E2D" }}>
        {failed ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 }}>
            <Ionicons name="cloud-offline-outline" size={44} color="#fff" />
            <Text style={{ color: "#fff", textAlign: "center" }}>تعذّر تحميل الخريطة. تحقق من الإنترنت.</Text>
            <Pressable
              onPress={() => {
                setFailed(false);
                setLoading(true);
                setLayer((x) => x);
              }}
              style={{ backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 22, paddingVertical: 10 }}
            >
              <Text w="bold" style={{ color: "#0B1E2D" }}>
                إعادة المحاولة
              </Text>
            </Pressable>
          </View>
        ) : (
          <WebView
            key={layer + String(failed)}
            source={{ uri }}
            style={{ flex: 1, backgroundColor: "#0B1E2D" }}
            javaScriptEnabled
            domStorageEnabled
            setSupportMultipleWindows={false}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
            onHttpError={() => {
              setLoading(false);
              setFailed(true);
            }}
          />
        )}
        {loading && !failed ? (
          <View pointerEvents="none" style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
      </View>
    </View>
  );
}
