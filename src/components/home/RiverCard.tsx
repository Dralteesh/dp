import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { Text } from "@/components/ui/Text";

const W = 360;
const H = 220;
const BOAT_START = 196; // على الضفة
const BOAT_END = 74; // قرب القمر والقلب

const STARS: [number, number, number][] = [
  [40, 22, 1.2], [96, 40, 1], [150, 18, 1.3], [210, 30, 1], [290, 22, 1.2], [330, 60, 1],
  [70, 70, 1], [250, 80, 1.1], [120, 90, 0.9], [185, 52, 1],
];

/** يعكس مسارًا أفقيًا حول x=180 */
const mirror = (d: string) =>
  d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_m, x, y) => `${W - Number(x)},${y}`);

const L_OUTER = "M0,40 C95,52 140,120 172,208 L0,208 Z";
const L_MID = "M0,84 C80,96 128,150 160,208 L0,208 Z";
const L_INNER = "M0,128 C66,138 112,176 148,208 L0,208 Z";

function Boat({ y, row }: { y: number; row: number }) {
  // مجاديف تتحرك قليلًا
  const o = 4 + Math.sin(row) * 3;
  return (
    <G transform={`translate(${W / 2} ${y})`}>
      {/* أثر الماء خلف القارب */}
      <Path d="M-14,26 q14,8 28,0" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <Path d="M-20,34 q20,9 40,0" stroke="#FFFFFF" strokeOpacity={0.2} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      {/* المجاديف */}
      <Path d={`M-9,-2 L-${28 + o},${8 + o}`} stroke="#3C2A1E" strokeWidth={2} strokeLinecap="round" />
      <Path d={`M9,-2 L${28 + o},${8 + o}`} stroke="#3C2A1E" strokeWidth={2} strokeLinecap="round" />
      {/* الهيكل */}
      <Ellipse rx={10} ry={23} fill="#C97B4F" />
      <Ellipse rx={7} ry={19} fill="#8B5233" />
      <Path d="M-6,-10 H6 M-7,-3 H7 M-7,4 H7 M-6,11 H6" stroke="#C97B4F" strokeWidth={1} strokeOpacity={0.7} />
      {/* الجالس */}
      <Circle cy={-2} r={4} fill="#2B3A4A" />
    </G>
  );
}

function messageFor(p: number, total: number): string {
  if (total === 0) return "يوم هادئ. استمتع بالماء الساكن.";
  if (p >= 1) return "وصلت! أنجزت يومك كله، والقلب يضيء.";
  if (p >= 0.6) return "اقتربت من الضفة الأخرى. أكمل بثبات.";
  if (p >= 0.25) return "أنت في منتصف النهر. لا تلتفت للخلف.";
  return "ابدأ التجديف. خطوة واحدة تكفي الآن.";
}

type Props = {
  /** 0..1 */
  progress: number;
  /** عدد عناصر اليوم (أحداث + مهام) */
  total: number;
  done: number;
};

/**
 * «رحلة اليوم»: قارب يتقدّم في النهر نحو القمر والقلب كلما أنجزت أحداث يومك ومهامه.
 * مستوحى من مرجع «Change the status quo» ومن نهر العاصي في حماة.
 */
export function RiverCard({ progress, total, done }: Props) {
  const target = Math.min(1, Math.max(0, progress));
  const [p, setP] = useState(target);
  const [row, setRow] = useState(0);
  const from = useRef(target);

  // حركة ناعمة للقارب عند تغيّر التقدّم
  useEffect(() => {
    const start = from.current;
    if (Math.abs(start - target) < 0.001) return;
    const t0 = Date.now();
    const dur = 1100;
    let raf: ReturnType<typeof requestAnimationFrame>;
    const tick = () => {
      const k = Math.min(1, (Date.now() - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      const v = start + (target - start) * e;
      setP(v);
      setRow(k * 12);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const y = BOAT_START + (BOAT_END - BOAT_START) * p;
  const full = target >= 1 && total > 0;

  return (
    <View className="rounded-3xl overflow-hidden mb-4" style={{ backgroundColor: "#F3E3CF" }}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#2F4153" />
            <Stop offset="1" stopColor="#4A6277" />
          </LinearGradient>
        </Defs>
        <Rect width={W} height={H} fill="url(#sky)" />

        {STARS.map(([x, yy, r], i) => (
          <Circle key={i} cx={x} cy={yy} r={r} fill="#FFFFFF" opacity={0.7} />
        ))}

        {/* قمر */}
        <Circle cx={212} cy={52} r={11} fill="#F6E7C8" />
        <Circle cx={218} cy={48} r={10} fill="#3A4E62" />

        {/* قلب: يضيء عند اكتمال اليوم */}
        <G transform="translate(262 40)" opacity={full ? 1 : 0.55}>
          {full ? <Circle r={20} fill="#F8D9C0" opacity={0.25} /> : null}
          <Path d="M0,7 C-14,-3 -9,-14 0,-8 C9,-14 14,-3 0,7 Z" fill={full ? "#F6B8A0" : "#E8D5C4"} />
        </G>

        {/* ضفتا النهر: ثلاث طبقات تنساب نحو القارب */}
        <Path d={L_OUTER} fill="#5F7890" />
        <Path d={mirror(L_OUTER)} fill="#5F7890" />
        <Path d={L_MID} fill="#4F86BE" />
        <Path d={mirror(L_MID)} fill="#4F86BE" />
        <Path d={L_INNER} fill="#74AA95" />
        <Path d={mirror(L_INNER)} fill="#74AA95" />

        {/* خطوط جريان */}
        <G stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1} fill="none" strokeLinecap="round">
          <Path d="M30,110 C70,118 104,150 126,190" />
          <Path d="M52,70 C92,84 122,118 146,160" />
          <Path d={mirror("M30,110 C70,118 104,150 126,190")} />
          <Path d={mirror("M52,70 C92,84 122,118 146,160")} />
        </G>

        {/* الضفة الرملية */}
        <Path d={`M0,200 C90,186 270,186 ${W},200 L${W},${H} L0,${H} Z`} fill="#F3E3CF" />

        <Boat y={y} row={row} />
      </Svg>

      <View className="px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Text w="bold" style={{ color: "#3B2F25" }}>
            رحلة اليوم
          </Text>
          <Text w="bold" style={{ color: "#3B2F25", fontVariant: ["tabular-nums"] }}>
            {total === 0 ? "—" : `${done}/${total} • ${Math.round(target * 100)}٪`}
          </Text>
        </View>
        <Text className="text-sm mt-0.5" style={{ color: "#6B5744" }}>
          {messageFor(target, total)}
        </Text>
      </View>
    </View>
  );
}
