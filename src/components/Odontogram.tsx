import { useState } from "react";
import { type LayoutChangeEvent, View } from "react-native";
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";
import { Text } from "@/components/ui/Text";
import { LOWER_TEETH, TOOTH_STATUS, UPPER_TEETH } from "@/constants/clinic";
import { TYPE_META } from "@/constants/shiftTypes";
import { useTheme } from "@/hooks/useTheme";
import type { ToothStatus } from "@/types";

type Props = {
  teeth: Record<string, ToothStatus>;
  selected?: string;
  onSelect: (tooth: string) => void;
};

const HEIGHT = 340;
const SELECT = "#2DD4BF";

/** أبعاد السن حسب نوعه (آخر رقم في FDI): قواطع، ناب، ضواحك، أرحاء */
function toothSize(code: string): { w: number; h: number } {
  const n = Number(code[1]);
  if (n >= 6) return { w: 27, h: 25 };
  if (n >= 4) return { w: 23, h: 23 };
  if (n === 3) return { w: 20, h: 25 };
  return { w: 17, h: 24 };
}

type Placed = { code: string; x: number; y: number; rot: number; lx: number; ly: number };

function placeArch(codes: string[], W: number, upper: boolean): Placed[] {
  const cx = W / 2;
  const rx = W / 2 - 30;
  const ry = 122;
  const cy = upper ? 150 : 190;
  const anchorY = upper ? cy + ry * 0.55 : cy - ry * 0.55;
  return codes.map((code, i) => {
    const phi = (Math.PI * (i + 0.5)) / codes.length;
    const x = cx - rx * Math.cos(phi);
    const y = upper ? cy - ry * Math.sin(phi) : cy + ry * Math.sin(phi);
    const dx = x - cx;
    const dy = y - anchorY;
    const rot = upper ? (Math.atan2(dx, -dy) * 180) / Math.PI : (Math.atan2(-dx, dy) * 180) / Math.PI;
    const len = Math.hypot(dx, dy) || 1;
    return { code, x, y, rot, lx: x + (dx / len) * 25, ly: y + (dy / len) * 25 };
  });
}

/** مخطط الأسنان (FDI) على قوسين داخل بطاقة ملوّنة — من تصميم Dental. اضغط سنًا لتحديده */
export function Odontogram({ teeth, selected, onSelect }: Props) {
  useTheme();
  const [W, setW] = useState(340);
  const base = TYPE_META.private;
  const bg = base.inkHex === "#0A3A5A" ? "#0B5F8F" : base.hex;

  const upper = placeArch(UPPER_TEETH, W, true);
  const lower = placeArch(LOWER_TEETH, W, false);

  const draw = (p: Placed) => {
    const st = teeth[p.code];
    const meta = st ? TOOTH_STATUS[st] : null;
    const size = toothSize(p.code);
    const active = selected === p.code;
    const gone = st === "missing" || st === "extraction";
    return (
      <G key={p.code} onPress={() => onSelect(p.code)}>
        <G transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}>
          <Rect x={-size.w / 2 - 6} y={-size.h / 2 - 6} width={size.w + 12} height={size.h + 12} fill="transparent" />
          {active ? (
            <Rect x={-size.w / 2 - 4} y={-size.h / 2 - 4} width={size.w + 8} height={size.h + 8} rx={11} fill="none" stroke={SELECT} strokeWidth={3} />
          ) : null}
          <Rect
            x={-size.w / 2}
            y={-size.h / 2}
            width={size.w}
            height={size.h}
            rx={size.w * 0.42}
            fill={meta ? meta.hex : "#E7F0F7"}
            fillOpacity={gone ? 0.35 : 1}
            stroke={active ? SELECT : "#FFFFFF"}
            strokeWidth={1.5}
            strokeDasharray={gone ? "3,2" : undefined}
          />
        </G>
        <SvgText x={p.lx} y={p.ly + 3.5} fontSize={9.5} fill="#FFFFFF" fillOpacity={active ? 1 : 0.75} fontWeight={active ? "bold" : "normal"} textAnchor="middle">
          {p.code}
        </SvgText>
      </G>
    );
  };

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      style={{ backgroundColor: bg, borderRadius: 28, paddingTop: 14, overflow: "hidden" }}
    >
      <View style={{ paddingHorizontal: 18, flexDirection: "row", justifyContent: "space-between" }}>
        <Text w="bold" style={{ color: "#FFFFFF", fontSize: 16 }}>
          مخطط الأسنان
        </Text>
        <Text style={{ color: "#FFFFFF", opacity: 0.7, fontSize: 11 }}>يمين المريض على اليسار</Text>
      </View>
      <View style={{ direction: "ltr" }}>
        <Svg width={W} height={HEIGHT}>
          <Line x1={W * 0.12} y1={170} x2={W * 0.88} y2={170} stroke="#FFFFFF" strokeOpacity={0.25} strokeWidth={1} strokeDasharray="4,4" />
          <Line x1={W / 2} y1={60} x2={W / 2} y2={280} stroke="#FFFFFF" strokeOpacity={0.12} strokeWidth={1} />
          {upper.map(draw)}
          {lower.map(draw)}
        </Svg>
      </View>
    </View>
  );
}
