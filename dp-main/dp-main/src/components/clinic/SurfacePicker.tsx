import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import type { ToothSurface } from "@/types";

const LABEL: Record<ToothSurface, string> = { m: "M", d: "D", o: "O", b: "B", l: "L" };
export const SURFACE_NAME: Record<ToothSurface, string> = {
  m: "إنسي",
  d: "وحشي",
  o: "إطباقي / قاطع",
  b: "دهليزي",
  l: "لساني / حنكي",
};
export const SURFACE_ORDER: ToothSurface[] = ["m", "d", "o", "b", "l"];

/** سن مبسّط بخمسة أسطح قابلة للضغط (M أعلى، B يسار، O وسط، L يمين، D أسفل) */
export function SurfacePicker({
  value,
  onChange,
  color = "#0E6FA5",
}: {
  value: ToothSurface[];
  onChange: (v: ToothSurface[]) => void;
  color?: string;
}) {
  const toggle = (s: ToothSurface) => onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s]);

  const cell = (s: ToothSurface) => {
    const on = value.includes(s);
    return (
      <Pressable
        key={s}
        onPress={() => toggle(s)}
        hitSlop={4}
        accessibilityLabel={SURFACE_NAME[s]}
        style={{
          width: 46,
          height: 46,
          borderRadius: s === "o" ? 16 : 10,
          borderWidth: 1.5,
          borderColor: on ? color : "#B8D9E9",
          backgroundColor: on ? color : s === "o" ? "#D3EAF7" : "#EDF7FC",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text w="bold" style={{ color: on ? "#FFFFFF" : "#426B84" }}>
          {LABEL[s]}
        </Text>
      </Pressable>
    );
  };

  return (
    <View className="items-center">
      {/* اتجاه الأسطح ثابت بغضّ النظر عن RTL */}
      <View style={{ direction: "ltr", alignItems: "center", gap: 4 }}>
        {cell("m")}
        <View style={{ flexDirection: "row", gap: 4 }}>
          {cell("b")}
          {cell("o")}
          {cell("l")}
        </View>
        {cell("d")}
      </View>
      <Text className="text-xs text-muted mt-2">
        {value.length ? value.map((s) => SURFACE_NAME[s]).join(" · ") : "اضغط على الأسطح المعنية"}
      </Text>
    </View>
  );
}
