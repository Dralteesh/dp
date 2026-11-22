/** هندسة مخطط الأسنان (دوال نقية قابلة للاختبار): قوس U عريض، أسنان بحجومها موزّعة على طول المنحنى */
import { LOWER_PRIMARY, LOWER_TEETH, UPPER_PRIMARY, UPPER_TEETH } from "@/constants/clinic";

export type Dentition = "permanent" | "primary";
export type ToothKind = "incisor" | "canine" | "premolar" | "molar";

export type PlacedTooth = {
  code: string;
  upper: boolean;
  kind: ToothKind;
  /** مركز السن */
  x: number;
  y: number;
  /** عرض السن (على امتداد القوس) وعمقه (عمودياً عليه) بالبكسل */
  w: number;
  d: number;
  /** زاوية الدوران بالدرجات بحيث يشير محور y المحلي للخارج */
  rot: number;
};

export type Layout = { W: number; H: number; teeth: PlacedTooth[]; midY: number };

const GAP = 1.6; // فراغ ثابت بسيط بين الأسنان (وحدات)

/** عروض الأسنان الدائمة بالوحدات (قاطع ≈ 17، ناب ≈ 19، ضاحك ≈ 22، رحى ≈ 27) */
function unitWidth(code: string, upper: boolean, dentition: Dentition): number {
  const n = Number(code[1]);
  if (dentition === "primary") {
    // لبني: الأرحاء أكبر نسبيًا
    return [0, 15, 13, 15, 20, 24][n] ?? 15;
  }
  if (n === 1) return upper ? 18 : 14;
  if (n === 2) return upper ? 16 : 15;
  if (n === 3) return 19;
  if (n <= 5) return 22;
  if (n <= 7) return 27;
  return 24; // رحى العقل
}

export function toothKind(code: string, dentition: Dentition): ToothKind {
  const n = Number(code[1]);
  if (n <= 2) return "incisor";
  if (n === 3) return "canine";
  if (dentition === "primary") return "molar";
  return n <= 5 ? "premolar" : "molar";
}

/** عمق السن نسبة إلى عرضه */
const DEPTH: Record<ToothKind, number> = { incisor: 1.18, canine: 1.12, premolar: 0.98, molar: 0.92 };

/** نقطة على القوس العلوي المقلوب (∩): t من 0 (الخلف الأيسر) إلى π (الخلف الأيمن). */
function archPoint(t: number, a: number, b: number): { x: number; y: number } {
  const P = 0.82; // أقل من 1 = قوس أعرض وأقرب لحرف U من القطع الناقص
  const c = Math.cos(t);
  const s = Math.sin(t);
  return { x: -a * Math.sign(c) * Math.pow(Math.abs(c), P), y: -b * Math.pow(Math.abs(s), P) };
}

type Sample = { x: number; y: number; len: number };

function sampleArch(a: number, b: number, n = 480): Sample[] {
  const out: Sample[] = [];
  let len = 0;
  let prev = archPoint(0, a, b);
  for (let i = 0; i <= n; i++) {
    const p = archPoint((Math.PI * i) / n, a, b);
    if (i > 0) len += Math.hypot(p.x - prev.x, p.y - prev.y);
    out.push({ x: p.x, y: p.y, len });
    prev = p;
  }
  return out;
}

function at(samples: Sample[], len: number): { x: number; y: number; tx: number; ty: number } {
  const L = samples[samples.length - 1].len;
  const t = Math.max(0, Math.min(L, len));
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].len <= t) lo = mid;
    else hi = mid;
  }
  const A = samples[lo];
  const B = samples[hi];
  const f = B.len === A.len ? 0 : (t - A.len) / (B.len - A.len);
  const x = A.x + (B.x - A.x) * f;
  const y = A.y + (B.y - A.y) * f;
  const i0 = Math.max(0, lo - 3);
  const i1 = Math.min(samples.length - 1, hi + 3);
  const dx = samples[i1].x - samples[i0].x;
  const dy = samples[i1].y - samples[i0].y;
  const m = Math.hypot(dx, dy) || 1;
  return { x, y, tx: dx / m, ty: dy / m };
}

export function archCodes(upper: boolean, dentition: Dentition): string[] {
  if (dentition === "primary") return upper ? UPPER_PRIMARY : LOWER_PRIMARY;
  return upper ? UPPER_TEETH : LOWER_TEETH;
}

