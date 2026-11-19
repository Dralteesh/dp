import { Image, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TREATMENT_ICONS } from "@/constants/icons";
import { useProcedures } from "@/hooks/useProcedures";
import { procedureIcon } from "@/lib/procedures";
import type { ProcedureIcon as Icon } from "@/types";

type IconProps = { icon: Icon; size?: number; color?: string };

/** يرسم أيقونة إجراء: ملف مرسل مع التطبيق، أو Ionicons، أو صورة اختارها المستخدم */
export function ProcedureGlyph({ icon, size = 40, color = "#0E6FA5" }: IconProps) {
  if (icon.kind === "asset") {
    const src = TREATMENT_ICONS[icon.key];
    if (src) return <Image source={src} style={{ width: size, height: size }} resizeMode="contain" />;
    return <Ionicons name="medical" size={size * 0.7} color={color} />;
  }
  if (icon.kind === "image") {
    return <Image source={{ uri: icon.uri }} style={{ width: size, height: size, borderRadius: size * 0.22 }} resizeMode="cover" />;
  }
  return <Ionicons name={icon.name as keyof typeof Ionicons.glyphMap} size={size * 0.7} color={color} />;
}

/** أيقونة الإجراء بحسب اسمه الحر (مطابقة بالاسم ثم بالكلمات المفتاحية) */
export function ProcedureBadge({ name, size = 40, color }: { name?: string; size?: number; color?: string }) {
  const list = useProcedures();
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <ProcedureGlyph icon={procedureIcon(name, list)} size={size} color={color} />
    </View>
  );
}
