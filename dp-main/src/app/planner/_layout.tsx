import { useEffect } from "react";
import { View } from "react-native";
import { Stack, router } from "expo-router";
import { Text } from "@/components/ui/Text";
import { PL } from "@/design/planner";
import { useSettings } from "@/store/useSettings";

/**
 * حارس الأعطال: إن انهارت أي شاشة هنا يتحوّل التطبيق تلقائيًا إلى الواجهة الاحتياطية.
 * العلم uiFallback يجعل الفتح التالي يجرّب الواجهة الأساسية من جديد.
 */
export function ErrorBoundary({ error }: { error: Error; retry: () => Promise<void> }) {
  useEffect(() => {
    if (__DEV__) console.warn("planner crashed, falling back:", error?.message);
    useSettings.getState().update({ uiMode: "classic", uiFallback: true });
    const t = setTimeout(() => router.replace("/" as never), 50);
    return () => clearTimeout(t);
  }, [error]);
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: PL.bg }}>
      <Text w="semi" style={{ color: PL.navy }}>
        جارٍ التحويل…
      </Text>
    </View>
  );
}

export default function PlannerLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: PL.bg } }} />;
}
