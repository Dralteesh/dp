import { memo, useEffect, useId, useMemo } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from "react-native-svg";
import { type Species } from "@/store/useFocus";

/**
 * شجرة بالمتجهات تنمو باستمرار (progress من 0 إلى 1) بدل أربع مراحل.
 * الشكل العضوي ثابت لكل بذرة (seed = معرّف السجل) فتختلف الأشجار عن بعضها وتبقى كما هي.
 * البنية الهندسية تُحسب مرة لكل (نوع، مرحلة مقرّبة، بذرة) ولا تُعاد كل ثانية.
 */

type Palette = { dark: string; mid: string; light: string; trunkA: string; trunkB: string; accent?: string };

export const PALETTES: Record<Species, Palette> = {
  oak: { dark: "#2F7F3E", mid: "#3E9B4F", light: "#6CC46F", trunkA: "#7A4D24", trunkB: "#A06B38" },
  pine: { dark: "#1F6446", mid: "#2F7D55", light: "#55AB7C", trunkA: "#6B3F1D", trunkB: "#8F5A2B" },
  olive: { dark: "#6F8630", mid: "#8AA33F", light: "#B4CB6B", trunkA: "#5F4527", trunkB: "#8A6A42", accent: "#3F4E17" },
  cherry: { dark: "#E98BAA", mid: "#F4A7C0", light: "#FBD3E1", trunkA: "#6B3E30", trunkB: "#93604C", accent: "#E04F7C" },
  cypress: { dark: "#1E5A3E", mid: "#2B7550", light: "#4B9A72", trunkA: "#5E4128", trunkB: "#80593A" },
};

const WITHERED: Palette = { dark: "#8E8575", mid: "#A39A8A", light: "#BDB4A4", trunkA: "#5C5247", trunkB: "#7A6E60", accent: "#6E6256" };

function rngFrom(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const f = (n: number) => Math.round(n * 10) / 10;

/** بقعة عضوية مغلقة: نقاط على قطع ناقص بنصف قطر متذبذب، تُوصل بمنحنيات ناعمة */
function blob(cx: number, cy: number, rx: number, ry: number, rng: () => number, n = 9): string {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 0.84 + 0.28 * rng();
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(pts[n - 1], pts[0]);
  let d = `M${f(start[0])} ${f(start[1])}`;
  for (let i = 0; i < n; i++) {
    const m = mid(pts[i], pts[(i + 1) % n]);
    d += ` Q${f(pts[i][0])} ${f(pts[i][1])} ${f(m[0])} ${f(m[1])}`;
  }
  return d + "Z";
}

type Shape = { d: string; tone: "dark" | "mid" | "light"; op?: number };
type Dot = { x: number; y: number; r: number; accent: boolean };
type Geo = { trunk: string; branches: string[]; shapes: Shape[]; dots: Dot[]; hasCanopy: boolean };

const ease = (t: number) => 1 - Math.pow(1 - t, 2);

/** فروع الجذع الصغيرة التي تظهر تحت الأوراق */
function trunkPath(rng: () => number, g: number, H: number, w0: number, lean: number): string {
  const top = 88 - H;
  const w1 = Math.max(0.8, w0 * 0.45);
  const bend = (rng() - 0.5) * 3 * g;
  const mx = 50 + lean * 0.5 + bend;
  const tx = 50 + lean;
  const my = 88 - H * 0.5;
  return (
    `M${f(50 - w0)} 88 Q${f(mx - w0 * 0.6)} ${f(my)} ${f(tx - w1)} ${f(top)} ` +
    `L${f(tx + w1)} ${f(top)} Q${f(mx + w0 * 0.6)} ${f(my)} ${f(50 + w0)} 88 Q50 90 ${f(50 - w0)} 88Z`
  );
}

function cluster(
  species: "oak" | "olive" | "cherry",
  rng: () => number,
  cx: number,
  cy: number,
  R: number,
  withered: boolean,
): { shapes: Shape[]; dots: Dot[] } {
  const wide = species === "olive" ? 1.25 : species === "cherry" ? 1.1 : 1;
  const tall = species === "olive" ? 0.72 : 1;
  const shapes: Shape[] = [];
  const dots: Dot[] = [];
  // ثلاث طبقات: ظلّ سفلي، وسط، إضاءة علوية
  const base: [number, number, number][] = [
    [0, 0.05, 1],
    [-0.62, 0.22, 0.68],
    [0.62, 0.22, 0.68],
    [-0.38, -0.42, 0.66],
    [0.4, -0.45, 0.62],
    [0, -0.1, 0.8],
  ];
  const shrink = withered ? 0.78 : 1;
  for (const [ox, oy, k] of base) {
    const jx = (rng() - 0.5) * 0.18;
    const jy = (rng() - 0.5) * 0.18;
    shapes.push({ d: blob(cx + (ox + jx) * R * wide, cy + (oy + jy) * R * tall + R * 0.12, R * k * wide * shrink, R * k * tall * shrink, rng), tone: "dark" });
  }
  for (const [ox, oy, k] of base) {
    const jx = (rng() - 0.5) * 0.18;
    shapes.push({ d: blob(cx + (ox + jx) * R * 0.92 * wide, cy + oy * R * 0.92 * tall - R * 0.06, R * k * 0.82 * wide * shrink, R * k * 0.82 * tall * shrink, rng), tone: "mid" });
  }
  for (const [ox, oy, k] of base.slice(1, 5)) {
    shapes.push({ d: blob(cx + ox * R * 0.8 * wide - R * 0.1, cy + oy * R * 0.8 * tall - R * 0.28, R * k * 0.42 * wide * shrink, R * k * 0.36 * tall * shrink, rng, 7), tone: "light", op: 0.75 });
  }
  if (species !== "oak") {
    const n = species === "cherry" ? 9 : 6;
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2;
      const d = Math.sqrt(rng()) * 0.8;
      dots.push({ x: cx + Math.cos(a) * d * R * wide, y: cy + Math.sin(a) * d * R * tall, r: species === "cherry" ? 1.1 + R * 0.05 : 0.9 + R * 0.04, accent: true });
    }
  }
  return { shapes, dots };
}

