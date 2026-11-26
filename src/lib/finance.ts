/** اسم الجلسة التي تمثّل دَينًا قديمًا (قبل استخدام التطبيق): تدخل في ذمة المريض ولا تُحسب كعلاج الشهر */
export const OPENING_PROCEDURE = "رصيد سابق";

export type FinPeriod = "day" | "week" | "month";

export const PERIOD_LABEL: Record<FinPeriod, string> = {
  day: "اليوم",
  week: "7 أيام",
  month: "هذا الشهر",
};

/** أول يوم في الفترة (YYYY-MM-DD)، وآخرها اليوم */
export function periodStart(p: FinPeriod, today: string, addDays: (iso: string, n: number) => string): string {
  if (p === "day") return today;
  if (p === "week") return addDays(today, -6);
  return `${today.slice(0, 7)}-01`;
}
