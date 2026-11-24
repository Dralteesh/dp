import "../../global.css";

import { useEffect } from "react";
import { View } from "react-native";
import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AmiriQuran_400Regular } from "@expo-google-fonts/amiri-quran";
import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  useFonts,
} from "@expo-google-fonts/cairo";
import { AppSync } from "@/components/AppSync";
import { ThemeRoot } from "@/components/ThemeRoot";
import { LockGate } from "@/components/LockGate";
import { CloudSync } from "@/components/CloudSync";
import { QuickAddSheet } from "@/components/QuickAddSheet";
import { Text } from "@/components/ui/Text";
import { getAlarmModule } from "@/lib/alarm";
import { handlePrayerResponse } from "@/lib/notifications";
import { useHydrated } from "@/lib/hydration";
import { setupRTL } from "@/lib/rtl";
import { useAlarms } from "@/store/useAlarms";
import { useClinic } from "@/store/useClinic";
import { useDevice } from "@/store/useDevice";
import { useExtras } from "@/store/useExtras";
import { useCountdowns } from "@/store/useCountdowns";
import { usePrayerLog } from "@/store/usePrayerLog";
import { usePlanner } from "@/store/usePlanner";
import { useSettings } from "@/store/useSettings";

SplashScreen.preventAutoHideAsync();

// يجب أن يُنفَّذ قبل أول رسم للواجهة
const RTL_OK = setupRTL();

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const planner = pathname.startsWith("/planner");
  const [fontsLoaded] = useFonts({ Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold, AmiriQuran_400Regular });
  const hydrated = useHydrated([usePlanner, useClinic, useSettings, useAlarms, useDevice, usePrayerLog, useExtras, useCountdowns]);
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

  // أزرار إشعار الصلاة («صليت» / «ذكّرني بعد 10 د») وهو يعمل أو بعد إقلاع بارد من الإشعار
  useEffect(() => {
    if (!ready) return;
    const onResponse = async (r: Notifications.NotificationResponse) => {
      try {
        // الضغط على إشعار عدّاد يفتح شاشته
        const cdId = r.notification.request.content.data?.cdId;
        if (typeof cdId === "string" && r.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          router.push({ pathname: "/countdowns/[id]", params: { id: cdId } });
          return;
        }
        const isPrayer = await handlePrayerResponse(r);
        // الضغط العادي على إشعار صلاة يفتح شاشة الصلاة
        if (isPrayer && r.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) router.push("/prayer");
      } catch {
        // لا نكسر التطبيق بسبب إشعار
      }
    };
    Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) onResponse(r);
    });
    const sub = Notifications.addNotificationResponseReceivedListener(onResponse);
    return () => sub.remove();
  }, [ready, router]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeRoot>
      <StatusBar style="dark" />
      <AppSync />
      <CloudSync />
      {/* غلاف التجاوب: على الشاشات العريضة (آيباد/أفقي) يوسَّط المحتوى بعرض أقصى بدل التمدد */}
      <View style={{ flex: 1, alignItems: "center", backgroundColor: planner ? "#EAF3FC" : "#F4F4F4" }}>
        <View style={{ flex: 1, width: "100%", maxWidth: planner ? 1280 : 880 }}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: planner ? "#EAF3FC" : "#F4F4F4" } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="ringing" options={{ presentation: "fullScreenModal", gestureEnabled: false }} />
          </Stack>
        </View>
      </View>
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
      <QuickAddSheet />
      <LockGate />
      </ThemeRoot>
    </GestureHandlerRootView>
  );
}