function build(species: Species, progress: number, seed: string, withered: boolean): Geo {
  const rng = rngFrom(seed + species);
  const p = Math.min(1, Math.max(0, progress));
  const g = ease(p);
  const hasCanopy = p > 0.12;
  // نمو الأوراق يبدأ بعد أن يرتفع الجذع قليلًا
  const gc = Math.min(1, Math.max(0, (p - 0.1) / 0.9));
  const lean = (rng() - 0.5) * 5 * g;
  const shapes: Shape[] = [];
  const dots: Dot[] = [];
  const branches: string[] = [];
  let trunk: string;

  if (species === "pine") {
    const H = 14 + 40 * g;
    trunk = trunkPath(rng, g, H, 1.2 + 2.6 * g, 0);
    const layers = 4;
    const top = 88 - H - 8 - 22 * gc;
    const total = 88 - 12 - top;
    const lh = Math.max(6, total / (layers - 0.9));
    for (let i = layers - 1; i >= 0; i--) {
      const yTop = top + (i * total) / layers * 0.92;
      const hw = (6 + 17 * gc) * (0.55 + 0.45 * ((i + 1) / layers)) + (rng() - 0.5) * 2;
      const yBot = yTop + lh;
      const d =
        `M50 ${f(yTop)} C${f(50 - hw * 0.3)} ${f(yTop + lh * 0.4)} ${f(50 - hw * 0.8)} ${f(yBot - lh * 0.25)} ${f(50 - hw)} ${f(yBot)} ` +
        `Q50 ${f(yBot - lh * 0.28)} ${f(50 + hw)} ${f(yBot)} C${f(50 + hw * 0.8)} ${f(yBot - lh * 0.25)} ${f(50 + hw * 0.3)} ${f(yTop + lh * 0.4)} 50 ${f(yTop)}Z`;
      shapes.push({ d, tone: i % 2 ? "dark" : "mid" });
      const hl =
        `M50 ${f(yTop + 1)} C${f(50 - hw * 0.25)} ${f(yTop + lh * 0.4)} ${f(50 - hw * 0.65)} ${f(yBot - lh * 0.3)} ${f(50 - hw * 0.85)} ${f(yBot - 1)} ` +
        `Q${f(50 - hw * 0.3)} ${f(yBot - lh * 0.4)} 50 ${f(yTop + lh * 0.5)}Z`;
      shapes.push({ d: hl, tone: "light", op: 0.55 });
    }
  } else if (species === "cypress") {
    const H = 10 + 18 * g;
    trunk = trunkPath(rng, g, H, 1.2 + 1.6 * g, 0);
    const W = 4 + 10 * gc;
    const bottom = 88 - H + 8;
    const topY = bottom - (14 + 44 * gc);
    const wob = (rng() - 0.5) * 2;
    const flame = (s: number, tone: Shape["tone"], op?: number, dx = 0) => {
      const w = W * s;
      const t = topY + (1 - s) * 6;
      const b = bottom - (1 - s) * 4;
      shapes.push({
        d:
          `M${f(50 + dx + wob)} ${f(t)} C${f(50 + dx + w * 1.05)} ${f(t + (b - t) * 0.28)} ${f(50 + dx + w * 1.25)} ${f(b - (b - t) * 0.22)} ${f(50 + dx)} ${f(b)} ` +
          `C${f(50 + dx - w * 1.25)} ${f(b - (b - t) * 0.22)} ${f(50 + dx - w * 1.05)} ${f(t + (b - t) * 0.28)} ${f(50 + dx + wob)} ${f(t)}Z`,
        tone,
        op,
      });
    };
    flame(1, "dark");
    flame(0.8, "mid");
    flame(0.38, "light", 0.7, -W * 0.28);
  } else {
    const H = 8 + 30 * g;
    const w0 = 1.2 + 3.4 * g;
    trunk = trunkPath(rng, g, H, w0, lean);
    const cx = 50 + lean;
    const R = 5 + 19 * gc;
    const cy = 88 - H - R * 0.45;
    // فرعان يخرجان من الجذع نحو الأوراق
    if (gc > 0.25) {
      const by = 88 - H * 0.62;
      branches.push(`M${f(cx)} ${f(by)} Q${f(cx - 8 * gc)} ${f(by - 5)} ${f(cx - 13 * gc)} ${f(by - 10 * gc)}`);
      branches.push(`M${f(cx)} ${f(by + 2)} Q${f(cx + 8 * gc)} ${f(by - 4)} ${f(cx + 13 * gc)} ${f(by - 9 * gc)}`);
    }
    const sp = species as "oak" | "olive" | "cherry";
    const c = cluster(sp, rng, cx, cy, R, withered);
    shapes.push(...c.shapes);
    if (gc > 0.55) dots.push(...c.dots);
  }
  return { trunk, branches, shapes, dots, hasCanopy };
}

