import { View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui/PressableScale";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import type { IconName } from "@/constants/shiftTypes";

type Item = {
  title: string;
  hint: string;
  icon: IconName;
  hex: string;
  soft: string;
  href: string;
};

const ITEMS: Item[] = [
  {
    title: "العيادة الخاصة",
    hint: "المرضى والمواعيد والجلسات والحسابات",
    icon: "storefront",
    hex: "#16A34A",
    soft: "#DCFCE7",
    href: "/clinic",
  },
  {
    title: "المنبّه الإجباري",
    hint: "رنين متكرر بأعلى صوت مع غفوة",
    icon: "alarm",
    hex: "#DC2626",
    soft: "#FEE2E2",
    href: "/alarms",
  },
  {
    title: "الأدوات المصغرة والساعة",
    hint: "ودجت الشاشة الرئيسية وإشعارات Xiaomi Watch",
    icon: "watch",
    hex: "#2563EB",
    soft: "#DBEAFE",
    href: "/connect",
  },
  {
    title: "الحساب والمزامنة",
    hint: "نسخ احتياطي سحابي ومزامنة بين الأجهزة",
    icon: "cloud",
    hex: "#0891B2",
    soft: "#CFFAFE",
    href: "/account",
  },
  {
    title: "الإعدادات",
    hint: "الصلاة، التذكيرات، العملة، إدارة البيانات",
    icon: "settings",
    hex: "#475569",
    soft: "#E2E8F0",
    href: "/settings",
  },
];

export default function MoreScreen() {
  const router = useRouter();
  return (
    <Screen title="المزيد">
      {ITEMS.map((it) => (
        <PressableScale
          key={it.href}
          className="flex-row items-center gap-4 bg-surface border border-line rounded-2xl p-4 mb-3"
          onPress={() => router.push(it.href as never)}
        >
          <View
            className="w-12 h-12 rounded-2xl items-center justify-center"
            style={{ backgroundColor: it.soft }}
          >
            <Ionicons name={it.icon} size={24} color={it.hex} />
          </View>
          <View className="flex-1">
            <Text w="bold" className="text-base">
              {it.title}
            </Text>
            <Text className="text-sm text-muted">{it.hint}</Text>
          </View>
          <Ionicons name="chevron-back" size={20} color="#94A3B8" />
        </PressableScale>
      ))}
    </Screen>
  );
}
