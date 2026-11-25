import { memo, useCallback, useRef, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { BLOCKS, SPAN_LABEL, SPAN_PCT, useHomeLayout, type BlockId, type HomeItem } from "@/store/useHomeLayout";

const ACCENT = "#6366F1";
const TILE_H = 112;
const GAP = 12;
type Rect = { x: number; y: number; width: number; height: number };
const DEF = new Map(BLOCKS.map((b) => [b.id, b]));

type TileProps = {
  item: HomeItem;
  hovered: boolean;
  layouts: React.MutableRefObject<Record<string, Rect>>;
  onMove: (id: BlockId, dx: number, dy: number) => void;
  onDrop: (id: BlockId) => void;
  onClear: () => void;
  onLock: (locked: boolean) => void;
};

/** بلاطة كتلة: مقبض سحب + أزرار العرض والارتفاع والإخفاء */
const Tile = memo(function Tile({ item, hovered, layouts, onMove, onDrop, onClear, onLock }: TileProps) {
  const cycleSpan = useHomeLayout((s) => s.cycleSpan);
  const cycleHeight = useHomeLayout((s) => s.cycleHeight);
  const toggleHidden = useHomeLayout((s) => s.toggleHidden);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const active = useSharedValue(0);
  const def = DEF.get(item.id);

  const pan = Gesture.Pan()
    .minDistance(2)
    .onStart(() => {
      active.value = 1;
      runOnJS(onLock)(true);
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
      runOnJS(onMove)(item.id, e.translationX, e.translationY);
    })
    .onEnd(() => {
      runOnJS(onDrop)(item.id);
    })
    .onFinalize(() => {
      tx.value = 0;
      ty.value = 0;
      active.value = 0;
      runOnJS(onClear)();
      runOnJS(onLock)(false);
    });

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: active.value ? 1.04 : 1 }],
    zIndex: active.value ? 30 : 1,
    opacity: active.value ? 0.92 : 1,
  }));

  const heightLabel = item.height === 0 ? "تلقائي" : String(item.height);
  const btn = { flex: 1, height: 30, borderRadius: 10, backgroundColor: "#F1F3F7", alignItems: "center", justifyContent: "center" } as const;

  return (
    <Animated.View
      onLayout={(e) => {
        layouts.current[item.id] = e.nativeEvent.layout;
      }}
      style={[{ width: SPAN_PCT[item.span], height: TILE_H, marginBottom: GAP }, anim]}
    >
      <View style={{ flex: 1, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: hovered ? 2 : 1, borderColor: hovered ? ACCENT : "#E3E6EB", padding: 8, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <GestureDetector gesture={pan}>
            <View accessibilityLabel="اسحب لتغيير الترتيب" style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="reorder-three" size={24} color={ACCENT} />
            </View>
          </GestureDetector>
          <Text w="bold" numberOfLines={2} style={{ flex: 1, fontSize: 12.5, lineHeight: 17 }}>
            {def?.title ?? item.id}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Pressable onPress={() => cycleSpan(item.id)} accessibilityLabel="تغيير العرض" style={btn}>
            <Text w="semi" style={{ fontSize: 10.5, color: ACCENT }}>
              {SPAN_LABEL[item.span]}
            </Text>
          </Pressable>
          <Pressable onPress={() => cycleHeight(item.id)} accessibilityLabel="تغيير الارتفاع" style={btn}>
            <Text w="semi" style={{ fontSize: 10.5, color: ACCENT }}>
              {heightLabel}
            </Text>
          </Pressable>
          <Pressable onPress={() => toggleHidden(item.id)} accessibilityLabel="إخفاء" style={btn}>
            <Ionicons name="eye-off-outline" size={16} color="#DC2626" />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
});

/** وضع تخصيص الرئيسية: اسحب المقبض لنقل الكتلة، واضغط العرض/الارتفاع لتبديلهما، والعين لإخفائها */
export function HomeEditor({ onDone, onLock }: { onDone: () => void; onLock: (locked: boolean) => void }) {
  const items = useHomeLayout((s) => s.items);
  const move = useHomeLayout((s) => s.move);
  const toggleHidden = useHomeLayout((s) => s.toggleHidden);
  const reset = useHomeLayout((s) => s.reset);
  const layouts = useRef<Record<string, Rect>>({});
  const hoverRef = useRef<BlockId | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const [hover, setHover] = useState<BlockId | null>(null);

  const visible = items.filter((i) => !i.hidden);
  const hidden = items.filter((i) => i.hidden);

  /** البلاطة التي يقع فيها مركز المسحوبة */
  const onMove = useCallback((id: BlockId, dx: number, dy: number) => {
    const me = layouts.current[id];
    if (!me) return;
    const cx = me.x + me.width / 2 + dx;
    const cy = me.y + me.height / 2 + dy;
    let target: BlockId | null = null;
    for (const it of itemsRef.current) {
      if (it.hidden || it.id === id) continue;
      const l = layouts.current[it.id];
      if (l && cx >= l.x && cx <= l.x + l.width && cy >= l.y && cy <= l.y + l.height + GAP) {
        target = it.id;
        break;
      }
    }
    if (target !== hoverRef.current) {
      hoverRef.current = target;
      setHover(target);
    }
  }, []);

  const onDrop = useCallback(
    (id: BlockId) => {
      const t = hoverRef.current;
      if (!t) return;
      const idx = itemsRef.current.findIndex((i) => i.id === t);
      if (idx >= 0) move(id, idx);
    },
    [move],
  );

  const onClear = useCallback(() => {
    hoverRef.current = null;
    setHover(null);
  }, []);

  const confirmReset = () =>
    Alert.alert("استعادة الافتراضي", "يعود ترتيب الرئيسية وأحجامها كما كانت.", [
      { text: "إلغاء", style: "cancel" },
      { text: "استعادة", onPress: reset },
    ]);

  return (
    <View>
      <View style={{ backgroundColor: "#EEF2FF", borderRadius: 18, padding: 12, marginBottom: 12 }}>
        <Text w="bold" style={{ color: ACCENT }}>
          تخصيص الرئيسية
        </Text>
        <Text className="text-xs text-muted" style={{ marginTop: 2, lineHeight: 18 }}>
          اسحب المقبض لنقل الكتلة. زر العرض يبدّل (ثلث / نصف / ثلثان / كامل)، وزر الارتفاع يبدّل بين تلقائي وارتفاعات ثابتة (قد يقصّ المحتوى). العين تُخفي الكتلة.
        </Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
        {visible.map((it) => (
          <Tile key={it.id} item={it} hovered={hover === it.id} layouts={layouts} onMove={onMove} onDrop={onDrop} onClear={onClear} onLock={onLock} />
        ))}
      </View>

      {hidden.length > 0 ? (
        <View style={{ marginTop: 4, marginBottom: 12 }}>
          <Text w="semi" className="text-xs text-muted" style={{ marginBottom: 6 }}>
            الكتل المخفية (اضغط للإظهار)
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {hidden.map((it) => (
              <Pressable key={it.id} onPress={() => toggleHidden(it.id)} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E3E6EB", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
                <Ionicons name="add-circle-outline" size={16} color={ACCENT} />
                <Text w="semi" className="text-xs">
                  {DEF.get(it.id)?.title ?? it.id}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable onPress={confirmReset} style={{ flex: 1, borderWidth: 1.5, borderColor: "#DC2626", borderRadius: 999, paddingVertical: 12, alignItems: "center" }}>
          <Text w="bold" style={{ color: "#DC2626" }}>
            استعادة الافتراضي
          </Text>
        </Pressable>
        <Pressable onPress={onDone} style={{ flex: 1, backgroundColor: ACCENT, borderRadius: 999, paddingVertical: 12, alignItems: "center" }}>
          <Text w="bold" style={{ color: "#FFFFFF" }}>
            تم
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