type Props = {
  species: Species;
  /** 0 بذرة … 1 شجرة مكتملة */
  progress?: number;
  withered?: boolean;
  size?: number;
  /** بذرة التنويع (معرّف السجل) */
  seed?: string;
  /** تمايل خفيف (للشجرة الكبيرة فقط) */
  sway?: boolean;
  /** إخفاء التربة (للمشاهد التي ترسم أرضها) */
  noGround?: boolean;
};

function TreeBase({ species, progress = 1, withered, size = 120, seed = "x", sway, noGround }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const q = Math.round(Math.min(1, Math.max(0, progress)) * 40) / 40;
  const geo = useMemo(() => build(species, q, seed, !!withered), [species, q, seed, withered]);
  const pal = withered ? WITHERED : PALETTES[species];
  const tone = (t: Shape["tone"]) => pal[t];

  const rot = useSharedValue(0);
  useEffect(() => {
    if (!sway) {
      rot.value = 0;
      return;
    }
    rot.value = withRepeat(
      withSequence(withTiming(1.6, { duration: 2600, easing: Easing.inOut(Easing.sin) }), withTiming(-1.6, { duration: 2600, easing: Easing.inOut(Easing.sin) })),
      -1,
      true,
    );
  }, [sway, rot]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }], transformOrigin: "50% 92%" }));

  const seedling = !geo.hasCanopy;
  const sProg = Math.min(1, q / 0.12);

  const content = (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`t${uid}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={pal.trunkA} />
          <Stop offset="0.55" stopColor={pal.trunkB} />
          <Stop offset="1" stopColor={pal.trunkA} />
        </LinearGradient>
      </Defs>
      {noGround ? null : (
        <G>
          <Ellipse cx={50} cy={90} rx={30} ry={6.5} fill="#B58B5A" opacity={0.5} />
          <Ellipse cx={50} cy={88.5} rx={19} ry={4.4} fill="#8E6A41" />
        </G>
      )}
      {q === 0 ? <Ellipse cx={50} cy={86.5} rx={4.2} ry={2.8} fill="#5B3F22" /> : null}
      {q > 0 ? <Path d={geo.trunk} fill={`url(#t${uid})`} /> : null}
      {geo.branches.map((d, i) => (
        <Path key={i} d={d} stroke={pal.trunkA} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      ))}
      {seedling && q > 0 ? (
        <G>
          <Ellipse cx={45} cy={88 - (8 + 36 * 0.3 * sProg)} rx={3 + 3 * sProg} ry={1.8 + 1.4 * sProg} fill={pal.mid} transform={`rotate(-28 45 ${88 - (8 + 11 * sProg)})`} />
          <Ellipse cx={55} cy={88 - (9 + 11 * sProg)} rx={3 + 3 * sProg} ry={1.8 + 1.4 * sProg} fill={pal.light} transform={`rotate(28 55 ${88 - (9 + 11 * sProg)})`} />
        </G>
      ) : null}
      {geo.shapes.map((s, i) => (
        <Path key={i} d={s.d} fill={tone(s.tone)} opacity={s.op ?? 1} />
      ))}
      {withered
        ? null
        : geo.dots.map((d, i) => <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill={pal.accent ?? "#fff"} opacity={0.95} />)}
    </Svg>
  );

  return sway ? <Animated.View style={style}>{content}</Animated.View> : <View>{content}</View>;
}

export const Tree = memo(TreeBase);
