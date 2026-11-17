import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { IconName } from "@/constants/shiftTypes";

function icon(name: IconName, focused: IconName) {
  return ({ color, focused: f, size }: { color: string; focused: boolean; size: number }) => (
    <Ionicons name={f ? focused : name} size={size} color={color} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0F172A",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarLabelStyle: { fontFamily: "Cairo_600SemiBold", fontSize: 11 },
        tabBarStyle: {
          height: 66,
          paddingTop: 6,
          paddingBottom: 8,
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E3E1D8",
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "اليوم", tabBarIcon: icon("home-outline", "home") }} />
      <Tabs.Screen
        name="calendar"
        options={{ title: "التقويم", tabBarIcon: icon("calendar-outline", "calendar") }}
      />
      <Tabs.Screen
        name="tasks"
        options={{ title: "المهام", tabBarIcon: icon("checkbox-outline", "checkbox") }}
      />
      <Tabs.Screen
        name="prayer"
        options={{ title: "الصلاة", tabBarIcon: icon("compass-outline", "compass") }}
      />
      <Tabs.Screen name="more" options={{ title: "المزيد", tabBarIcon: icon("grid-outline", "grid") }} />
    </Tabs>
  );
}
