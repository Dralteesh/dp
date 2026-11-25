import { DEFAULT_PROCEDURES } from "@/constants/clinic";
import { norm } from "@/lib/alerts";
import type { ProcedureDef, ProcedureIcon } from "@/types";

/** الأيقونة الاحتياطية عند عدم وجود مطابقة */
export const GENERIC_ICON: ProcedureIcon = { kind: "ionicon", name: "medical" };

export function procedureList(custom: ProcedureDef[] | null | undefined): ProcedureDef[] {
  return custom && custom.length ? custom : DEFAULT_PROCEDURES;
}

/**
 * يطابق اسم إجراء حرًّا مع الكتالوج: اسم مطابق تمامًا أولًا، ثم أطول كلمة مفتاحية موجودة في النص
 * (بعد تطبيع عربي: توحيد الألف والتاء المربوطة وإزالة التشكيل).
 */
export function matchProcedure(name: string | undefined, list: ProcedureDef[]): ProcedureDef | null {
  const t = norm((name ?? "").trim());
  if (!t) return null;
  const exact = list.find((p) => norm(p.name) === t);
  if (exact) return exact;
  let best: { p: ProcedureDef; len: number } | null = null;
  for (const p of list) {
    for (const kw of [p.name, ...p.keywords]) {
      const k = norm(kw.trim());
      if (k.length < 2) continue;
      if (t.includes(k) && (!best || k.length > best.len)) best = { p, len: k.length };
    }
  }
  return best?.p ?? null;
}

export function procedureIcon(name: string | undefined, list: ProcedureDef[]): ProcedureIcon {
  return matchProcedure(name, list)?.icon ?? GENERIC_ICON;
}
