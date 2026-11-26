/** دمج المزامنة (منطق نقي) */
export type Item = { id: string; [k: string]: any };

/** تحويل ثابت الترتيب: jsonb في Postgres لا يحفظ ترتيب المفاتيح */
export function stable(v: any): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v)
      .filter((k) => v[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(v[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v);
}

/**
 * دمج ثلاثي حقلًا بحقل: base = آخر نسخة متزامنة، mine = المحلي، theirs = السحابة.
 * - حقل غيّره جهة واحدة فقط: يُؤخذ تغييره (فلا يضيع تعديل الجهاز الآخر).
 * - حقل غيّره الطرفان بقيمتين مختلفتين: يفوز المحلي (الأحدث فعليًا عند الرفع). المصفوفات والكائنات المتداخلة تُعامل كقيمة واحدة.
 */
export function mergeItems(base: Item, mine: Item, theirs: Item): { merged: Item; conflicts: string[] } {
  const merged: Item = { id: mine.id };
  const conflicts: string[] = [];
  const keys = new Set([...Object.keys(base), ...Object.keys(mine), ...Object.keys(theirs)]);
  keys.delete("id");
  for (const k of keys) {
    const b = stable(base[k]);
    const m = stable(mine[k]);
    const t = stable(theirs[k]);
    let v: any;
    if (m === t) v = mine[k];
    else if (m === b) v = theirs[k];
    else if (t === b) v = mine[k];
    else {
      v = mine[k];
      conflicts.push(k);
    }
    if (v !== undefined) merged[k] = v;
  }
  return { merged, conflicts };
}
