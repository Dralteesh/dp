import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, Modal, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";

/** ألوان بطاقات المنبّه (متناسقة مع ألوان الشاشة: أحمر المنبّه، كريمي، أصفر، أزرق التطبيق) */
export const STACK = {
  red: { bg: "#E32D0B", ink: "#FFFFFF", sub: "#FFD9D0" },
  cream: { bg: "#F3EBDD", ink: "#17140F", sub: "#7A7265" },
  yellow: { bg: "#FFB800", ink: "#17140F", sub: "#6B4F00" },
  blue: { bg: "#0B4F73", ink: "#FFFFFF", sub: "#BFE3F5" },
} as const;

export type StackCard = {
  key: string;
  tone: keyof typeof STACK;
  title?: string;
  hint?: string;
  content?: ReactNode;
};

const RADIUS = 34;
const OVERLAP = 30;

/**
 * بطاقات متتالية تنزلق من الأسفل واحدة بعد الأخرى وتتراكب (تصميم البطاقات الملوّنة):
 * الأولى في الأعلى وكل بطاقة تالية تخرج من تحتها. اضغط الخلفية أو × للإغلاق.
 */
export function CardStack({ visible, onClose, cards }: { visible: boolean; onClose: () => void; cards: StackCard[] }) {
  const insets = useSafeAreaInsets();
  const vals = useRef<Animated.Value[]>([]).current;
  while (vals.length < cards.length) vals.push(new Animated.Value(0));
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    vals.forEach((v) => v.setValue(0));
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    Animated.stagger(
      95,
      vals.slice(0, cards.length).map((v) =>
        Animated.timing(v, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ),
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={{ flex: 1, opacity: fade, backgroundColor: "rgba(15,12,8,0.55)" }}>
        <Pressable onPress={onClose} style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} />
      </Animated.View>
      <ScrollView
        style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Pressable onPress={onClose} style={{ flexGrow: 1, minHeight: insets.top + 40 }} />
        {cards.map((c, i) => {
          const t = STACK[c.tone];
          const last = i === cards.length - 1;
          const v = vals[i];
          return (
            <Animated.View
              key={c.key}
              style={{
                zIndex: cards.length - i,
                marginTop: i === 0 ? 0 : -OVERLAP,
                backgroundColor: t.bg,
                borderTopLeftRadius: RADIUS,
                borderTopRightRadius: RADIUS,
                borderBottomLeftRadius: last ? 0 : RADIUS,
                borderBottomRightRadius: last ? 0 : RADIUS,
                paddingTop: (i === 0 ? 20 : OVERLAP + 16) as number,
                paddingBottom: last ? Math.max(insets.bottom, 16) + 18 : 22,
                paddingHorizontal: 20,
                elevation: 6 + (cards.length - i),
                shadowColor: "#000",
                shadowOpacity: 0.18,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: -3 },
                opacity: v,
                transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [260 + i * 60, 0] }) }],
              }}
            >
              {c.title ? (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: c.hint || c.content ? 10 : 0 }}>
                  <View style={{ flex: 1 }}>
                    <Text w="bold" style={{ color: t.ink, fontSize: i === 0 ? 24 : 17 }}>
                      {c.title}
                    </Text>
                    {c.hint ? (
                      <Text style={{ color: t.sub, fontSize: 12, marginTop: 2 }}>{c.hint}</Text>
                    ) : null}
                  </View>
                  {i === 0 ? (
                    <Pressable
                      onPress={onClose}
                      hitSlop={12}
                      accessibilityLabel="إغلاق"
                      style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }}
                    >
                      <Ionicons name="close" size={22} color={t.ink} />
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
              {c.content}
            </Animated.View>
          );
        })}
      </ScrollView>
    </Modal>
  );
}
