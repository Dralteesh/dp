import { addDays, fromISO, toISO } from "@/lib/dates";
import type { Appointment, ClinicSession, Expense, Patient, Payment } from "@/types";

export type Period = "today" | "week" | "month" | "year";

/** حدود الفترة [from, to] بصيغة YYYY-MM-DD (الأسبوع يبدأ السبت) */
export function periodRange(p: Period, now: Date = new Date()): { from: string; to: string } {
  const today = toISO(now);
  if (p === "today") return { from: today, to: today };
  if (p === "week") {
    const back = (now.getDay() + 1) % 7; // السبت = 0
    return { from: addDays(today, -back), to: addDays(today, 6 - back) };
  }
  if (p === "month") {
    const y = now.getFullYear();
    const m = now.getMonth();
    return { from: toISO(new Date(y, m, 1)), to: toISO(new Date(y, m + 1, 0)) };
  }
  return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
}

const inRange = (d: string, r: { from: string; to: string }) => d >= r.from && d <= r.to;

export type Report = {
  collected: number; // المقبوض
  expenses: number; // المصاريف
  net: number; // الصافي = المقبوض - المصاريف
  expensesByCategory: { category: string; total: number }[];
  charged: number; // المستحق من الجلسات
  paymentsCount: number;
  sessionsCount: number;
  appointments: Record<"done" | "no_show" | "cancelled" | "other", number>;
  byProcedure: { name: string; count: number; total: number }[];
  /** أعمدة الرسم: مقبوضات لكل يوم (أسبوع/شهر) أو لكل شهر (سنة) */
  series: { label: string; value: number }[];
  newPatients: number;
};

export function buildReport(
  p: Period,
  data: { sessions: ClinicSession[]; payments: Payment[]; appointments: Appointment[]; patients: Patient[]; expenses?: Expense[] },
  now: Date = new Date(),
): Report {
  const r = periodRange(p, now);
  const pays = data.payments.filter((x) => inRange(x.date, r));
  const sess = data.sessions.filter((x) => inRange(x.date, r));
  const appts = data.appointments.filter((x) => inRange(x.date, r));

  const proc = new Map<string, { count: number; total: number }>();
  for (const s of sess) {
    const k = s.procedure.trim() || "غير محدد";
    const cur = proc.get(k) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += s.cost;
    proc.set(k, cur);
  }

  const series: Report["series"] = [];
  if (p === "year") {
    for (let m = 0; m < 12; m++) {
      const key = `${now.getFullYear()}-${String(m + 1).padStart(2, "0")}`;
      series.push({
        label: String(m + 1),
        value: pays.filter((x) => x.date.startsWith(key)).reduce((a, x) => a + x.amount, 0),
      });
    }
  } else {
    for (let d = r.from; d <= r.to; d = addDays(d, 1)) {
      series.push({
        label: String(fromISO(d).getDate()),
        value: pays.filter((x) => x.date === d).reduce((a, x) => a + x.amount, 0),
      });
    }
  }

  const a = { done: 0, no_show: 0, cancelled: 0, other: 0 };
  for (const x of appts) {
    if (x.status === "done") a.done++;
    else if (x.status === "no_show") a.no_show++;
    else if (x.status === "cancelled") a.cancelled++;
    else a.other++;
  }

  const exps = (data.expenses ?? []).filter((x) => inRange(x.date, r));
  const expTotal = exps.reduce((s, x) => s + x.amount, 0);
  const byCat = new Map<string, number>();
  for (const x of exps) byCat.set(x.category, (byCat.get(x.category) ?? 0) + x.amount);
  const collected = pays.reduce((s, x) => s + x.amount, 0);

  const from = fromISO(r.from).getTime();
  const to = fromISO(r.to).getTime() + 86_400_000;
  return {
    collected,
    expenses: expTotal,
    net: collected - expTotal,
    expensesByCategory: [...byCat.entries()].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total),
    charged: sess.reduce((s, x) => s + x.cost, 0),
    paymentsCount: pays.length,
    sessionsCount: sess.length,
    appointments: a,
    byProcedure: [...proc.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((x, y) => y.total - x.total)
      .slice(0, 8),
    series,
    newPatients: data.patients.filter((x) => x.createdAt >= from && x.createdAt < to).length,
  };
}

/** أكبر الذمم: المرضى الذين عليهم رصيد (مستحق - مدفوع) > 0 */
export function topDebtors(
  patients: Patient[],
  sessions: ClinicSession[],
  payments: Payment[],
  limit = 8,
): { patient: Patient; balance: number }[] {
  const bal = new Map<string, number>();
  for (const s of sessions) bal.set(s.patientId, (bal.get(s.patientId) ?? 0) + s.cost);
  for (const p of payments) bal.set(p.patientId, (bal.get(p.patientId) ?? 0) - p.amount);
  return patients
    .map((patient) => ({ patient, balance: bal.get(patient.id) ?? 0 }))
    .filter((x) => x.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, limit);
}
