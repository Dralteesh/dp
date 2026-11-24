import { memo, useEffect, useId, useMemo, type ReactNode } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import type { Kind } from "@/lib/weather";

/**
 * سماء الطقس المتحرّكة لشاشة الصلاة.
 *
 * مبدأ السلاسة: كل شيء يتحرّك بـ transform على خيط الواجهة (Reanimated) فوق رسوم SVG تُرسم مرة واحدة؛
 * لا إعادة رسم لكل إطار ولا setState. المطر والثلج بلاطات متكرّرة تنزلق بلا درز،
 * والغيوم تنجرف بسرعات مختلفة لعمق بصري، والتغيّر بين حالتين يتم بتلاشٍ متقاطع.
 *
 * طبقتان: WeatherBehind (غيوم وطيور) خلف أفق المباني، وWeatherFront (مطر/ثلج/ضباب/برق) أمامه.
 */

export type SkyLayerProps = {
  kind: Kind;
  level: 1 | 2 | 3;
  wind: 0 | 1 | 2;
  night: boolean;
  /** عرض الشاشة وارتفاعها */
  width: number;
  height: number;
  /** نطاق الغيوم العمودي: من أسفل الترويسة إلى خط الأفق (إحداثيات الشاشة) */
  zoneTop: number;
  zoneBottom: number;
  /** سحب خفيفة هادئة في السماء الصافية (كما في تصميم الصلاة الأصلي) */
  ambient?: boolean;
  /** طيور تعبر السماء الصافية نهارًا */
  birds?: boolean;
};

const cleanId = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "");

/** مولّد عشوائي ثابت: نفس الحالة ترسم نفس المشهد دائمًا (لا وميض عند إعادة التركيب) */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED: Record<Kind, number> = { clear: 11, partly: 23, cloudy: 37, fog: 41, drizzle: 53, rain: 67, snow: 79, storm: 97 };
/** مضاعف سرعة الانجراف بحسب الرياح */
const WIND_F = [1, 1.9, 3.4] as const;

const ENTER = FadeIn.duration(1400);
const EXIT = FadeOut.duration(1000);

// ======================================================================
// الغيوم
// ======================================================================

type Pal = { top: string; bot: string; op: number };

function cloudPal(kind: Kind, night: boolean, ambient: boolean): Pal {
  if (kind === "clear") return night ? { top: "#B8C2EA", bot: "#7F8AC0", op: 0.2 } : { top: "#FFFFFF", bot: "#E3ECF8", op: ambient ? 0.26 : 0 };
  switch (kind) {
    case "partly":
      return night ? { top: "#AEB8E0", bot: "#6F7AB0", op: 0.5 } : { top: "#FFFFFF", bot: "#DDE7F4", op: 0.62 };
    case "cloudy":
      return night ? { top: "#8E98B8", bot: "#59627F", op: 0.8 } : { top: "#EAEFF5", bot: "#B7C2D2", op: 0.82 };
    case "fog":
      return night ? { top: "#8E96B8", bot: "#5C6486", op: 0.4 } : { top: "#F3F4F8", bot: "#CBD0DD", op: 0.5 };
    case "drizzle":
    case "rain":
      return night ? { top: "#707B98", bot: "#454E6A", op: 0.86 } : { top: "#B6C2D2", bot: "#73839B", op: 0.88 };
    case "snow":
      return night ? { top: "#A9B6D4", bot: "#6E7BA0", op: 0.7 } : { top: "#F2F6FC", bot: "#C6D3E5", op: 0.74 };
    case "storm":
      return night ? { top: "#4B5470", bot: "#262C40", op: 0.92 } : { top: "#6B7488", bot: "#3A4156", op: 0.92 };
  }
}

type CloudSpec = { key: number; w: number; y: number; dur: number; phase: number };

