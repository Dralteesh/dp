import { kindOf, type Kind, type Weather } from "@/lib/weather";

/** حالة السماء المشتقّة من الطقس: النوع + شدّته + الرياح (كلها أعداد صغيرة كي تبقى المكوّنات المتحرّكة ثابتة الخصائص) */
export type SkyWeather = {
  kind: Kind;
  /** شدة الغيوم/الهطول: 1 خفيف، 2 متوسط، 3 شديد */
  level: 1 | 2 | 3;
  /** الرياح: 0 هادئة، 1 نشطة، 2 قوية */
  wind: 0 | 1 | 2;
};

export const CLEAR_SKY: SkyWeather = { kind: "clear", level: 1, wind: 0 };

/** الطقس الأقدم من هذا لا يُرسم (نعود لسماء الصلاة الصافية بدل عرض عاصفة انتهت) */
const MAX_AGE_MS = 3 * 60 * 60 * 1000;

const LEVEL_BY_CODE: Record<number, 1 | 2 | 3> = {
  51: 1, 53: 1, 55: 2, 56: 1, 57: 2,
  61: 1, 63: 2, 65: 3, 66: 2, 67: 3,
  71: 1, 73: 2, 75: 3, 77: 1,
  80: 1, 81: 2, 82: 3, 85: 2, 86: 3,
  95: 2, 96: 3, 99: 3,
};

const pad = (n: number) => String(n).padStart(2, "0");

/** يشتق حالة السماء من آخر طقس محفوظ (ساعة الآن إن وُجدت في التوقعات وإلا الحالة الحالية) */
export function skyWeatherOf(w: Weather | undefined | null, nowMs: number): SkyWeather {
  if (!w || nowMs - w.fetchedAt > MAX_AGE_MS) return CLEAR_SKY;
  const d = new Date(nowMs);
  const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}`;
  const slot = w.hours.find((x) => x.time.slice(0, 13) === key);
  const code = slot ? slot.code : w.now.code;
  const kind = kindOf(code);
  const speed = Math.max(w.now.wind ?? 0, (slot?.gust ?? 0) * 0.6);
  const wind: 0 | 1 | 2 = speed < 18 ? 0 : speed < 35 ? 1 : 2;
  const level = LEVEL_BY_CODE[code] ?? (kind === "snow" || kind === "rain" || kind === "storm" ? 2 : 1);
  return { kind, level, wind };
}

// ---------- ألوان ----------
const rgb = (c: string): [number, number, number] => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const hx = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
/** مزج لونين سداسيين: t=0 الأول، t=1 الثاني */
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return `#${hx(r1 + (r2 - r1) * t)}${hx(g1 + (g2 - g1) * t)}${hx(b1 + (b2 - b1) * t)}`;
}

type Tint = { to: string; by: number };
/** كل حالة تمزج لون السماء نحو رمادي مزرق (نهارًا) أو كحلي أغمق (ليلًا): تبقى روح وقت الصلاة ويبقى النص الأبيض مقروءًا */
const DAY_TINT: Record<Kind, Tint> = {
  clear: { to: "#7f8fa3", by: 0 },
  partly: { to: "#8aa0b8", by: 0.1 },
  cloudy: { to: "#74859c", by: 0.42 },
  fog: { to: "#79839d", by: 0.5 },
  drizzle: { to: "#667a96", by: 0.42 },
  rain: { to: "#516580", by: 0.52 },
  snow: { to: "#7b90b0", by: 0.42 },
  storm: { to: "#2d3450", by: 0.66 },
};
const NIGHT_TINT: Record<Kind, Tint> = {
  clear: { to: "#0b0e1c", by: 0 },
  partly: { to: "#161b33", by: 0.12 },
  cloudy: { to: "#1a2038", by: 0.34 },
  fog: { to: "#2a2f48", by: 0.4 },
  drizzle: { to: "#171d34", by: 0.38 },
  rain: { to: "#121729", by: 0.46 },
  snow: { to: "#2a3350", by: 0.3 },
  storm: { to: "#090c18", by: 0.6 },
};

/** تدرّج السماء بعد أثر الطقس (الشدة تزيد المزج قليلًا) */
export function tintSky(sky: [string, string, string], sw: SkyWeather, night: boolean): [string, string, string] {
  const t = (night ? NIGHT_TINT : DAY_TINT)[sw.kind];
  if (t.by === 0) return sky;
  const by = Math.min(0.85, t.by + (sw.level - 1) * 0.05);
  return [mix(sky[0], t.to, by), mix(sky[1], t.to, by * 0.92), mix(sky[2], t.to, by * 0.85)];
}

/** شفافية توهّج الشمس/القمر وقرصهما والنجوم بحسب الطقس (الغيوم تحجب جزءًا منها) */
export type SkyDim = { glow: number; disc: number; stars: number };
const DIM: Record<Kind, SkyDim> = {
  clear: { glow: 1, disc: 1, stars: 1 },
  partly: { glow: 0.85, disc: 1, stars: 0.75 },
  cloudy: { glow: 0.45, disc: 0.6, stars: 0.2 },
  fog: { glow: 0.5, disc: 0.45, stars: 0.12 },
  drizzle: { glow: 0.35, disc: 0.5, stars: 0.1 },
  rain: { glow: 0.25, disc: 0.38, stars: 0 },
  snow: { glow: 0.4, disc: 0.5, stars: 0.1 },
  storm: { glow: 0.1, disc: 0.24, stars: 0 },
};
export const dimOf = (k: Kind): SkyDim => DIM[k];
