const PALETTE = ["#2563EB", "#16A34A", "#D97706", "#DC2626", "#7C3AED", "#0891B2", "#DB2777", "#65A30D"];

/** لون ثابت لكل وسم حسب اسمه */
export function tagColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** يحوّل نص الإدخال (فاصلة أو سطر) إلى قائمة وسوم فريدة */
export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  for (const t of raw.split(/[,،\n]/)) {
    const v = t.trim().slice(0, 24);
    if (v) seen.add(v);
  }
  return [...seen].slice(0, 8);
}
