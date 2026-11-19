import type { ForeignAmount } from "@/types";

export type Cur = "base" | "usd";

/** يحوّل مبلغًا بالدولار إلى عملة العيادة بسعر الصرف */
export function toBase(usd: number, rate: number): number {
  return Math.round(usd * rate);
}

/** نتيجة حقل المبلغ: amount بعملة العيادة، وforeign إن أُدخل بالدولار. يعيد null إن كان الإدخال غير صالح */
export function makeMoney(cur: Cur, value: number, rate: number): { amount: number; foreign?: ForeignAmount } | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  if (cur === "base") return { amount: Math.round(value), foreign: undefined };
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return { amount: toBase(value, rate), foreign: { currency: "USD", amount: value, rate } };
}

/** 1250.5 -> "$1,250.5" */
export function fmtUsd(n: number): string {
  const r = Math.round(n * 100) / 100;
  const [i, d] = String(r).split(".");
  return `$${i.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${d ? "." + d : ""}`;
}

/** مجموع ما سُجّل بالدولار */
export function sumUsd(items: { foreign?: ForeignAmount }[]): number {
  return items.reduce((a, x) => a + (x.foreign?.currency === "USD" ? x.foreign.amount : 0), 0);
}

/** وصف مختصر: «$50 × 14,000» */
export function foreignLabel(f: ForeignAmount): string {
  return `${fmtUsd(f.amount)} × ${String(Math.round(f.rate)).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

/** سعر بند من قائمة الأسعار بعملة العيادة */
export function priceInBase(item: { price: number; currency: "base" | "USD" }, rate: number): number | null {
  if (item.currency === "base") return Math.round(item.price);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return toBase(item.price, rate);
}
