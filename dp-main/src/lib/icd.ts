/** رموز ICD-10 الشائعة في طب الأسنان (مختارة) */
export const ICD_DENTAL: Array<{ code: string; label: string }> = [
  { code: "K00.6", label: "مشاكل بزوغ الأسنان" },
  { code: "K01.1", label: "سن مطمور (مُنحشر)" },
  { code: "K02.0", label: "نخر محصور في المينا" },
  { code: "K02.1", label: "نخر العاج" },
  { code: "K02.2", label: "نخر الملاط" },
  { code: "K02.9", label: "نخر سني غير محدد" },
  { code: "K03.0", label: "سحل زائد للأسنان" },
  { code: "K03.1", label: "تآكل الأسنان (Abrasion)" },
  { code: "K03.2", label: "تحات الأسنان (Erosion)" },
  { code: "K03.8", label: "أمراض أخرى للنسج الصلبة" },
  { code: "K04.0", label: "التهاب لب السن" },
  { code: "K04.1", label: "نخر لب السن" },
  { code: "K04.4", label: "التهاب ذروة سنية حاد من أصل لبي" },
  { code: "K04.5", label: "التهاب ذروة سنية مزمن" },
  { code: "K04.6", label: "خراج سني مع ناسور" },
  { code: "K04.7", label: "خراج سني بلا ناسور" },
  { code: "K05.0", label: "التهاب لثة حاد" },
  { code: "K05.1", label: "التهاب لثة مزمن" },
  { code: "K05.3", label: "التهاب دواعم سن مزمن" },
  { code: "K06.0", label: "انحسار لثوي" },
  { code: "K07.3", label: "شذوذ وضع الأسنان (ازدحام/تباعد)" },
  { code: "K07.6", label: "اضطرابات المفصل الفكي الصدغي" },
  { code: "K08.1", label: "فقد أسنان بسبب حادث أو قلع" },
  { code: "K08.3", label: "جذر سني باقٍ" },
  { code: "S02.5", label: "كسر سن" },
];

/** مقارنة لقطتين لحالة الأسنان: الأسنان التي تغيّرت */
export function compareTeeth(
  before: Record<string, string>,
  after: Record<string, string>,
): Array<{ tooth: string; from: string; to: string }> {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const out: Array<{ tooth: string; from: string; to: string }> = [];
  for (const k of [...keys].sort((a, b) => Number(a) - Number(b))) {
    const a = before[k] ?? "healthy";
    const b = after[k] ?? "healthy";
    if (a !== b) out.push({ tooth: k, from: a, to: b });
  }
  return out;
}
