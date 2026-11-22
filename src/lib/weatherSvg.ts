import type { Kind } from "@/lib/weather";

/** رسومات الطقس (SVG نصّي): مصدر واحد للتطبيق (SvgXml) والودجت (SvgWidget) */

const grad = (id: string, a: string, b: string, c: string) =>
  `<radialGradient id="${id}" cx="0.35" cy="0.3" r="0.85"><stop offset="0" stop-color="${a}"/><stop offset="0.6" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>`;

const DEFS = [
  grad("cw", "#FFFFFF", "#F1F5FC", "#C5D3EA"), // سحابة بيضاء
  grad("cg", "#E3EAF6", "#B6C3DB", "#8696B6"), // سحابة رمادية فاتحة
  grad("cd", "#D5DAE6", "#9AA3B8", "#6B7490"), // سحابة داكنة (عاصفة)
  grad("sun", "#FFF1A8", "#FFD23F", "#FFA400"),
  grad("moon", "#FFFBE0", "#F6E7A8", "#E2C766"),
  `<radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFE680" stop-opacity="0.75"/><stop offset="1" stop-color="#FFE680" stop-opacity="0"/></radialGradient>`,
  `<linearGradient id="drop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A8DCFF"/><stop offset="1" stop-color="#2F8CFF"/></linearGradient>`,
  `<linearGradient id="bolt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF07A"/><stop offset="1" stop-color="#FFB800"/></linearGradient>`,
].join("");

/** سحابة منتفخة: ثلاث دوائر وقاعدة، لكلٍّ تدرّجها فتظهر كأنها مجسّمة */
const cloud = (x: number, y: number, s: number, f: "cw" | "cg" | "cd") =>
  `<g transform="translate(${x} ${y}) scale(${s})"><rect x="8" y="50" width="144" height="44" rx="22" fill="url(#${f})"/><circle cx="50" cy="52" r="28" fill="url(#${f})"/><circle cx="88" cy="40" r="36" fill="url(#${f})"/><circle cx="124" cy="56" r="26" fill="url(#${f})"/></g>`;

const sun = (cx: number, cy: number, r: number) =>
  `<circle cx="${cx}" cy="${cy}" r="${r * 1.7}" fill="url(#glow)"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#sun)"/>`;

const moon = (cx: number, cy: number, r: number) =>
  `<g transform="translate(${cx} ${cy}) scale(${r / 40})"><path d="M 18 -36 A 40 40 0 1 0 36 18 A 31 31 0 1 1 18 -36 Z" fill="url(#moon)"/></g>`;

const stars = `<circle cx="30" cy="30" r="3" fill="#fff" opacity="0.9"/><circle cx="168" cy="26" r="2.4" fill="#fff" opacity="0.8"/><circle cx="52" cy="120" r="2" fill="#fff" opacity="0.7"/><circle cx="176" cy="110" r="3" fill="#fff" opacity="0.85"/>`;

const drops = (n: number, long: number) =>
  Array.from({ length: n }, (_, i) => {
    const x = 42 + i * (116 / Math.max(1, n - 1));
    const y = 128 + (i % 2) * 14;
    return `<rect x="${x}" y="${y}" width="9" height="${long}" rx="4.5" fill="url(#drop)" transform="rotate(14 ${x + 4} ${y})"/>`;
  }).join("");

const snow = [[52, 134], [90, 154], [128, 134], [166, 154], [70, 172], [148, 176]]
  .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8" fill="#fff" stroke="#BFE3FF" stroke-width="2"/>`)
  .join("");

function body(kind: Kind, isDay: boolean): string {
  switch (kind) {
    case "clear":
      return isDay ? sun(100, 95, 46) : moon(100, 95, 52) + stars;
    case "partly":
      return (isDay ? sun(138, 62, 38) : moon(138, 62, 40) + stars) + cloud(16, 58, 1.1, "cw");
    case "cloudy":
      return cloud(64, 14, 0.85, "cg") + cloud(12, 54, 1.12, "cw");
    case "fog":
      return (
        cloud(22, 12, 1.0, "cw") +
        `<rect x="26" y="124" width="148" height="11" rx="5.5" fill="#fff" opacity="0.8"/><rect x="46" y="142" width="128" height="11" rx="5.5" fill="#fff" opacity="0.65"/><rect x="30" y="160" width="110" height="11" rx="5.5" fill="#fff" opacity="0.5"/>`
      );
    case "drizzle":
      return cloud(12, 8, 1.12, "cg") + drops(4, 18);
    case "rain":
      return cloud(12, 6, 1.12, "cg") + drops(5, 30);
    case "snow":
      return cloud(12, 6, 1.12, "cg") + snow;
    case "storm":
      return cloud(8, 2, 1.16, "cd") + `<path d="M118 96 L82 150 L106 150 L92 190 L136 126 L112 126 Z" fill="url(#bolt)"/>`;
  }
}

/** ‎SVG كامل لرسمة الحالة (viewBox 200×190) */
export function illustrationSvg(kind: Kind, isDay: boolean): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="190" viewBox="0 0 200 190"><defs>${DEFS}</defs>${body(kind, isDay)}</svg>`;
}

/** تدرّج بطاقة الحالة (أعلى، أسفل) بألوان متناسقة مع تطبيق النوم والمنبّه (نيلي/بنفسجي ليلًا) */
export function kindGradient(kind: Kind, isDay: boolean): [string, string] {
  if (!isDay) return kind === "clear" || kind === "partly" ? ["#4C4FD0", "#1B1F5E"] : ["#3C4380", "#1B2250"];
  switch (kind) {
    case "clear": return ["#35BDFF", "#1E6BE6"];
    case "partly": return ["#3FA9F5", "#2563D6"];
    case "cloudy": return ["#7DA0C9", "#4A6A94"];
    case "fog": return ["#9AA9BB", "#667A90"];
    case "drizzle":
    case "rain": return ["#4B86D8", "#2A4A9C"];
    case "snow": return ["#8EC8F5", "#4F8FD6"];
    case "storm": return ["#5E5BD6", "#2B2A78"];
  }
}

/** لون الأيقونة الصغيرة (Ionicons) على الخلفيات الداكنة */
export function kindIconColor(kind: Kind, isDay = true): string {
  switch (kind) {
    case "clear": return isDay ? "#FFD23F" : "#F6E7A8";
    case "partly": return "#FFD23F";
    case "rain":
    case "drizzle": return "#8FD3FF";
    case "storm": return "#FFE04A";
    default: return "#E5ECF6";
  }
}
