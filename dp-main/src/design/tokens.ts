/** نظام التصميم الموحّد (مستخرج من المنبّه + النوم + إعدادات الإيقاف/التكرار) */
export const DS = {
  // الخلفيات
  night: "#0F1B3D",
  nightDeep: "#0A1330",
  day: "#F4F4F4",
  paper: "#F6EBD3",
  // الأسطح
  glass: "rgba(255,255,255,0.08)",
  glassStrong: "rgba(255,255,255,0.14)",
  glassBorder: "rgba(255,255,255,0.12)",
  card: "#FFFFFF",
  // الألوان
  accent: "#6366F1",
  alarm: "#E32D0B",
  good: "#34D399",
  warn: "#FBBF24",
  bad: "#F87171",
  ink: "#111111",
  inkSoft: "#9A9A9A",
  onNight: "#FFFFFF",
  onNightSoft: "rgba(255,255,255,0.62)",
  // الأشكال
  rCard: 26,
  rInner: 18,
  rPill: 999,
  // الحركة
  spring: { damping: 16, stiffness: 180, mass: 0.7 },
} as const;

export type Mode = "night" | "day";
export const surface = (m: Mode) =>
  m === "night"
    ? { bg: DS.night, card: DS.glass, text: DS.onNight, soft: DS.onNightSoft, border: DS.glassBorder }
    : { bg: DS.day, card: DS.card, text: DS.ink, soft: DS.inkSoft, border: "#E5E7EB" };
