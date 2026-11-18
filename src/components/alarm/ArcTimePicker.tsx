import { useEffect, useRef, useState } from "react";
import { type LayoutChangeEvent, Pressable, ScrollView, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Text } from "@/components/ui/Text";

const ROW = 62;
const HEIGHT = 300;
const CYCLES = 30; // نكرّر القيم ليبدو الدولاب بلا نهاية
const YELLOW = "#F6B400";

type WheelProps = {
  values: string[];
  index: number;
  onIndex: (i: number) => void;
  side: "left" | "right";
  /** مركز الأرقام أفقيًا */
  centerX: number;
  fontSize: number;
};

/** دولاب أرقام يتبع قوسًا دائريًا: الأرقام البعيدة تنحني نحو الخارج وتخفت */
function ArcWheel({ values, index, onIndex, side, centerX, fontSize }: WheelProps) {
  const n = values.length;
  const ref = useRef<ScrollView>(null);
  const mid = Math.floor(CYCLES / 2);
  const [offset, setOffset] = useState((mid * n + index) * ROW);
  const last = useRef(index);

  useEffect(() => {
    // مزامنة خارجية (مثلًا عند تبديل ص/م أو فتح تعديل): انتقل بلا حركة
    const y = (mid * n + index) * ROW;
    const t = setTimeout(() => ref.current?.scrollTo({ y, animated: false }), 0);
    last.current = index;
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const settle = (y: number) => {
    const i = Math.round(y / ROW);
    const v = ((i % n) + n) % n;
    if (v !== last.current) {
      last.current = v;
      onIndex(v);
    }
    // أعد التمركز في منتصف التكرار حتى لا نصل لنهاية القائمة
    if (i < n * 3 || i > n * (CYCLES - 3)) {
      const y2 = (mid * n + v) * ROW;
      ref.current?.scrollTo({ y: y2, animated: false });
      setOffset(y2);
    }
  };

  const center = HEIGHT / 2;
  const R = 250; // نصف قطر القوس الذي تسير عليه الأرقام
  const cur = Math.round(offset / ROW);
  const items = [];
  for (let d = -4; d <= 4; d++) {
    const i = cur + d;
    const dist = i * ROW - offset;
    const a = Math.min(Math.abs(dist), R - 1);
    const shift = R - Math.sqrt(R * R - a * a);
    const sign = side === "left" ? -1 : 1;
    const near = Math.max(0, 1 - Math.abs(dist) / (ROW * 0.9));
    const v = values[((i % n) + n) % n];
    items.push(
      <Text
        key={i}
        w="bold"
        style={{
          position: "absolute",
          width: 110,
          textAlign: "center",
          left: centerX - 55,
          top: center + dist - ROW / 2,
          height: ROW,
          lineHeight: ROW,
          fontSize: fontSize * (0.62 + 0.38 * near),
          color: near > 0.55 ? "#0A0A0A" : "#B9B9B9",
          opacity: Math.max(0.12, 1 - Math.abs(dist) / (ROW * 3.6)),
          fontVariant: ["tabular-nums"],
          transform: [{ translateX: sign * shift * 0.9 }, { rotate: `${(sign * dist) / R / 1.4}rad` }],
        }}
      >
        {v}
      </Text>,
    );
  }

  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: HEIGHT }} pointerEvents="box-none">
      <ScrollView
        ref={ref}
        // الدولاب كله يلتقط اللمس لكن يُرسَم بالطبقة العلوية أدناه
        style={{ position: "absolute", top: 0, height: HEIGHT, width: 150, left: centerX - 75 }}
        contentContainerStyle={{ height: n * CYCLES * ROW + HEIGHT - ROW, paddingTop: 0 }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW}
        decelerationRate="fast"
        scrollEventThrottle={16}
        nestedScrollEnabled
        onScroll={(e) => setOffset(e.nativeEvent.contentOffset.y)}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => {
          // إن لم يبدأ زخم (رفع الإصبع بلا دفع) ثبّت القيمة
          const y = e.nativeEvent.contentOffset.y;
          const v = e.nativeEvent.velocity?.y ?? 0;
          if (Math.abs(v) < 0.05) settle(y);
        }}
      >
        <View style={{ height: n * CYCLES * ROW + HEIGHT - ROW }} />
      </ScrollView>
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, height: HEIGHT }}>
        {items}
      </View>
    </View>
  );
}

type Props = {
  /** HH:mm بنظام 24 ساعة */
  value: string;
  onChange: (hhmm: string) => void;
  accent?: string;
};

const HOURS12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

/** منتقي وقت بقوسين (ساعات يسارًا ودقائق يمينًا) وكتلة صفراء في المنتصف — من تصميم «When do you usually wake up» */
export function ArcTimePicker({ value, onChange, accent = YELLOW }: Props) {
  const [w, setW] = useState(360);
  const [h24, m] = value.split(":").map(Number);
  const pm = h24 >= 12;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;

  const emit = (hour12: number, minute: number, isPm: boolean) => {
    const base = hour12 % 12; // 12 -> 0
    const hh = isPm ? base + 12 : base;
    onChange(`${String(hh).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  };

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const midX = w / 2;
  const ring = Math.max(34, w * 0.1);
  const Rr = 330;
  const fontSize = Math.min(68, w * 0.17);
  const cy = HEIGHT / 2;

  return (
    <View onLayout={onLayout} style={{ height: HEIGHT, width: "100%", direction: "ltr" }}>
      <Svg width={w} height={HEIGHT} style={{ position: "absolute" }}>
        <Circle cx={midX - ring / 2 - Rr - 0} cy={cy} r={Rr} stroke="#D8D8D6" strokeWidth={ring} fill="none" />
        <Circle cx={midX + ring / 2 + Rr + 0} cy={cy} r={Rr} stroke="#D8D8D6" strokeWidth={ring} fill="none" />
      </Svg>

      <ArcWheel
        key="h"
        values={HOURS12}
        index={h12 - 1}
        onIndex={(i) => emit(i + 1, m, pm)}
        side="left"
        centerX={midX - ring - w * 0.17}
        fontSize={fontSize}
      />
      <ArcWheel
        key="m"
        values={MINUTES}
        index={m}
        onIndex={(i) => emit(h12, i, pm)}
        side="right"
        centerX={midX + ring + w * 0.12}
        fontSize={fontSize}
      />

      {/* النقطتان والكتلة الصفراء */}
      <Text w="bold" style={{ position: "absolute", left: midX - 8, top: cy - 34, fontSize: fontSize * 0.75, color: "#0A0A0A" }}>
        :
      </Text>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: midX - 24,
          top: cy - 118,
          width: 48,
          height: 44,
          borderRadius: 20,
          borderBottomRightRadius: 6,
          transform: [{ rotate: "45deg" }],
          backgroundColor: accent,
        }}
      />

      {/* ص / م */}
      <Pressable
        onPress={() => emit(h12, m, !pm)}
        hitSlop={10}
        style={{ position: "absolute", right: 6, top: cy - 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.06)" }}
      >
        <Text w="bold" style={{ fontSize: 15, color: "#0A0A0A" }}>
          {pm ? "م" : "ص"}
        </Text>
      </Pressable>
    </View>
  );
}
