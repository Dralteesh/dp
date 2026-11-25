/** أدوات ألوان بسيطة (بدون مكتبات) لاشتقاق ألوان الواجهة من لون أساسي واحد. */

/** يقبل #abc أو abc أو #aabbcc ويعيد #AABBCC، أو null إن لم يكن صالحًا */
export function normalizeHex(input: string | undefined | null): string | null {
  if (!input) return null;
  let h = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return `#${h.toUpperCase()}`;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}

/** يمزج hex مع لون آخر: t=0 الأصل، t=1 اللون الآخر */
export function mix(hex: string, other: string, t: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(other);
  return `#${toHex(a[0] + (b[0] - a[0]) * t)}${toHex(a[1] + (b[1] - a[1]) * t)}${toHex(a[2] + (b[2] - a[2]) * t)}`.toUpperCase();
}

/** سطوع نسبي 0..1 (WCAG) */
export function luminance(hex: string): number {
  const lin = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** "37 99 235" — الصيغة التي تحتاجها متغيرات NativeWind مع rgb(var(--x) / <alpha-value>) */
export function rgbTriplet(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return `${r} ${g} ${b}`;
}