/**
 * يحسب مواقع كل أسنان الفك. W عرض اللوحة، ارتفاعها H ≈ W * 0.95.
 * المقياس يُحسب من القوس الدائم الكامل ثم يُستعمل نفسه للبني، فيبقى حجم السن ثابتًا بين الوضعين.
 */
export function layoutOdontogram(W: number, dentition: Dentition): Layout {
  const H = Math.round(W * 0.95);
  const midY = H / 2;
  const marginX = Math.max(22, W * 0.075);
  const a = W / 2 - marginX;
  const yFront = Math.max(20, W * 0.06) + 22; // مركز أبعد نقطة أمامية للقوس عن حافة اللوحة
  const b = midY - yFront; // عمق القوس الدائم (الأمام ← الخلف)

  const fullSamples = sampleArch(a, b);
  const fullLen = fullSamples[fullSamples.length - 1].len;
  const fullUnits =
    UPPER_TEETH.reduce((s, c) => s + unitWidth(c, true, "permanent"), 0) + GAP * (UPPER_TEETH.length - 1);
  const scale = (fullLen * 0.97) / fullUnits;

  // اللبني: أسنان أكبر قليلًا نسبةً إلى القوس الدائم (للمس السهل) على قوس أصغر يتناسب مع عددها (10 بدل 16)
  const primary = dentition === "primary";
  const sc = primary ? scale * 1.15 : scale;
  const need = (upper: boolean) => {
    const codes = archCodes(upper, dentition);
    return codes.reduce((t, c) => t + unitWidth(c, upper, dentition) * sc, 0) + GAP * sc * (codes.length - 1);
  };
  const k = primary ? Math.min(1, Math.max(need(true), need(false)) / (fullLen * 0.97)) : 1;
  const samples = k === 1 ? fullSamples : sampleArch(a * k, b * k);
  const L = samples[samples.length - 1].len;
  const bk = b * k;
  const innerY = -bk * 0.45; // نقطة داخل القوس لتحديد جهة الخارج

  const teeth: PlacedTooth[] = [];
  for (const upper of [true, false]) {
    const codes = archCodes(upper, dentition);
    const widths = codes.map((c) => unitWidth(c, upper, dentition) * sc);
    const gap = GAP * sc;
    const total = widths.reduce((s, x) => s + x, 0) + gap * (codes.length - 1);
    let cursor = (L - total) / 2;
    codes.forEach((code, i) => {
      const w = widths[i];
      const p = at(samples, cursor + w / 2);
      cursor += w + gap;
      // الناظم على المماس موجَّهًا بعيدًا عن داخل القوس
      let nx = -p.ty;
      let ny = p.tx;
      if (nx * p.x + ny * (p.y - innerY) < 0) {
        nx = -nx;
        ny = -ny;
      }
      const kind = toothKind(code, dentition);
      const yUp = yFront + bk + p.y; // إحداثي القوس العلوي
      const oy = upper ? ny : -ny; // السفلي معكوس رأسيًا
      teeth.push({
        code,
        upper,
        kind,
        x: W / 2 + p.x,
        y: upper ? yUp : H - yUp,
        w,
        d: w * DEPTH[kind],
        rot: (Math.atan2(-nx, oy) * 180) / Math.PI,
      });
    });
  }
  return { W, H, teeth, midY };
}

/** أقرب سن لنقطة لمس ضمن maxDist بكسل، مع تحديد الفك أولًا حسب موقع الضغطة */
export function nearestTooth(layout: Layout, x: number, y: number, maxDist = 30): string | null {
  const upper = y < layout.midY;
  let best: { code: string; d: number } | null = null;
  for (const t of layout.teeth) {
    if (t.upper !== upper) continue;
    const d = Math.hypot(t.x - x, t.y - y);
    if (d <= maxDist && (!best || d < best.d)) best = { code: t.code, d };
  }
  return best?.code ?? null;
}

/** ترتيب التنقل بين الأسنان: 18…11، 21…28، 38…31، 41…48 (واللبنية: 55…51، 61…65، 85…81، 71…75) */
export function navOrder(dentition: Dentition): string[] {
  return dentition === "primary" ? [...UPPER_PRIMARY, ...LOWER_PRIMARY] : [...UPPER_TEETH, ...[...LOWER_TEETH].reverse()];
}

