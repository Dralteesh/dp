/** تقرير الربح الشهري (دوال نقية). المقبوض صافٍ بعد الاستردادات؛ الربح = المقبوض − المصاريف. */
import { EXPENSE_CATEGORIES } from "@/constants/clinic";
import { MONTHS } from "@/constants/arabic";
import { OPENING_PROCEDURE } from "@/lib/finance";
import type { ClinicSession, Expense, Patient, Payment, TreatmentPlan } from "@/types";

export type ProfitReport = {
  month: string;
  collected: number;
  refunds: number;
  charged: number;
  expenses: number;
  net: number;
  expenseByCat: { cat: string; total: number }[];
  byProcedure: { name: string; count: number; total: number }[];
  byPlan: { patient: string; title: string; collected: number; expenses: number; profit: number }[];
};

export const monthLabel = (month: string): string => {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS[(m || 1) - 1]} ${y}`;
};

export const shiftMonth = (month: string, delta: number): string => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export function buildProfit(
  month: string,
  data: { sessions: ClinicSession[]; payments: Payment[]; expenses: Expense[]; plans: TreatmentPlan[]; patients: Patient[] },
): ProfitReport {
  const inM = (d: string) => d.startsWith(month);
  const pays = data.payments.filter((p) => inM(p.date));
  const sess = data.sessions.filter((s) => inM(s.date) && s.procedure !== OPENING_PROCEDURE);
  const exps = data.expenses.filter((e) => inM(e.date));

  const collected = pays.reduce((a, p) => a + p.amount, 0);
  const refunds = pays.filter((p) => p.amount < 0).reduce((a, p) => a + Math.abs(p.amount), 0);
  const charged = sess.reduce((a, s) => a + s.cost, 0);
  const expenses = exps.reduce((a, e) => a + e.amount, 0);

  const cat = new Map<string, number>();
  for (const e of exps) cat.set(e.category, (cat.get(e.category) ?? 0) + e.amount);
  const proc = new Map<string, { count: number; total: number }>();
  for (const s of sess) {
    const cur = proc.get(s.procedure) ?? { count: 0, total: 0 };
    proc.set(s.procedure, { count: cur.count + 1, total: cur.total + s.cost });
  }
  const names = new Map(data.patients.map((p) => [p.id, p.name]));
  const byPlan = data.plans
    .map((pl) => {
      const c = pays.filter((p) => p.planId === pl.id).reduce((a, p) => a + p.amount, 0);
      const x = exps.filter((e) => e.planId === pl.id).reduce((a, e) => a + e.amount, 0);
      return { patient: names.get(pl.patientId) ?? "مريض", title: pl.title, collected: c, expenses: x, profit: c - x };
    })
    .filter((r) => r.collected !== 0 || r.expenses !== 0)
    .sort((a, b) => b.profit - a.profit);

  return {
    month,
    collected,
    refunds,
    charged,
    expenses,
    net: collected - expenses,
    expenseByCat: [...cat.entries()].map(([c, total]) => ({ cat: EXPENSE_CATEGORIES[c as keyof typeof EXPENSE_CATEGORIES] ?? c, total })).sort((a, b) => b.total - a.total),
    byProcedure: [...proc.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total),
    byPlan,
  };
}
