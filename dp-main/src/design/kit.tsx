import type { ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { DS, surface, type Mode } from "@/design/tokens";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export function GlassCard({ children, mode = "night", style }: { children: ReactNode; mode?: Mode; style?: StyleProp<ViewStyle> }) {
  const s = surface(mode);
  return (
    <View style={[{ backgroundColor: s.card, borderRadius: DS.rCard, padding: 16, borderWidth: mode === "night" ? 1 : 0, borderColor: s.border }, style]}>
      {children}
    </View>
  );
}

export function RoundButton({ icon, onPress, mode = "night", label, active }: { icon: IconName; onPress?: () => void; mode?: Mode; label: string; active?: boolean }) {
  const s = surface(mode);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityLabel={label}
      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: active ? DS.accent : s.card, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name={icon} size={20} color={active ? "#fff" : s.text} />
    </Pressable>
  );
}

export function PillButton({ label, onPress, color = DS.accent, icon }: { label: string; onPress?: () => void; color?: string; icon?: IconName }) {
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: color, borderRadius: DS.rInner, paddingVertical: 13, paddingHorizontal: 18, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}>
      {icon ? <Ionicons name={icon} size={18} color="#fff" /> : null}
      <Text w="bold" style={{ color: "#fff" }}>{label}</Text>
    </Pressable>
  );
}

export function SoftChip({ label, selected, onPress, mode = "night" }: { label: string; selected?: boolean; onPress?: () => void; mode?: Mode }) {
  const s = surface(mode);
  return (
    <Pressable onPress={onPress} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: DS.rPill, backgroundColor: selected ? DS.accent : s.card }}>
      <Text w="semi" style={{ color: selected ? "#fff" : s.text, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

/** غلاف الشاشة الموحّد: خلفية ليلية، ترويسة بزر رجوع دائري وعنوان وأزرار جانبية */
export function NightShell({ title, back = true, right, children, mode = "night" }: { title: string; back?: boolean; right?: ReactNode; children: ReactNode; mode?: Mode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const s = surface(mode);
  return (
    <View style={{ flex: 1, backgroundColor: s.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
        {back ? <RoundButton icon="chevron-forward" onPress={() => router.back()} mode={mode} label="رجوع" /> : null}
        <Text w="bold" style={{ color: s.text, fontSize: 18, flex: 1 }}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}
