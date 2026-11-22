import { occursOn } from "@/lib/agenda";
import { pad } from "@/lib/dates";
import { buildReport } from "@/lib/reports";
import { eventHours } from "@/lib/shiftPatterns";
import type { Appointment, ClinicSession, Expense, Patient, Payment, PlannerEvent, ShiftType } from "@/types";

export type ShiftStats = { type: ShiftType; count: number; hours: number; rate: number; pay: number };

export type MonthIncome = {
  /** YYYY-MM */
  month: string;
  salary: number;
  /** الأنواع المأجورة (المشفى، المناوبة، أماكن العمل المضافة) التي لها أيام أو أجر محدد */
  shifts: ShiftStats[];
  personal: { count: number; hours: number };
  clinic: { collected: number; expenses: number; net: number };
  /** الراتب + أجور الدوامات والمناوبات + صافي العيادة */
  total: number;
};

/** أنواع لا تُحسب أجرًا: العيادة الخاصة (دخلها من الدفعات) والأنشطة الشخصية */
const NO_PAY = new Set<string>(["private", "personal"]);

export type IncomeInput = {
  events: PlannerEvent[];
  sessions: ClinicSession[];
  payments: Payment[];
  appointments: Appointment[];
  patients: Patient[];
  expenses: Expense[];
};

export type IncomeSettings = { payRates: Partial<Record<ShiftType, number>>; monthlySalary: number };

/** month: "YYYY-MM" */
export function monthIncome(month: string, data: IncomeInput, st: IncomeSettings): MonthIncome {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  const stats = new Map<string, { count: number; hours: number }>();
  for (let d = 1; d <= last; d++) {
    const iso = `${y}-${pad(m)}-${pad(d)}`;
    for (const e of data.events) {
      if (!occursOn(e, iso)) continue;
      const cur = stats.get(e.type) ?? { count: 0, hours: 0 };
      cur.count += 1;
      cur.hours += eventHours(e);
      stats.set(e.type, cur);
    }
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  const shifts: ShiftStats[] = [];
  for (const [t, c] of stats) {
    if (NO_PAY.has(t)) continue;
    const rate = Math.max(0, st.payRates[t as ShiftType] ?? 0);
    shifts.push({ type: t as ShiftType, count: c.count, hours: round(c.hours), rate, pay: rate * c.count });
  }
  // الأنواع التي لها أجر محدد ولا أيام هذا الشهر تظهر أيضًا (لتعديل الأجر)
  for (const [t, r] of Object.entries(st.payRates)) {
    if (NO_PAY.has(t) || stats.has(t) || !r) continue;
    shifts.push({ type: t as ShiftType, count: 0, hours: 0, rate: r, pay: 0 });
  }
  shifts.sort((a, b) => a.type.localeCompare(b.type));
  const p = stats.get("personal") ?? { count: 0, hours: 0 };

  const rep = buildReport("month", data, new Date(y, m - 1, 15));
  const salary = Math.max(0, st.monthlySalary || 0);
  return {
    month,
    salary,
    shifts,
    personal: { count: p.count, hours: round(p.hours) },
    clinic: { collected: rep.collected, expenses: rep.expenses, net: rep.net },
    total: salary + shifts.reduce((a, x) => a + x.pay, 0) + rep.net,
  };
}

/** شهر YYYY-MM مضافًا إليه n أشهر */
export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** آخر n أشهر تنتهي بالشهر المعطى (الأقدم أولًا) */
export function incomeSeries(endMonth: string, n: number, data: IncomeInput, st: IncomeSettings): MonthIncome[] {
  return Array.from({ length: n }, (_, i) => monthIncome(shiftMonth(endMonth, i - (n - 1)), data, st));
}


