import { Tabs } from "expo-router";
import { HomeFab } from "@/components/nav/HomeFab";

/**
 * بلا شريط سفلي: الرئيسية هي المدخل لكل الأقسام (الصلاة، الطقس، المنبّه، العيادة، التقويم، المستندات).
 * زر عائم وحيد في الأسفل: ضغطة = الرئيسية، ومطوّلة = إجراء القسم الحالي.
 * زر الرجوع في أندرويد يعيد إلى الرئيسية.
 */
export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="index"
      backBehavior="initialRoute"
      tabBar={(props) => <HomeFab {...(props as never)} />}
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
