import { Tabs } from "expo-router";
import { FloatingTabBar } from "@/components/nav/FloatingTabBar";

/**
 * الشريط: المنبّه • العيادة • الرئيسية (المنتصف) • الصلاة • المستندات.
 * التقويم والمهام شاشات داخل التبويبات لكنها مخفية من الشريط (تُفتح من الرئيسية).
 */
export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="index"
      tabBar={(props) => <FloatingTabBar {...(props as never)} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "الرئيسية" }} />
      <Tabs.Screen name="clinic" options={{ title: "العيادة" }} />
      <Tabs.Screen name="alarms" options={{ title: "المنبّه" }} />
      <Tabs.Screen name="prayer" options={{ title: "الصلاة" }} />
      <Tabs.Screen name="docs" options={{ title: "المستندات" }} />
      <Tabs.Screen name="calendar" options={{ title: "التقويم", href: null }} />
      <Tabs.Screen name="tasks" options={{ title: "المهام", href: null }} />
    </Tabs>
  );
}
