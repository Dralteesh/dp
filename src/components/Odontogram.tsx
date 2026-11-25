import { useMemo, useState } from "react";
import { type LayoutChangeEvent, Pressable, View } from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { BRIDGE_COLOR, ODONTO_PAPER, TOOTH_MARKS, TOOTH_STATUS } from "@/constants/clinic";
import { SHOW_TOOTH_NUMBERS } from "@/constants/toothShapes";
import { type Dentition, defaultDentition, navOrder, toothName } from "@/lib/odontogram";
import { TM_CENTER_X, frameOf, placedShape, type PlacedShape } from "@/lib/toothmap";
import type { ToothMark, ToothStatus } from "@/types";

type Props = {
  teeth: Record<string, ToothStatus>;
  selected?: string;
  onSelect: (tooth: string) => void;
  /** دائمة | لبنية. إن لم تُمرَّر يُحسب الافتراضي من السجلات/العمر ويُدار داخليًا */
  dentition?: Dentition;
  onDentitionChange?: (d: Dentition) => void;
  /** سنة ميلاد المريض لتحديد الوضع الافتراضي */
  birthYear?: number;
  /** علامات الرسم على الأسنان */
  marks?: Record<string, ToothMark[]>;
  /** الجسور/التجبير المحفوظة */
  bridges?: string[][];
  /** إن مُرّرت يظهر زر «جسر» لبناء جسور جديدة وحذفها */
  onBridgesChange?: (b: string[][]) => void;
};

const SELECT = "#2B8FCB";
const SELECT_FILL = "#BFE3F7";
const INK = "#1E3A4F";
const MUTED = "#6B7A88";
const EDGE = "#7B8794";
const TOOTH_TOP = "#FFFFFF";
const TOOTH_BOTTOM = "#E6DFCB";
const SOFT = "rgba(30,58,79,0.08)";

