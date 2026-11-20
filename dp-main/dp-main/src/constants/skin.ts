/**
 * مظهر «أزرق باستيل» (مستوحى من تصميم Alteesh Planner).
 * لتغيير الألوان كلها: عدّل هذا الملف + قيم bg/line/ink في tailwind.config.js.
 */
export const SKIN = {
  bg: "#F3F9FD",
  bgTop: "#E4F2FB",
  navy: "#0B4568",
  ink: "#0B3A58",
  line: "#D6EAF6",
  lineStrong: "#C6E0F1",
  pale: "#EAF5FC",
  pale2: "#DCEFFA",
  muted: "#6F91A8",
  shadow: "#6D9DB9",
} as const;

/** ظل أزرق ناعم موحّد للبطاقات */
export const SOFT_SHADOW = {
  shadowColor: SKIN.shadow,
  shadowOpacity: 0.14,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;
