import { useMemo, useState } from "react";
import { type LayoutChangeEvent, Pressable, View } from "react-native";
import Svg, { Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { ODONTO_BG, TOOTH_STATUS } from "@/constants/clinic";
import { PRIMARY_LINE, PRIMARY_MID_Y, PRIMARY_SHAPES, PRIMARY_VB, SHAPES_LINE, SHAPES_MID_Y, SHAPES_VB, SHOW_TOOTH_NUMBERS, TOOTH_SHAPES } from "@/constants/toothShapes";
import { useTheme } from "@/hooks/useTheme";
import {
  type Dentition,
  defaultDentition,
  navOrder,
  toothName,
} from "@/lib/odontogram";
import type { ToothStatus } from "@/types";

type Props = {
  teeth: Record<string, ToothStatus>;
  selected?: string;
  onSelect: (tooth: string) => void;
  /** دائمة | لبنية. إن لم تُمرَّر يُحسب الافتراضي من السجلات/العمر ويُدار داخليًا */
  dentition?: Dentition;
  onDentitionChange?: (d: Dentition) => void;
  /** سنة ميلاد المريض لتحديد الوضع الافتراضي */
  birthYear?: number;
};

const SELECT = "#2DD4BF";
const TOOTH_TOP = "#F1EEFC";
const TOOTH_BOTTOM = "#CFC9F0";
const TEXT_PALE = "#4A4BA3";

/** مخطط الأسنان (FDI) على قوسين U: أسنان بحجومها الحقيقية موزّعة على طول القوس. اضغط قرب سن لتحديده */
export function Odontogram({ teeth, selected, onSelect, dentition: dentProp, onDentitionChange, birthYear }: Props) {
  useTheme();
  const [W, setW] = useState(340);
  const [own, setOwn] = useState<Dentition | null>(null);
  const dentition: Dentition = dentProp ?? own ?? defaultDentition(teeth, birthYear);
  const order = useMemo(() => navOrder(dentition), [dentition]);

  const setDentition = (d: Dentition) => {
    setOwn(d);
    onDentitionChange?.(d);
  };

  const step = (dir: 1 | -1) => {
    const i = selected ? order.indexOf(selected) : -1;
    const next = i < 0 ? (dir === 1 ? 0 : order.length - 1) : (i + dir + order.length) % order.length;
    onSelect(order[next]);
  };

  const sel = selected && order.includes(selected) ? selected : undefined;
  const selStatus = selected ? teeth[selected] : undefined;

  // ---- أشكال SVG منقولة من الصورة المرجعية (دائمة ولبنية) ----
  const permanent = dentition === "permanent";
  const SH = permanent ? TOOTH_SHAPES : PRIMARY_SHAPES;
  const VB = permanent ? SHAPES_VB : PRIMARY_VB;
  const MID = permanent ? SHAPES_MID_Y : PRIMARY_MID_Y;
  const LINE = permanent ? SHAPES_LINE : PRIMARY_LINE;
  const k = W / VB.w; // وحدات الرسم ← بكسل
  const shapesH = Math.round(VB.h * k);
  const u = (px: number) => px / k; // بكسل ← وحدات الرسم

  const drawShape = (code: string) => {
    const sh = SH[code];
    if (!sh) return null;
    const st = teeth[code];
    const meta = st ? TOOTH_STATUS[st] : null;
    const active = sel === code;
    const gone = st === "missing" || st === "extraction";
    const fill = active ? SELECT : meta ? meta.hex : "url(#tg)";
    const numColor = active ? "#053D37" : meta ? "#FFFFFF" : TEXT_PALE;
    const fs = u(9);
    return (
      <G key={code}>
        {active ? <Path d={sh.d} fill="none" stroke={SELECT} strokeWidth={u(7)} strokeOpacity={0.3} strokeLinejoin="round" /> : null}
        <Path
          d={sh.d}
          fill={fill}
          fillOpacity={gone ? 0.35 : 1}
          stroke="#FFFFFF"
          strokeOpacity={active ? 1 : 0.55}
          strokeWidth={u(active ? 2 : 1)}
          strokeLinejoin="round"
          strokeDasharray={gone ? `${u(3)},${u(2)}` : undefined}
        />
        {st === "crown" ? <Line x1={sh.cx - sh.w * 0.38} y1={sh.cy - sh.h * 0.2} x2={sh.cx + sh.w * 0.38} y2={sh.cy - sh.h * 0.2} stroke="#FFFFFF" strokeWidth={u(1.4)} strokeOpacity={0.9} /> : null}
        {st === "implant" ? (
          <G>
            <Line x1={sh.cx} y1={sh.cy - sh.h * 0.32} x2={sh.cx} y2={sh.cy + sh.h * 0.32} stroke="#FFFFFF" strokeWidth={u(1.4)} strokeOpacity={0.9} />
            <Line x1={sh.cx - sh.w * 0.2} y1={sh.cy - sh.h * 0.12} x2={sh.cx + sh.w * 0.2} y2={sh.cy - sh.h * 0.12} stroke="#FFFFFF" strokeWidth={u(1.2)} strokeOpacity={0.9} />
            <Line x1={sh.cx - sh.w * 0.2} y1={sh.cy + sh.h * 0.1} x2={sh.cx + sh.w * 0.2} y2={sh.cy + sh.h * 0.1} stroke="#FFFFFF" strokeWidth={u(1.2)} strokeOpacity={0.9} />
          </G>
        ) : null}
        {gone ? <Line x1={sh.cx - sh.w * 0.5} y1={sh.cy} x2={sh.cx + sh.w * 0.5} y2={sh.cy} stroke="#FFFFFF" strokeWidth={u(1.4)} strokeOpacity={0.85} /> : null}
        {SHOW_TOOTH_NUMBERS ? (
          <SvgText x={sh.cx} y={sh.cy + fs * 0.35} fontSize={fs} fill={numColor} fontWeight={active ? "bold" : "normal"} textAnchor="middle">
            {code}
          </SvgText>
        ) : null}
      </G>
    );
  };

  /** أقرب سن لنقطة لمس (بكسل) ضمن نفس الفك */
  const pickShape = (px: number, py: number): string | null => {
    const vx = px / k;
    const vy = VB.y + py / k;
    const upper = vy < MID;
    let best: { code: string; d: number } | null = null;
    for (const code of order) {
      const sh = SH[code];
      if (!sh || (sh.cy < MID) !== upper) continue;
      const d = Math.hypot(sh.cx - vx, sh.cy - vy);
      if (d <= u(30) && (!best || d < best.d)) best = { code, d };
    }
    return best?.code ?? null;
  };

  const Seg = ({ id, label }: { id: Dentition; label: string }) => (
    <Pressable
      onPress={() => setDentition(id)}
      style={{ paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14, backgroundColor: dentition === id ? "#FFFFFF" : "transparent" }}
      accessibilityLabel={label}
    >
      <Text w="semi" style={{ fontSize: 12, color: dentition === id ? ODONTO_BG : "#FFFFFF" }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(Math.max(260, e.nativeEvent.layout.width))} style={{ backgroundColor: ODONTO_BG, borderRadius: 28, paddingTop: 14, overflow: "hidden" }}>
      <View style={{ paddingHorizontal: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text w="bold" style={{ color: "#FFFFFF", fontSize: 16 }}>
          مخطط الأسنان
        </Text>
        <View style={{ flexDirection: "row", backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 16, padding: 2 }}>
          <Seg id="permanent" label="دائمة" />
          <Seg id="primary" label="لبنية" />
        </View>
      </View>
      <Text style={{ color: "#FFFFFF", opacity: 0.65, fontSize: 11, paddingHorizontal: 18, marginTop: 2 }}>يمين المريض على اليسار</Text>

      <View style={{ direction: "ltr", marginTop: 6 }}>
          <Pressable onPress={(e) => {
            const code = pickShape(e.nativeEvent.locationX, e.nativeEvent.locationY);
            if (code) onSelect(code);
          }}>
            <Svg width={W} height={shapesH} viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}>
              <Defs>
                <LinearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={TOOTH_TOP} />
                  <Stop offset="1" stopColor={TOOTH_BOTTOM} />
                </LinearGradient>
              </Defs>
              <Line x1={LINE.x1} y1={MID} x2={LINE.x2} y2={MID} stroke="#FFFFFF" strokeOpacity={0.32} strokeWidth={u(1)} />
              {order.map(drawShape)}
            </Svg>
          </Pressable>
      </View>

      {/* لوح السن المحدّد + التنقل بين الأسنان */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 12, paddingTop: 2, gap: 8 }}>
        <Pressable onPress={() => step(-1)} hitSlop={8} accessibilityLabel="السن السابق" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </Pressable>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
          {sel ? (
            <>
              <Text w="bold" style={{ color: SELECT, fontSize: 28, fontVariant: ["tabular-nums"] }}>
                {sel}
              </Text>
              <View style={{ flexShrink: 1 }}>
                <Text w="semi" style={{ color: "#FFFFFF", fontSize: 13 }} numberOfLines={1}>
                  {toothName(sel)}
                </Text>
                <Text style={{ color: "#FFFFFF", opacity: 0.75, fontSize: 12 }}>{selStatus ? TOOTH_STATUS[selStatus].label : "سليم"}</Text>
              </View>
            </>
          ) : (
            <Text style={{ color: "#FFFFFF", opacity: 0.75, fontSize: 12 }}>اضغط على سنٍّ أو استعمل الأسهم</Text>
          )}
        </View>
        <Pressable onPress={() => step(1)} hitSlop={8} accessibilityLabel="السن التالي" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}
