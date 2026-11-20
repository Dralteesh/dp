/** أنماط تصميم احتياطية — غير مستخدمة حاليًا (انظر README.md). */
export type ThemeId = "calm" | "dark" | "medical" | "classic";

export type ThemeTokens = {
  label: string;
  bg: string;
  surface: string;
  line: string;
  text: string;
  muted: string;
  /** لون التمييز العام (أزرار، شريط سفلي) */
  accent: string;
  onAccent: string;
  /** بطاقة الملخص الداكنة (دخلي الشهري وغيرها) */
  hero: string;
  onHero: string;
  radius: number;
};

export const THEMES: Record<ThemeId, ThemeTokens> = {
  calm: { label: "هادئ فاتح", bg: "#F6F7F9", surface: "#FFFFFF", line: "#E5E7EB", text: "#0F172A", muted: "#64748B", accent: "#2563EB", onAccent: "#FFFFFF", hero: "#1E2229", onHero: "#FFFFFF", radius: 20 },
  dark: { label: "داكن", bg: "#0F1115", surface: "#181B21", line: "#2A2F38", text: "#F1F5F9", muted: "#94A3B8", accent: "#60A5FA", onAccent: "#0F1115", hero: "#232833", onHero: "#FFFFFF", radius: 20 },
  medical: { label: "طبي أخضر", bg: "#F2F8F6", surface: "#FFFFFF", line: "#D5E7E1", text: "#0B2B26", muted: "#4F6F68", accent: "#0F766E", onAccent: "#FFFFFF", hero: "#0B3D36", onHero: "#FFFFFF", radius: 24 },
  classic: { label: "كلاسيكي", bg: "#FAF7F2", surface: "#FFFFFF", line: "#E7DFD2", text: "#2B2118", muted: "#7A6B5A", accent: "#9A3412", onAccent: "#FFFFFF", hero: "#3B2A1D", onHero: "#FFF7ED", radius: 12 },
};
