/**
 * أدوات ملاءمة النصوص في الودجتس.
 * TextWidget لا يقيس نفسه داخل الصفوف، فإذا زاد النص عن مساحته يُقصّ من منتصف الكلمة.
 * لذلك نقدّر عرض النص مسبقًا: نصغّر الخط أولًا، وإن لم يكفِ نقتطع بنقطتين «…» عند حدّ كلمة.
 */

export type WSize = { w: number; h: number };

/** مقاس افتراضي (4×2 تقريبًا) عند غياب معلومات الودجت */
export const DEFAULT_SIZE: WSize = { w: 300, h: 130 };

/** يحوّل widgetInfo القادم من المكتبة إلى مقاس بوحدة dp مع قيمة بديلة آمنة */
export function sizeOf(info?: { width?: number; height?: number } | null): WSize {
  const w = info?.width;
  const h = info?.height;
  return {
    w: typeof w === "number" && Number.isFinite(w) && w > 40 ? w : DEFAULT_SIZE.w,
    h: typeof h === "number" && Number.isFinite(h) && h > 40 ? h : DEFAULT_SIZE.h,
  };
}

/** متوسط عرض الحرف العربي/الرقم نسبة إلى حجم الخط (تقدير متحفّظ للخط الغامق) */
const CH = 0.58;

/** عرض النص التقريبي بوحدة dp */
export const textW = (text: string, size: number) => Math.ceil(text.length * size * CH);

/** أكبر حجم خط (≤ base و≥ min) يجعل النص كله ضمن المساحة المتاحة */
export function fitFont(text: string, room: number, base: number, min = 9): number {
  const n = Math.max(1, text.length);
  const s = Math.floor(room / (n * CH));
  return Math.max(min, Math.min(base, s));
}

/** يقتطع النص بنقطتين عند آخر مسافة تتّسع له، دون أن يقصّ كلمة من منتصفها */
export function clip(text: string, room: number, size: number): string {
  if (textW(text, size) <= room) return text;
  const max = Math.max(2, Math.floor(room / (size * CH)) - 1);
  let cut = text.slice(0, max).trimEnd();
  const sp = cut.lastIndexOf(" ");
  // نقتطع عند آخر مسافة إن بقي أكثر من نصف المقطع، وإلا نبقي ما يتّسع
  if (sp > max * 0.5) cut = cut.slice(0, sp);
  return `${cut}…`;
}

/** يصغّر الخط حتى حدّه الأدنى ثم يقتطع إن لزم: يعيد النص والحجم معًا */
export function fitText(text: string, room: number, base: number, min = 9): { text: string; size: number } {
  const size = fitFont(text, room, base, min);
  return { text: clip(text, room, size), size };
}
