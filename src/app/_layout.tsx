import "../../global.css";

import { useEffect } from "react";
import { View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  useFonts,
} from "@expo-google-fonts/cairo";
import { AppSync } from "@/components/AppSync";
import { CloudSync } from "@/components/CloudSync";
import { Text } from "@/components/ui/Text";
import { getAlarmModule } from "@/lib/alarm";
import { useHydrated } from "@/lib/hydration";
import { setupRTL } from "@/lib/rtl";
import { useAlarms } from "@/store/useAlarms";
import { useClinic } from "@/store/useClinic";
import { usePlanner } from "@/store/usePlanner";
import { useSettings } from "@/store/useSettings";

SplashScreen.preventAutoHideAsync();

// يجب أن يُنفَّذ قبل أول رسم للواجهة
const RTL_OK = setupRTL();

export default function RootLayout() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({ Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold });
  const hydrated = useHydrated([usePlanner, useClinic, useSettings, useAlarms]);
  const ready = fontsLoaded && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // عند رنين منبّه إجباري: افتح شاشة الإيقاف/الغفوة
  useEffect(() => {
    const mod = getAlarmModule();
    if (!mod || !ready) return;
    mod.getCurrentAlarmPlaying().then((s) => {
      if (s?.activeAlarmId) router.push({ pathname: "/ringing", params: { id: s.activeAlarmId } });
    });
    const sub = mod.onAlarmStateChange((id) => {
      if (id) router.push({ pathname: "/ringing", params: { id } });
    });
    return () => sub.remove();
  }, [ready, router]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <AppSync />
      <CloudSync />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F5F7FB" } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="ringing" options={{ presentation: "fullScreenModal", gestureEnabled: false }} />
      </Stack>
      {!RTL_OK && (
        <View
          pointerEvents="none"
          style={{ position: "absolute", top: 40, left: 16, right: 16 }}
          className="bg-amber-100 border border-amber-300 rounded-xl p-3"
        >
          <Text w="semi" className="text-amber-900 text-center">
            لتفعيل الاتجاه من اليمين لليسار أغلق التطبيق وافتحه مرة واحدة
          </Text>
        </View>
      )}
    </GestureHandlerRootView>
  );
}
