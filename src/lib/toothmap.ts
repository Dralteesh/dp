import { TM_TEETH, TM_TYPES, TM_VB, TM_MID_Y, TM_LINE, type TmTooth, type TmType } from "@/constants/toothmapShapes";
import type { Dentition } from "@/lib/odontogram";

/** الأسنان اللبنية 51–85 ← مقابلها الدائم 11–15 في مخطط Toothmap (5x→1x، 6x→2x، 7x→3x، 8x→4x) */
export function permanentOf(code: string): string {
  const q = Number(code[0]);
  return q >= 5 ? `${q - 4}${code[1]}` : code;
}

/** إزاحة الفك السفلي للأعلى في وضع اللبنية لإغلاق الفراغ الذي كانت تشغله الأضراس الدائمة */
const PRIMARY_SHIFT = -346;

/** إزاحة المخطط الدائم للأسفل في الوضع المختلط (تحت إطار اللبنية 363 + فاصل) */
const MIXED_PERM_DY = 379;

export type PlacedShape = { type: TmType; m: [number, number, number, number, number, number]; cx: number; cy: number; w: number; h: number; x0: number; x1: number; y0: number; y1: number };

/** شكل السن النهائي (مصفوفة + صندوق) بحسب وضع الأسنان */
export function placedShape(code: string, dentition: Dentition): PlacedShape | null {
  const t: TmTooth | undefined = TM_TEETH[permanentOf(code)];
  if (!t) return null;
  const isPrimaryCode = Number(code[0]) >= 5;
  const primary = dentition === "primary" || (dentition === "mixed" && isPrimaryCode);
  const lower = t.cy > TM_MID_Y;
  // مختلط: اللبنية في الأعلى (إطار اللبنية)، والدائمة مزاحة للأسفل تحتها
  const ty = (primary && lower ? PRIMARY_SHIFT : 0) + (dentition === "mixed" && !isPrimaryCode ? MIXED_PERM_DY : 0);
  const m: PlacedShape["m"] = [t.m[0], t.m[1], t.m[2], t.m[3], t.m[4], t.m[5] + ty];
  return { type: TM_TYPES[t.t], m, cx: t.cx, cy: t.cy + ty, w: t.x1 - t.x0, h: t.y1 - t.y0, x0: t.x0, x1: t.x1, y0: t.y0 + ty, y1: t.y1 + ty };
}

export type Frame = { vb: { x: number; y: number; w: number; h: number }; mid: number; /** خطوط الإطباق (واحد لكل مخطط) */ mids: number[]; /** حدود الفكوك للالتقاط (تشمل الفاصل بين المخططين) */ seps: number[]; line: { x1: number; x2: number } };

export function frameOf(dentition: Dentition): Frame {
  if (dentition === "primary") return { vb: { x: TM_VB.x, y: TM_VB.y, w: TM_VB.w, h: 363 }, mid: 174, mids: [174], seps: [174], line: TM_LINE };
  if (dentition === "mixed") {
    return { vb: { x: TM_VB.x, y: TM_VB.y, w: TM_VB.w, h: 363 + 16 + TM_VB.h }, mid: 174, mids: [174, TM_MID_Y + MIXED_PERM_DY], seps: [174, 363, TM_MID_Y + MIXED_PERM_DY], line: TM_LINE };
  }
  return { vb: TM_VB, mid: TM_MID_Y, mids: [TM_MID_Y], seps: [TM_MID_Y], line: TM_LINE };
}

/** منتصف المخطط أفقيًا (خط الوسط بين الأسنان) */
export const TM_CENTER_X = 204.5;
