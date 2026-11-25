import { Modal, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { useShortcutMenu } from "@/store/useShortcutMenu";

/** يعرض قائمة الاختصارات (ضغط مطوّل). يوضع مرة واحدة في الرئيسية. */
export function ShortcutMenuHost() {
  const { open, title, items, hide } = useShortcutMenu();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={hide} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "center", paddingHorizontal: 36 }} onPress={hide}>
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 26, padding: 10, elevation: 12 }}>
          {title ? (
            <Text w="bold" className="text-center text-muted text-xs" style={{ paddingVertical: 8 }}>
              {title}
            </Text>
          ) : null}
          {items.map((it, i) => (
            <Pressable
              key={`${it.label}-${i}`}
              onPress={() => {
                hide();
                // بعد إغلاق النافذة مباشرة حتى لا يتعارض مع التنقل
                setTimeout(it.onPress, 60);
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 13,
                paddingHorizontal: 14,
                borderRadius: 18,
                backgroundColor: pressed ? "#EEF4F8" : "transparent",
              })}
            >
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#D6EBF7", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={it.icon as never} size={19} color="#0E6FA5" />
              </View>
              <View style={{ flex: 1 }}>
                <Text w="semi" className="text-base">
                  {it.label}
                </Text>
                {it.hint ? <Text className="text-xs text-muted">{it.hint}</Text> : null}
              </View>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}