const UNIT_NAMES: Record<number, string> = {
  1: "القاطع المركزي",
  2: "القاطع الجانبي",
  3: "الناب",
  4: "الضاحك الأول",
  5: "الضاحك الثاني",
  6: "الرحى الأولى",
  7: "الرحى الثانية",
  8: "رحى العقل",
};
const PRIMARY_NAMES: Record<number, string> = {
  1: "القاطع المركزي",
  2: "القاطع الجانبي",
  3: "الناب",
  4: "الرحى اللبنية الأولى",
  5: "الرحى اللبنية الثانية",
};
const QUADRANT: Record<string, string> = {
  "1": "العلوي الأيمن",
  "2": "العلوي الأيسر",
  "3": "السفلي الأيسر",
  "4": "السفلي الأيمن",
  "5": "العلوي الأيمن",
  "6": "العلوي الأيسر",
  "7": "السفلي الأيسر",
  "8": "السفلي الأيمن",
};

/** اسم السن بالعربية (مثل: الضاحك الأول العلوي الأيمن) */
export function toothName(code: string): string {
  const q = code[0];
  const n = Number(code[1]);
  const primary = Number(q) >= 5;
  const base = (primary ? PRIMARY_NAMES : UNIT_NAMES)[n];
  return base && QUADRANT[q] ? `${base} ${QUADRANT[q]}` : `السن ${code}`;
}

/** هل سجلات المريض فيها أسنان لبنية (FDI 51–85)؟ */
export function hasPrimaryRecords(teeth: Record<string, unknown>): boolean {
  return Object.keys(teeth).some((k) => /^[5-8][1-5]$/.test(k));
}

/** الوضع الافتراضي للمخطط: لبنية إن سُجّلت أسنان لبنية أو كان العمر < 6 سنوات، وإلا دائمة */
export function defaultDentition(teeth: Record<string, unknown>, birthYear?: number, nowYear = new Date().getFullYear()): Dentition {
  if (hasPrimaryRecords(teeth)) return "primary";
  if (birthYear && nowYear - birthYear < 6) return "primary";
  return "permanent";
}

/** مسار SVG لتاج السن في إحداثيات محلية (المركز 0،0؛ +y = جهة الخارج). */
export function toothPath(kind: ToothKind, w: number, d: number): string {
  const hw = w / 2;
  const hd = d / 2;
  const f = (n: number) => Math.round(n * 100) / 100;
  const rr = (r: number) =>
    `M ${f(-hw + r)} ${f(-hd)} L ${f(hw - r)} ${f(-hd)} Q ${f(hw)} ${f(-hd)} ${f(hw)} ${f(-hd + r)} L ${f(hw)} ${f(hd - r)} Q ${f(hw)} ${f(hd)} ${f(hw - r)} ${f(hd)} L ${f(-hw + r)} ${f(hd)} Q ${f(-hw)} ${f(hd)} ${f(-hw)} ${f(hd - r)} L ${f(-hw)} ${f(-hd + r)} Q ${f(-hw)} ${f(-hd)} ${f(-hw + r)} ${f(-hd)} Z`;
  if (kind === "incisor") return rr(w * 0.3);
  if (kind === "premolar") return rr(w * 0.4);
  if (kind === "molar") return rr(w * 0.34);
  // ناب: قاعدة مستقيمة وقمة مدبّبة قليلًا نحو الخارج
  const r = w * 0.28;
  return (
    `M ${f(-hw * 0.9)} ${f(-hd)} L ${f(hw * 0.9)} ${f(-hd)} Q ${f(hw)} ${f(-hd)} ${f(hw)} ${f(-hd + r)} ` +
    `L ${f(hw)} ${f(hd * 0.1)} Q ${f(hw)} ${f(hd * 0.55)} ${f(w * 0.18)} ${f(hd - 1.5)} Q 0 ${f(hd + 1.5)} ${f(-w * 0.18)} ${f(hd - 1.5)} ` +
    `Q ${f(-hw)} ${f(hd * 0.55)} ${f(-hw)} ${f(hd * 0.1)} L ${f(-hw)} ${f(-hd + r)} Q ${f(-hw)} ${f(-hd)} ${f(-hw * 0.9)} ${f(-hd)} Z`
  );
}

/** خطوط الشقوق على الضاحك والرحى (مسار واحد بخطوط متقطعة) */
export function fissurePath(kind: ToothKind, w: number, d: number): string {
  if (kind === "premolar") return `M 0 ${(-d * 0.26).toFixed(2)} L 0 ${(d * 0.26).toFixed(2)}`;
  if (kind === "molar")
    return `M ${(-w * 0.24).toFixed(2)} 0 L ${(w * 0.24).toFixed(2)} 0 M 0 ${(-d * 0.24).toFixed(2)} L 0 ${(d * 0.24).toFixed(2)}`;
  return "";
}
