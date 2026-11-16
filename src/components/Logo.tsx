import { Image, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { IconName } from "@/constants/shiftTypes";

/** شعار التطبيق الافتراضي (Dentist Planner) */
export const APP_LOGO = require("../../assets/logo.png");

/** شعار مربع: الصورة المخصّصة إن وُجدت وإلا أيقونة افتراضية */
export function Logo({
  uri,
  size = 40,
  icon = "medkit",
  bg = "#0F172A",
  app,
}: {
  uri?: string;
  size?: number;
  icon?: IconName;
  bg?: string;
  /** true: يستعمل شعار التطبيق الافتراضي إن لم يوجد uri */
  app?: boolean;
}) {
  const r = size * 0.28;
  if (!uri && app) {
    return <Image source={APP_LOGO} style={{ width: size, height: size }} resizeMode="contain" />;
  }
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: r }} resizeMode="cover" />;
  }
  return (
    <View
      style={{ width: size, height: size, borderRadius: r, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name={icon} size={size * 0.52} color="#FFFFFF" />
    </View>
  );
}