function cloudSpecs(p: SkyLayerProps): CloudSpec[] {
  const { kind, level, wind, width: W, zoneTop, zoneBottom, ambient } = p;
  let n = 0;
  let wMin = 120;
  let wMax = 220;
  switch (kind) {
    case "clear":
      n = ambient ? 2 : 0;
      wMin = 90;
      wMax = 150;
      break;
    case "partly":
      n = 4;
      break;
    case "cloudy":
      n = 6;
      wMin = 190;
      wMax = 330;
      break;
    case "fog":
      n = 2;
      wMin = 160;
      wMax = 260;
      break;
    case "drizzle":
      n = 5;
      wMin = 190;
      wMax = 320;
      break;
    case "rain":
      n = level > 2 ? 6 : 5;
      wMin = 210;
      wMax = 350;
      break;
    case "snow":
      n = 5;
      wMin = 190;
      wMax = 320;
      break;
    case "storm":
      n = 6;
      wMin = 230;
      wMax = 380;
      break;
  }
  const r = rng(SEED[kind]);
  const zone = Math.max(60, zoneBottom - zoneTop);
  const out: CloudSpec[] = [];
  for (let i = 0; i < n; i++) {
    const w = wMin + r() * (wMax - wMin);
    const y = zoneTop + ((i + 0.2 + r() * 0.6) / n) * zone - w * 0.2;
    // px/ث: بطيئة وهادئة، والأكبر أسرع قليلًا (أقرب)، والرياح تضاعفها
    const speed = (4 + r() * 7) * (w / 200) * WIND_F[wind];
    out.push({ key: i, w, y, dur: Math.round(((W + w) / speed) * 1000), phase: r() });
  }
  return out;
}

function CloudShape({ w, top, bot }: { w: number; top: string; bot: string }) {
  const id = cleanId(useId());
  return (
    <Svg width={w} height={w * 0.4} viewBox="0 0 200 80">
      <Defs>
        <LinearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="80">
          <Stop offset="0" stopColor={top} />
          <Stop offset="1" stopColor={bot} />
        </LinearGradient>
      </Defs>
      <G fill={`url(#${id})`}>
        <Rect x={8} y={42} width={184} height={34} rx={17} />
        <Circle cx={58} cy={44} r={26} />
        <Circle cx={100} cy={32} r={32} />
        <Circle cx={146} cy={44} r={24} />
        <Circle cx={30} cy={56} r={16} />
        <Circle cx={172} cy={58} r={16} />
      </G>
    </Svg>
  );
}

