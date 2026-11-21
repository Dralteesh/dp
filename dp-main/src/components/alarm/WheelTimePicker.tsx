import { useMemo, useRef, useState } from "react";
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "@/components/ui/Text";
import { pad } from "@/lib/dates";

const INK = "#111111";
const YELLOW = "#FFB800";
const ITEM_H = 66;
const VISIBLE = 5;
const REPEATS = 200; // الدولاب يبدو بلا نهاية بتكرار القيم

type Props = {
  /** HH:mm بنظام 24 ساعة */
  value: string;
  onChange: (time: string) => void;
};

/** منتقي وقت بدولابين (ساعة : دقيقة) + ص/م — من تصميم Clucky. يُعرض دائمًا LTR كي يبقى الترتيب ساعة ثم دقيقة */
export function WheelTimePicker({ value, onChange }: Props) {
  const [h0, m0] = value.split(":").map(Number);
  // الحالة الأولية تُقرأ مرة واحدة؛ الدواليب غير مضبوطة من الخارج بعد ذلك
  const [hour12, setHour12] = useState(h0 % 12 === 0 ? 12 : h0 % 12);
  const [minute, setMinute] = useState(m0);
  const [isAm, setIsAm] = useState(h0 < 12);
  const init = useRef({ hour12, minute }).current;

  const emit = (h12: number, m: number, am: boolean) =>
    onChange(`${pad((h12 % 12) + (am ? 0 : 12))}:${pad(m)}`);

  return (
    <View style={{ direction: "ltr", alignItems: "center", paddingHorizontal: 24 }}>
      {/* المعيّن الأصفر بين الدولابين */}
      <View style={s.diamond} />
      <View style={{ height: 4 }} />

      <View style={s.wheelsRow}>
        <Wheel
          count={12}
          initialValue={init.hour12 - 1}
          label={(i) => pad(i + 1)}
          alignEnd
          onSelected={(i) => {
            setHour12(i + 1);
            emit(i + 1, minute, isAm);
          }}
        />
        <Text w="bold" style={s.colon}>
          :
        </Text>
        <Wheel
          count={60}
          initialValue={init.minute}
          label={pad}
          alignEnd={false}
          onSelected={(i) => {
            setMinute(i);
            emit(hour12, i, isAm);
          }}
        />
      </View>

      <View style={{ height: 8 }} />
      <Pressable
        accessibilityLabel="ص / م"
        onPress={() => {
          setIsAm(!isAm);
          emit(hour12, minute, !isAm);
        }}
        style={{ paddingHorizontal: 20, paddingVertical: 12 }}
      >
        <Text w="bold" style={{ fontSize: 20, color: INK }}>
          {isAm ? "ص" : "م"}
        </Text>
      </Pressable>
    </View>
  );
}

// ---------- دولاب لا نهائي مع تثبيت ----------
function Wheel({
  count,
  initialValue,
  label,
  alignEnd,
  onSelected,
}: {
  count: number;
  initialValue: number;
  label: (i: number) => string;
  alignEnd: boolean;
  onSelected: (i: number) => void;
}) {
  const total = count * REPEATS;
  const base = count * (REPEATS / 2); // من مضاعفات count
  const half = Math.floor(VISIBLE / 2);
  const data = useMemo(() => Array.from({ length: total }, (_, i) => i), [total]);
  const listRef = useRef<FlatList<number>>(null);
  const [center, setCenter] = useState(base + initialValue);
  const mod = (n: number) => ((n % count) + count) % count;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const c = Math.round(e.nativeEvent.contentOffset.y / ITEM_H) + half;
    if (c !== center) {
      setCenter(c);
      onSelected(mod(c));
    }
  };

  // عند الابتعاد كثيرًا عن المنتصف نقفز للمنتصف بنفس القيمة (غير مرئي)
  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    if (idx < count * 20 || idx > total - count * 20) {
      listRef.current?.scrollToOffset({ offset: (base + mod(idx)) * ITEM_H, animated: false });
      setCenter(base + mod(idx) + half);
    }
  };

  return (
    <View style={{ flex: 1, height: ITEM_H * VISIBLE }}>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(i) => String(i)}
        extraData={center}
        initialScrollIndex={base + initialValue - half}
        getItemLayout={(_, index) => ({ length: ITEM_H, offset: ITEM_H * index, index })}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumEnd}
        windowSize={7}
        initialNumToRender={VISIBLE + 2}
        renderItem={({ index }) => {
          const d = Math.abs(index - center);
          const alpha = d === 0 ? 1 : d === 1 ? 0.32 : d === 2 ? 0.16 : 0.08;
          return (
            <View
              style={{
                height: ITEM_H,
                justifyContent: "center",
                alignItems: alignEnd ? "flex-end" : "flex-start",
              }}
            >
              <Text
                w="bold"
                style={{ fontSize: d === 0 ? 44 : 36, lineHeight: 56, color: INK, opacity: alpha }}
              >
                {label(mod(index))}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  diamond: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: YELLOW,
    transform: [{ rotate: "45deg" }],
  },
  wheelsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", width: "100%" },
  colon: { fontSize: 36, color: INK, paddingHorizontal: 14 },
});
