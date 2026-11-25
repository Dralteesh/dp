import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Logo } from "@/components/Logo";
import { PCard, PlannerShell } from "@/components/planner/kit";
import { Text } from "@/components/ui/Text";
import { PL } from "@/design/planner";
import { switchUi } from "@/lib/ui";
import { useSettings } from "@/store/useSettings";

type Item = { icon: keyof typeof Ionicons.glyphMap; title: string; hint: string; href: string };

const ITEMS: Item[] = [
  { icon: "settings-outline", title: "كل الإعدادات", hint: "الصلاة، الإجراءات، الأسعار، النسخ الاحتياطي...", href: "/settings" },
  { icon: "sunny-outline", title: "المظهر", hint: "الألوان والشعار", href: "/appearance" },
  { icon: "cloud-upload-outline", title: "الحساب والمزامنة", hint: "النسخ الاحتياطي والمزامنة السحابية", href: "/account" },
  { icon: "lock-closed-outline", title: "الأمان والقفل", hint: "رمز القفل والبصمة", href: "/security" },
  { icon: "notifications-outline", title: "التذكيرات والأذكار", hint: "إشعارات الصلاة والأذكار", href: "/reminders-prayer" },
  { icon: "business-outline", title: "أماكن العمل", hint: "المشفى والعيادة والأنواع", href: "/workplaces" },
  { icon: "help-buoy-outline", title: "المساعدة والدعم", hint: "اقتراحات وملاحظات", href: "/connect" },
];

/** الإعدادات (الواجهة الجديدة): اختصارات إلى كل الإعدادات الأصلية */
export default function PlannerSettings() {
  const router = useRouter();
  const appName = useSettings((s) => s.appName);
  const logo = useSettings((s) => s.logo);
  return (
    <PlannerShell title="الإعدادات" nav="settings">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: PL.cardStrong, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: PL.border }}>
        <Logo uri={logo} size={64} app />
        <View style={{ flex: 1 }}>
          <Text w="bold" style={{ fontSize: 20, color: PL.navy }}>
            {appName || "Alteesh Planner"}
          </Text>
          <Text style={{ color: PL.navySoft, fontSize: 12.5 }}>مساعد عيادة الأسنان</Text>
        </View>
      </View>

      <PCard style={{ marginTop: 14, paddingVertical: 4 }}>
        {ITEMS.map((it, i) => (
          <Pressable
            key={it.href}
            onPress={() => router.push(it.href as never)}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: i === ITEMS.length - 1 ? 0 : 1, borderBottomColor: PL.border }}
          >
            <Ionicons name={it.icon} size={24} color={PL.blue} />
            <View style={{ flex: 1 }}>
              <Text w="semi" style={{ color: PL.navy }}>
                {it.title}
              </Text>
              <Text style={{ fontSize: 11.5, color: PL.muted }}>{it.hint}</Text>
            </View>
            <Ionicons name="chevron-back" size={18} color={PL.muted} />
          </Pressable>
        ))}
      </PCard>

      <Pressable
        onPress={() => switchUi("classic")}
        style={{ marginTop: 16, borderWidth: 2, borderColor: PL.blue, borderRadius: 999, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        <Ionicons name="swap-horizontal" size={20} color={PL.blue} />
        <Text w="bold" style={{ color: PL.blue }}>
          الانتقال إلى الواجهة الأصلية
        </Text>
      </Pressable>
    </PlannerShell>
  );
}