/** مخطط الأسنان (FDI): أسنان Toothmap الواقعية على بطاقة فاتحة، مع علامات وجسور. اضغط قرب سن لتحديده */
export function Odontogram({ teeth, selected, onSelect, dentition: dentProp, onDentitionChange, birthYear, marks, bridges, onBridgesChange }: Props) {
  const [W, setW] = useState(340);
  const [own, setOwn] = useState<Dentition | null>(null);
  const [chainMode, setChainMode] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const dentition: Dentition = dentProp ?? own ?? defaultDentition(teeth, birthYear);
  const order = useMemo(() => navOrder(dentition), [dentition]);

  const setDentition = (d: Dentition) => {
    setOwn(d);
    setDraft([]);
    onDentitionChange?.(d);
  };

  const step = (dir: 1 | -1) => {
    const i = selected ? order.indexOf(selected) : -1;
    const next = i < 0 ? (dir === 1 ? 0 : order.length - 1) : (i + dir + order.length) % order.length;
    onSelect(order[next]);
  };

  const sel = selected && order.includes(selected) ? selected : undefined;
  const selStatus = selected ? teeth[selected] : undefined;

  const frame = frameOf(dentition);
  const VB = frame.vb;
  const k = W / VB.w; // وحدات الرسم ← بكسل
  const shapesH = Math.round(VB.h * k);
  const u = (px: number) => px / k; // بكسل ← وحدات الرسم

  const shapes = useMemo(() => {
    const r: Record<string, PlacedShape> = {};
    for (const c of order) {
      const s = placedShape(c, dentition);
      if (s) r[c] = s;
    }
    return r;
  }, [order, dentition]);

  /** علامة رسم واحدة فوق السن */
  const drawMark = (code: string, mk: ToothMark, sh: PlacedShape) => {
    const col = TOOTH_MARKS[mk].hex;
    const key = `${code}-${mk}`;
    const inner = sh.cx < TM_CENTER_X ? 1 : -1; // اتجاه الخط الأوسط
    const r = Math.min(sh.w, sh.h) * 0.32;
    switch (mk) {
      case "x": {
        const d = Math.min(sh.w, sh.h) * 0.3;
        return (
          <G key={key}>
            <Line x1={sh.cx - d} y1={sh.cy - d} x2={sh.cx + d} y2={sh.cy + d} stroke={col} strokeWidth={u(3)} strokeLinecap="round" />
            <Line x1={sh.cx + d} y1={sh.cy - d} x2={sh.cx - d} y2={sh.cy + d} stroke={col} strokeWidth={u(3)} strokeLinecap="round" />
          </G>
        );
      }
      case "slash":
        return <Line key={key} x1={sh.x1 - sh.w * 0.08} y1={sh.y0 + sh.h * 0.05} x2={sh.x0 + sh.w * 0.08} y2={sh.y1 - sh.h * 0.05} stroke={col} strokeWidth={u(3.4)} strokeLinecap="round" />;
      case "pin":
        return (
          <G key={key}>
            <Line x1={sh.cx} y1={sh.cy + sh.h * 0.28} x2={sh.cx} y2={sh.cy - sh.h * 0.12} stroke={col} strokeWidth={u(2.4)} strokeLinecap="round" />
            <Circle cx={sh.cx} cy={sh.cy - sh.h * 0.2} r={u(5.5)} fill={col} stroke="#FFFFFF" strokeWidth={u(1.2)} />
          </G>
        );
      case "circle":
        return <Circle key={key} cx={sh.cx} cy={sh.cy} r={Math.max(sh.w, sh.h) * 0.62} fill="none" stroke={col} strokeWidth={u(2.4)} strokeDasharray={`${u(6)},${u(3)}`} />;
      case "mesial":
      case "distal": {
        const side = mk === "mesial" ? inner : -inner;
        const ex = sh.cx + side * sh.w * 0.5;
        const sweep = side === 1 ? 0 : 1;
        return <Path key={key} d={`M ${ex} ${sh.cy - r} A ${r} ${r} 0 0 ${sweep} ${ex} ${sh.cy + r} Z`} fill={col} fillOpacity={0.85} stroke="#FFFFFF" strokeWidth={u(1)} />;
      }
      case "two":
        return (
          <G key={key}>
            <Circle cx={sh.cx - sh.w * 0.18} cy={sh.cy} r={u(4.5)} fill={col} stroke="#FFFFFF" strokeWidth={u(1)} />
            <Circle cx={sh.cx + sh.w * 0.18} cy={sh.cy} r={u(4.5)} fill={col} stroke="#FFFFFF" strokeWidth={u(1)} />
          </G>
        );
      case "dot":
        return <Circle key={key} cx={sh.cx} cy={sh.cy} r={u(5.5)} fill={col} stroke="#FFFFFF" strokeWidth={u(1.4)} />;
    }
  };

  const drawShape = (code: string) => {
    const sh = shapes[code];
    if (!sh) return null;
    const st = teeth[code];
    const meta = st ? TOOTH_STATUS[st] : null;
    const active = sel === code;
    const inDraft = draft.includes(code);
    const gone = st === "missing" || st === "extraction";
    const fill = active ? SELECT_FILL : meta ? meta.hex : "url(#tg)";
    const numColor = active ? INK : meta ? "#FFFFFF" : MUTED;
    const fs = u(9);
    return (
      <G key={code}>
        <G transform={`matrix(${sh.m.join(",")})`}>
          {active ? <Path d={sh.type.outline} fill="none" stroke={SELECT} strokeWidth={u(7)} strokeOpacity={0.3} strokeLinejoin="round" /> : null}
          {gone ? null : <Path d={sh.type.shadow} fill="#1E3A4F" fillOpacity={0.12} />}
          <Path
            d={sh.type.outline}
            fill={fill}
            fillOpacity={gone ? 0.35 : 1}
            stroke={active ? SELECT : inDraft ? BRIDGE_COLOR : EDGE}
            strokeWidth={u(active || inDraft ? 2.6 : 1.6)}
            strokeLinejoin="round"
            strokeDasharray={gone ? `${u(3)},${u(2)}` : undefined}
          />
          {sh.type.lines.map((ld, i) => (
            <Path key={i} d={ld} fill="none" stroke={meta ? "#FFFFFF" : EDGE} strokeOpacity={meta ? 0.7 : 0.9} strokeWidth={u(1.2)} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </G>
        {st === "crown" ? <Line x1={sh.cx - sh.w * 0.38} y1={sh.cy - sh.h * 0.2} x2={sh.cx + sh.w * 0.38} y2={sh.cy - sh.h * 0.2} stroke="#FFFFFF" strokeWidth={u(1.4)} strokeOpacity={0.9} /> : null}
        {st === "implant" ? (
          <G>
            <Line x1={sh.cx} y1={sh.cy - sh.h * 0.32} x2={sh.cx} y2={sh.cy + sh.h * 0.32} stroke="#FFFFFF" strokeWidth={u(1.4)} strokeOpacity={0.9} />
            <Line x1={sh.cx - sh.w * 0.2} y1={sh.cy - sh.h * 0.12} x2={sh.cx + sh.w * 0.2} y2={sh.cy - sh.h * 0.12} stroke="#FFFFFF" strokeWidth={u(1.2)} strokeOpacity={0.9} />
            <Line x1={sh.cx - sh.w * 0.2} y1={sh.cy + sh.h * 0.1} x2={sh.cx + sh.w * 0.2} y2={sh.cy + sh.h * 0.1} stroke="#FFFFFF" strokeWidth={u(1.2)} strokeOpacity={0.9} />
          </G>
        ) : null}
        {gone ? <Line x1={sh.cx - sh.w * 0.5} y1={sh.cy} x2={sh.cx + sh.w * 0.5} y2={sh.cy} stroke={INK} strokeWidth={u(1.4)} strokeOpacity={0.6} /> : null}
        {SHOW_TOOTH_NUMBERS ? (
          <SvgText x={sh.cx} y={sh.cy + fs * 0.35} fontSize={fs} fill={numColor} fontWeight={active ? "bold" : "normal"} textAnchor="middle">
            {code}
          </SvgText>
        ) : null}
      </G>
    );
  };

  /** خط الجسر: يمرّ بمراكز الأسنان بالترتيب */
  const chainPath = (codes: string[]) => {
    const pts = codes.map((c) => shapes[c]).filter(Boolean) as PlacedShape[];
    if (pts.length < 2) return null;
    return pts.map((p, i) => `${i ? "L" : "M"} ${p.cx} ${p.cy}`).join(" ");
  };
  const drawChain = (codes: string[], key: string, dashed = false) => {
    const d = chainPath(codes);
    return (
      <G key={key}>
        {d ? <Path d={d} fill="none" stroke={BRIDGE_COLOR} strokeOpacity={dashed ? 0.7 : 0.55} strokeWidth={u(8)} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dashed ? `${u(10)},${u(7)}` : undefined} /> : null}
        {codes.map((c) => (shapes[c] ? <Circle key={c} cx={shapes[c].cx} cy={shapes[c].cy} r={u(4.5)} fill={BRIDGE_COLOR} stroke="#FFFFFF" strokeWidth={u(1.2)} /> : null))}
      </G>
    );
  };

  /** أقرب سن لنقطة لمس (بكسل) ضمن نفس الفك */
  const pickShape = (px: number, py: number): string | null => {
    const vx = VB.x + px / k;
    const vy = VB.y + py / k;
    // الفك = عدد خطوط الإطباق التي فوق النقطة (يمنع الالتقاط عبر خط الإطباق أو بين المخططين)
    const band = (y: number) => frame.seps.filter((m) => y > m).length;
    const vb = band(vy);
    let best: { code: string; d: number } | null = null;
    for (const code of order) {
      const sh = shapes[code];
      if (!sh || band(sh.cy) !== vb) continue;
      const d = Math.hypot(sh.cx - vx, sh.cy - vy);
      if (d <= u(30) && (!best || d < best.d)) best = { code, d };
    }
    return best?.code ?? null;
  };

  const onTap = (code: string) => {
    if (chainMode) setDraft((d) => (d.includes(code) ? d.filter((x) => x !== code) : [...d, code]));
    else onSelect(code);
  };

  const saveDraft = () => {
    if (draft.length >= 2) onBridgesChange?.([...(bridges ?? []), draft]);
    setDraft([]);
    setChainMode(false);
  };

  const Seg = ({ id, label }: { id: Dentition; label: string }) => (
    <Pressable
      onPress={() => setDentition(id)}
      style={{ paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14, backgroundColor: dentition === id ? INK : "transparent" }}
      accessibilityLabel={label}
    >
      <Text w="semi" style={{ fontSize: 12, color: dentition === id ? "#FFFFFF" : INK }}>
        {label}
      </Text>
    </Pressable>
  );

  const circleBtn = (icon: "chevron-forward" | "chevron-back", label: string, on: () => void) => (
    <Pressable onPress={on} hitSlop={8} accessibilityLabel={label} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: SOFT, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={icon} size={20} color={INK} />
    </Pressable>
  );

  const bridgeLabel = (b: string[]) => `${b[0]}–${b[b.length - 1]}`;

  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(Math.max(260, e.nativeEvent.layout.width))} style={{ backgroundColor: ODONTO_PAPER, borderRadius: 28, paddingTop: 14, overflow: "hidden", borderWidth: 1.5, borderColor: "#DDD6C4" }}>
      <View style={{ paddingHorizontal: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text w="bold" style={{ color: INK, fontSize: 16 }}>
          مخطط الأسنان
        </Text>
        <View style={{ flexDirection: "row", backgroundColor: SOFT, borderRadius: 16, padding: 2 }}>
          <Seg id="permanent" label="دائمة" />
          <Seg id="mixed" label="مختلطة" />
          <Seg id="primary" label="لبنية" />
        </View>
      </View>
      <Text style={{ color: MUTED, fontSize: 11, paddingHorizontal: 18, marginTop: 2 }}>يمين المريض على اليسار</Text>

      <View style={{ direction: "ltr", marginTop: 6 }}>
        <Pressable
          onPress={(e) => {
            const code = pickShape(e.nativeEvent.locationX, e.nativeEvent.locationY);
            if (code) onTap(code);
          }}
        >
          <Svg width={W} height={shapesH} viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}>
            <Defs>
              <LinearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={TOOTH_TOP} />
                <Stop offset="1" stopColor={TOOTH_BOTTOM} />
              </LinearGradient>
            </Defs>
            {frame.mids.map((m) => (
              <Line key={m} x1={frame.line.x1} y1={m} x2={frame.line.x2} y2={m} stroke={INK} strokeOpacity={0.15} strokeWidth={u(1)} />
            ))}
            {order.map(drawShape)}
            {(bridges ?? []).map((b, i) => drawChain(b, `b${i}`))}
            {draft.length ? drawChain(draft, "draft", true) : null}
            {order.map((c) => (marks?.[c]?.length && shapes[c] ? <G key={`m${c}`}>{marks[c].map((mk) => drawMark(c, mk, shapes[c]))}</G> : null))}
          </Svg>
        </Pressable>
      </View>

      {/* الجسور */}
      {onBridgesChange ? (
        <View style={{ paddingHorizontal: 14, paddingBottom: 6, gap: 8 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <Pressable
              onPress={() => {
                setChainMode((v) => !v);
                setDraft([]);
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: chainMode ? BRIDGE_COLOR : SOFT }}
            >
              <Ionicons name="link" size={15} color={chainMode ? "#FFFFFF" : INK} />
              <Text w="semi" style={{ fontSize: 12.5, color: chainMode ? "#FFFFFF" : INK }}>
                {chainMode ? "إلغاء الجسر" : "جسر / تجبير"}
              </Text>
            </Pressable>
            {(bridges ?? []).map((b, i) => (
              <Pressable
                key={i}
                onPress={() => onBridgesChange((bridges ?? []).filter((_, j) => j !== i))}
                accessibilityLabel={`حذف الجسر ${bridgeLabel(b)}`}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: "rgba(124,58,237,0.12)" }}
              >
                <Text w="semi" style={{ fontSize: 12, color: BRIDGE_COLOR, fontVariant: ["tabular-nums"] }}>
                  {bridgeLabel(b)}
                </Text>
                <Ionicons name="close" size={14} color={BRIDGE_COLOR} />
              </Pressable>
            ))}
          </View>
          {chainMode ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ flex: 1, fontSize: 12, color: MUTED }}>{draft.length ? `الأسنان: ${draft.join(" ← ")}` : "اضغط الأسنان بالترتيب (سنّان على الأقل)"}</Text>
              <Pressable onPress={() => setDraft((d) => d.slice(0, -1))} hitSlop={8}>
                <Ionicons name="backspace-outline" size={22} color={INK} />
              </Pressable>
              <Pressable onPress={saveDraft} disabled={draft.length < 2} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, backgroundColor: draft.length < 2 ? "#C9C3B2" : BRIDGE_COLOR }}>
                <Text w="bold" style={{ fontSize: 12.5, color: "#FFFFFF" }}>
                  حفظ الجسر
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* لوح السن المحدّد + التنقل بين الأسنان */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 12, paddingTop: 2, gap: 8 }}>
        {circleBtn("chevron-forward", "السن السابق", () => step(-1))}
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
          {sel ? (
            <>
              <Text w="bold" style={{ color: SELECT, fontSize: 28, fontVariant: ["tabular-nums"] }}>
                {sel}
              </Text>
              <View style={{ flexShrink: 1 }}>
                <Text w="semi" style={{ color: INK, fontSize: 13 }} numberOfLines={1}>
                  {toothName(sel)}
                </Text>
                <Text style={{ color: MUTED, fontSize: 12 }}>{selStatus ? TOOTH_STATUS[selStatus].label : "سليم"}</Text>
              </View>
            </>
          ) : (
            <Text style={{ color: MUTED, fontSize: 12 }}>اضغط على سنٍّ أو استعمل الأسهم</Text>
          )}
        </View>
        {circleBtn("chevron-back", "السن التالي", () => step(1))}
      </View>
    </View>
  );
}
