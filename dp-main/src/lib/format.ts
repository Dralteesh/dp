const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";

/** يحوّل الأرقام العربية (٠١٢) إلى لاتينية (012) */
export function toWesternDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)));
}

/** يقرأ رقمًا من نص حرّ (يدعم الأرقام العربية). يعيد 0 إن لم يكن رقمًا. */
export function parseAmount(s: string): number {
  const n = Number(toWesternDigits(s).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** 1250000 -> "1,250,000 ل.س" */
export function fmtMoney(n: number, currency: string): string {
  const grouped = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${grouped} ${currency}`;
}

/** أول حرف من الاسم (للأفاتار) */
export function initial(name: string): string {
  return name.trim().charAt(0) || "؟";
}
