import { Tabs } from "expo-router";

/**
 * بلا شريط سفلي: الرئيسية هي المدخل لكل الأقسام (الصلاة، الطقس، المنبّه، العيادة، التقويم، المستندات).
 * زر الرجوع في أندرويد يعيد إلى الرئيسية.
 */
export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="index"
      backBehavior="initialRoute"
      tabBar={() => null}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "الرئيسية" }} />
      <Tabs.Screen name="clinic" options={{ title: "العيادة" }} />
      <Tabs.Screen name="alarms" options={{ title: "المنبّه" }} />
      <Tabs.Screen name="prayer" options={{ title: "الصلاة" }} />
      <Tabs.Screen name="weather" options={{ title: "الطقس" }} />
      <Tabs.Screen name="documents" options={{ title: "المستندات" }} />
      <Tabs.Screen name="focus" options={{ href: null }} />
      <Tabs.Screen name="calendar" options={{ title: "التقويم" }} />
      <Tabs.Screen name="tasks" options={{ href: null }} />
    </Tabs>
  );
}
