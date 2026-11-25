import { Image, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CLINIC_LOGO, Logo } from "@/components/Logo";
import { Text } from "@/components/ui/Text";
import { PL } from "@/design/planner";
import { switchUi } from "@/lib/ui";
import { useSettings } from "@/store/useSettings";

/** شاشة الترحيب (الواجهة الجديدة) */
export default function PlannerWelcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const appName = useSettings((s) => s.appName);
  const logo = useSettings((s) => s.logo);
  return (
    <View style={{ flex: 1, backgroundColor: PL.bg, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }}>
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "38%", backgroundColor: PL.bgDeep, borderTopLeftRadius: 120, borderTopRightRadius: 220 }} />
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "24%", backgroundColor: PL.cardStrong, borderTopLeftRadius: 220, borderTopRightRadius: 100 }} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        {logo ? <Logo uri={logo} size={170} /> : <Image source={CLINIC_LOGO} style={{ width: 190, height: 190 }} resizeMode="contain" />}
        <Text w="bold" style={{ fontSize: 40, lineHeight: 56, color: PL.navy, marginTop: 14, textAlign: "center" }}>
          {appName || "Alteesh Planner"}
        </Text>
        <Text style={{ color: PL.navySoft, marginTop: 6, fontSize: 15 }}>خطّط · نظّم · اعتنِ</Text>
      </View>
      <View style={{ paddingHorizontal: 32, gap: 10 }}>
        <Pressable
          onPress={() => switchUi("planner")}
          style={{ backgroundColor: PL.navy, borderRadius: 999, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <Text w="bold" style={{ color: "#fff", fontSize: 17 }}>
            ابدأ
          </Text>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <Pressable onPress={() => switchUi("classic")} style={{ paddingVertical: 8, alignItems: "center" }}>
          <Text w="semi" style={{ color: PL.navy, fontSize: 13 }}>
            الواجهة الأصلية
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