/** سحابة واحدة تنجرف عبر الشاشة بحلقة خطية؛ phase يوزّع بدايات السحب فلا تتزامن */
function Drift({ spec, W, pal, reduced }: { spec: CloudSpec; W: number; pal: Pal; reduced: boolean }) {
  const p = useSharedValue(0);
  const { w, phase, dur } = spec;
  useEffect(() => {
    if (reduced) return undefined;
    p.value = 0;
    p.value = withRepeat(withTiming(1, { duration: dur, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(p);
  }, [p, dur, reduced]);
  const st = useAnimatedStyle(() => {
    const q = (p.value + phase) % 1;
    return { transform: [{ translateX: -w + q * (W + w) }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", top: spec.y, left: 0, opacity: pal.op }, st]}>
      <CloudShape w={w} top={pal.top} bot={pal.bot} />
    </Animated.View>
  );
}

// ======================================================================
// الطيور (تعبر السماء الصافية نهارًا؛ ترفرف وتتمايل برفق)
// ======================================================================

function Bird({ x, y, delay, reduced }: { x: number; y: number; delay: number; reduced: boolean }) {
  const f = useSharedValue(1);
  useEffect(() => {
    if (reduced) return undefined;
    f.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(0.45, { duration: 300, easing: Easing.inOut(Easing.sin) }), withTiming(1, { duration: 300, easing: Easing.inOut(Easing.sin) })), -1, false),
    );
    return () => cancelAnimation(f);
  }, [f, delay, reduced]);
  const st = useAnimatedStyle(() => ({ transform: [{ scaleY: f.value }] }));
  return (
    <Animated.View style={[{ position: "absolute", left: x, top: y }, st]}>
      <Svg width={28} height={14} viewBox="0 0 28 14">
        <Path d="M0 10Q7 0 14 9Q21 0 28 10" fill="none" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" strokeOpacity={0.75} />
      </Svg>
    </Animated.View>
  );
}

function Birds({ W, y, reduced }: { W: number; y: number; reduced: boolean }) {
  const p = useSharedValue(0);
  const b = useSharedValue(0.5);
  useEffect(() => {
    if (reduced) return undefined;
    p.value = 0;
    // الدورة 60ث: العبور في أول 60% ثم هدوء قبل السرب التالي
    p.value = withRepeat(withTiming(1, { duration: 60000, easing: Easing.linear }), -1, false);
    b.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => {
      cancelAnimation(p);
      cancelAnimation(b);
    };
  }, [p, b, reduced]);
  const st = useAnimatedStyle(() => {
    const q = Math.min(1, p.value * 1.65);
    return { transform: [{ translateX: -100 + q * (W + 200) }, { translateY: (b.value - 0.5) * 14 }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", top: y, left: 0, width: 80, height: 40 }, st]}>
      <Bird x={0} y={12} delay={0} reduced={reduced} />
      <Bird x={34} y={0} delay={140} reduced={reduced} />
      <Bird x={48} y={24} delay={280} reduced={reduced} />
    </Animated.View>
  );
}

/** الطبقة الخلفية: غيوم وطيور (خلف أفق المباني وفوق الشمس/القمر) */
export const WeatherBehind = memo(function WeatherBehind(props: SkyLayerProps) {
  const reduced = useReducedMotion();
  const { kind, level, wind, night, width, zoneTop, zoneBottom, ambient, birds } = props;
  const specs = useMemo(
    () => cloudSpecs({ kind, level, wind, night, width, height: 0, zoneTop, zoneBottom, ambient }),
    [kind, level, wind, night, width, zoneTop, zoneBottom, ambient],
  );
  const pal = cloudPal(kind, night, !!ambient);
  const showBirds = !!birds && !night && (kind === "clear" || kind === "partly");
  if (specs.length === 0 && !showBirds) return null;
  return (
    <Animated.View key={kind} pointerEvents="none" entering={ENTER} exiting={EXIT} style={StyleSheet.absoluteFill}>
      {pal.op > 0 ? specs.map((s) => <Drift key={s.key} spec={s} W={width} pal={pal} reduced={reduced} />) : null}
      {showBirds ? <Birds W={width} y={zoneTop + (zoneBottom - zoneTop) * 0.12} reduced={reduced} /> : null}
    </Animated.View>
  );
});

// ======================================================================
// مطر وثلج: بلاطات متكرّرة تنزلق عموديًا داخل حاوية مائلة بزاوية الرياح
// ======================================================================

type FallProps = {
  W: number;
  H: number;
  tileH: number;
  /** مدة قطع بلاطة واحدة بالميلي ثانية */
  dur: number;
  /** ميلان الحاوية بالدرجات (اتجاه الرياح) */
  angle: number;
  /** سعة التمايل الأفقي (للثلج) */
  sway?: number;
  swayMs?: number;
  children: ReactNode;
};

function Fall({ W, H, tileH, dur, angle, sway = 0, swayMs = 3200, children }: FallProps) {
  const OW = Math.round(W * 1.5);
  const OH = Math.round(H * 1.5);
  const tiles = Math.ceil(OH / tileH) + 1;
  const y = useSharedValue(0);
  const s = useSharedValue(0.5);
  useEffect(() => {
    y.value = 0;
    y.value = withRepeat(withTiming(tileH, { duration: dur, easing: Easing.linear }), -1, false);
    if (sway > 0) s.value = withRepeat(withTiming(1, { duration: swayMs, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => {
      cancelAnimation(y);
      cancelAnimation(s);
    };
  }, [y, s, tileH, dur, sway, swayMs]);
  const st = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { translateX: (s.value - 0.5) * 2 * sway }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: -(OW - W) / 2,
        top: -(OH - H) / 2,
        width: OW,
        height: OH,
        transform: [{ rotate: `${-angle}deg` }],
      }}
    >
      <Animated.View style={[{ position: "absolute", left: 0, top: -tileH, width: OW, height: tiles * tileH }, st]}>
        {Array.from({ length: tiles }, (_, i) => (
          <Svg key={i} width={OW} height={tileH} style={{ position: "absolute", left: 0, top: i * tileH }}>
            {children}
          </Svg>
        ))}
      </Animated.View>
    </Animated.View>
  );
}

const TILE_H = 640;
/** المساحة المرجعية لأعداد القطرات/الندف (360×520) */
const REF_AREA = 360 * 520;

type RainLayerSpec = { len: [number, number]; sw: number; op: [number, number]; speed: number; count: number; seed: number };

function RainLayer({ W, H, spec, color, angle, scale }: { W: number; H: number; spec: RainLayerSpec; color: string; angle: number; scale: number }) {
  const OW = Math.round(W * 1.5);
  const drops = useMemo(() => {
    const r = rng(spec.seed);
    const n = Math.max(4, Math.round((spec.count * (OW * TILE_H)) / REF_AREA));
    return Array.from({ length: n }, (_, i) => {
      const l = (spec.len[0] + r() * (spec.len[1] - spec.len[0])) * scale;
      const x = r() * OW;
      const y = r() * (TILE_H - l);
      const o = spec.op[0] + r() * (spec.op[1] - spec.op[0]);
      return <Line key={i} x1={x} y1={y} x2={x} y2={y + l} stroke={color} strokeWidth={spec.sw} strokeOpacity={o} strokeLinecap="round" />;
    });
  }, [OW, spec, color, scale]);
  return (
    <Fall W={W} H={H} tileH={TILE_H} dur={Math.round((TILE_H / (spec.speed * (0.6 + 0.4 * scale))) * 1000)} angle={angle}>
      {drops}
    </Fall>
  );
}

function Rain({ p }: { p: SkyLayerProps }) {
  const { level, wind, night, width: W, height: H, kind } = p;
  const light = kind === "drizzle";
  const lv = light ? 0.45 : level === 1 ? 0.8 : level === 2 ? 1.25 : 1.8;
  const scale = light ? 0.65 : 1;
  const angle = (wind === 0 ? 4 : wind === 1 ? 10 : 18) + (kind === "storm" ? 4 : 0);
  const color = night ? "#BFD4FF" : "#DCEBFF";
  const layers: RainLayerSpec[] = [
    { len: [10, 18], sw: 0.9, op: [0.22, 0.4], speed: 650, count: 30 * lv, seed: 101 },
    { len: [18, 30], sw: 1.3, op: [0.32, 0.55], speed: 950, count: 22 * lv, seed: 202 },
    { len: [30, 52], sw: 1.8, op: [0.42, 0.7], speed: 1350, count: 11 * lv, seed: 303 },
  ];
  return (
    <>
      {layers.map((l, i) => (
        <RainLayer key={i} W={W} H={H} spec={l} color={color} angle={angle} scale={scale} />
      ))}
    </>
  );
}

type SnowLayerSpec = { r: [number, number]; op: [number, number]; speed: number; count: number; sway: number; swayMs: number; seed: number };

function SnowLayer({ W, H, spec, angle }: { W: number; H: number; spec: SnowLayerSpec; angle: number }) {
  const OW = Math.round(W * 1.5);
  const flakes = useMemo(() => {
    const r = rng(spec.seed);
    const n = Math.max(4, Math.round((spec.count * (OW * TILE_H)) / REF_AREA));
    return Array.from({ length: n }, (_, i) => {
      const rad = spec.r[0] + r() * (spec.r[1] - spec.r[0]);
      const x = r() * OW;
      const y = rad + r() * (TILE_H - rad * 2);
      const o = spec.op[0] + r() * (spec.op[1] - spec.op[0]);
      return <Circle key={i} cx={x} cy={y} r={rad} fill="#FFFFFF" fillOpacity={o} />;
    });
  }, [OW, spec]);
  return (
    <Fall W={W} H={H} tileH={TILE_H} dur={Math.round((TILE_H / spec.speed) * 1000)} angle={angle} sway={spec.sway} swayMs={spec.swayMs}>
      {flakes}
    </Fall>
  );
}

function Snow({ p }: { p: SkyLayerProps }) {
  const { level, wind, width: W, height: H } = p;
  const lv = level === 1 ? 0.8 : level === 2 ? 1.4 : 2.1;
  const sp = wind === 0 ? 1 : wind === 1 ? 1.35 : 1.8;
  const angle = wind === 0 ? 0 : wind === 1 ? 8 : 16;
  const layers: SnowLayerSpec[] = [
    { r: [1, 1.8], op: [0.5, 0.8], speed: 28 * sp, count: 40 * lv, sway: 10, swayMs: 4200, seed: 11 },
    { r: [1.8, 3], op: [0.65, 0.9], speed: 50 * sp, count: 26 * lv, sway: 16, swayMs: 3600, seed: 22 },
    { r: [3, 5], op: [0.8, 1], speed: 85 * sp, count: 12 * lv, sway: 24, swayMs: 3000, seed: 33 },
  ];
  return (
    <>
      {layers.map((l, i) => (
        <SnowLayer key={i} W={W} H={H} spec={l} angle={angle} />
      ))}
    </>
  );
}

// ======================================================================
// ضباب (طبقات أفقية ناعمة تتهادى) وبرق (وميض + صاعقة)
// ======================================================================

function FogBand({ W, y, h, dur, amp, op, color, phase, reduced }: { W: number; y: number; h: number; dur: number; amp: number; op: number; color: string; phase: number; reduced: boolean }) {
  const id = cleanId(useId());
  const p = useSharedValue(phase);
  useEffect(() => {
    if (reduced) return undefined;
    p.value = phase;
    p.value = withRepeat(withTiming(1, { duration: dur, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(p);
  }, [p, phase, dur, reduced]);
  const BW = Math.round(W * 1.7);
  const st = useAnimatedStyle(() => ({
    opacity: op * (0.72 + 0.28 * p.value),
    transform: [{ translateX: (p.value - 0.5) * 2 * amp }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: -(BW - W) / 2, top: y, width: BW, height: h }, st]}>
      <Svg width={BW} height={h}>
        <Defs>
          <RadialGradient id={id} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={color} stopOpacity={0.9} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={BW * 0.28} cy={h * 0.55} rx={BW * 0.3} ry={h * 0.46} fill={`url(#${id})`} />
        <Ellipse cx={BW * 0.6} cy={h * 0.45} rx={BW * 0.36} ry={h * 0.5} fill={`url(#${id})`} />
        <Ellipse cx={BW * 0.86} cy={h * 0.6} rx={BW * 0.24} ry={h * 0.4} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

function Fog({ p, reduced }: { p: SkyLayerProps; reduced: boolean }) {
  const { kind, level, night, width: W, zoneBottom } = p;
  const color = night ? "#9AA2C8" : "#EEF0F6";
  if (kind === "fog") {
    const k = level >= 3 ? 1.2 : 1;
    return (
      <>
        <FogBand W={W} y={zoneBottom - 120} h={150} dur={16000} amp={46} op={Math.min(0.9, 0.5 * k)} color={color} phase={0.1} reduced={reduced} />
        <FogBand W={W} y={zoneBottom - 30} h={170} dur={21000} amp={64} op={Math.min(0.9, 0.42 * k)} color={color} phase={0.6} reduced={reduced} />
        <FogBand W={W} y={zoneBottom + 50} h={190} dur={26000} amp={80} op={Math.min(0.9, 0.5 * k)} color={color} phase={0.35} reduced={reduced} />
      </>
    );
  }
  // رذاذ/مطر/ثلج/عاصفة: غشاوة خفيفة عند الأفق تكمل الجو
  return <FogBand W={W} y={zoneBottom - 20} h={170} dur={24000} amp={60} op={0.2} color={color} phase={0.4} reduced={reduced} />;
}

const FLICKER_MS = 55 + 90 + 45 + 420;

/** وميض برق دوري: ومضات متتالية سريعة ثم خمود، مع صاعقة ترسم عند الوميض */
function Flash({ delay, cycle, x, W, zoneTop, zoneBottom, reduced }: { delay: number; cycle: number; x: number; W: number; zoneTop: number; zoneBottom: number; reduced: boolean }) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (reduced) return undefined;
    const flicker = withSequence(
      withTiming(0.55, { duration: 55 }),
      withTiming(0.05, { duration: 90 }),
      withTiming(0.85, { duration: 45 }),
      withTiming(0, { duration: 420, easing: Easing.out(Easing.quad) }),
    );
    v.value = withRepeat(withSequence(withDelay(delay, flicker), withTiming(0, { duration: Math.max(100, cycle - delay - FLICKER_MS) })), -1, false);
    return () => cancelAnimation(v);
  }, [v, delay, cycle, reduced]);
  const wash = useAnimatedStyle(() => ({ opacity: v.value * 0.5 }));
  const bolt = useAnimatedStyle(() => ({ opacity: Math.min(1, v.value * 1.5) }));
  const bh = Math.max(120, zoneBottom - zoneTop + 30);
  return (
    <>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#DCE4FF" }, wash]} />
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: x * W - 40, top: zoneTop - 20, width: 80, height: bh }, bolt]}>
        <Svg width={80} height={bh} viewBox="0 0 100 300" preserveAspectRatio="none">
          <Path d="M58 0L40 92L64 94L32 192L56 194L22 300" fill="none" stroke="#C9D6FF" strokeWidth={9} strokeOpacity={0.3} strokeLinejoin="round" />
          <Path d="M58 0L40 92L64 94L32 192L56 194L22 300" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinejoin="round" />
        </Svg>
      </Animated.View>
    </>
  );
}

/** الطبقة الأمامية: مطر/ثلج/ضباب/برق تعبر فوق أفق المباني */
export const WeatherFront = memo(function WeatherFront(props: SkyLayerProps) {
  const reduced = useReducedMotion();
  const { kind, width: W, zoneTop, zoneBottom } = props;
  if (kind === "clear" || kind === "partly" || kind === "cloudy") return null;
  const rainy = kind === "rain" || kind === "drizzle" || kind === "storm";
  return (
    <Animated.View key={kind} pointerEvents="none" entering={ENTER} exiting={EXIT} style={StyleSheet.absoluteFill}>
      {rainy && !reduced ? <Rain p={props} /> : null}
      {kind === "snow" ? <Snow p={props} /> : null}
      <Fog p={props} reduced={reduced} />
      {kind === "storm" ? (
        <>
          <Flash delay={3600} cycle={11500} x={0.3} W={W} zoneTop={zoneTop} zoneBottom={zoneBottom} reduced={reduced} />
          <Flash delay={8300} cycle={11500} x={0.7} W={W} zoneTop={zoneTop} zoneBottom={zoneBottom} reduced={reduced} />
        </>
      ) : null}
    </Animated.View>
  );
});
