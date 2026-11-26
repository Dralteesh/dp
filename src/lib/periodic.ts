/**
 * المتابعة الدورية: قواعد لكل مريض (Patient.followUps). تستحق بعد everyDays من آخر زيارة مطابقة.
 * الزيارة المطابقة: موعد تمّ/حضر أو جلسة، إجراؤها يطابق matchSource (أو أي زيارة إن غاب).
 */
import { addDays } from "@/lib/dates";
import type { Appointment, ClinicSession, FollowUpRule, Patient } from "@/types";
import type { PatientTypeKey } from "@/lib/patientType";

export type RuleTemplate = { label: string; everyDays: number; matchSource?: string; types?: PatientTypeKey[] };

export const RULE_TEMPLATES: RuleTemplate[] = [
  { label: "مراجعة تقويم", everyDays: 35, matchSource: "تقويم|ortho", types: ["ortho"] },
  { label: "مراجعة زرع", everyDays: 180, matchSource: "زرع|implant", types: ["implant"] },
  { label: "فلورايد وسدّ وقائي", everyDays: 180, matchSource: "فلورايد|سد|sealant", types: ["pedo"] },
  { label: "تنظيف وتلميع", everyDays: 180, matchSource: "تنظيف|تلميع|جير" },
  { label: "فحص دوري", everyDays: 180 },
  { label: "متابعة لثة", everyDays: 90, matchSource: "لثة|perio|تنظيف" },
];

export type DueRow = {
  key: string;
  patient: Patient;
  rule: FollowUpRule;
  /** آخر زيارة مطابقة أو anchor */
  last: string;
  due: string;
  /** سالب = متأخر */
  daysLeft: number;
  hasUpcoming: boolean;
};

const dayDiff = (a: string, b: string) => Math.round((new Date(a + "T00:00:00").getTime() - new Date(b + "T00:00:00").getTime()) / 86_400_000);

function safeRx(src: string | undefined): RegExp | null {
  if (!src) return null;
  try {
    return new RegExp(src, "i");
  } catch {
    return null;
  }
}

export function lastMatching(rule: FollowUpRule, patientId: string, sessions: ClinicSession[], appts: Appointment[], today: string): string {
  const rx = safeRx(rule.matchSource);
  let last = rule.anchor;
  const ok = (proc: string) => !rx || rx.test(proc);
  for (const s of sessions) if (s.patientId === patientId && s.date <= today && s.date > last && ok(s.procedure)) last = s.date;
  for (const a of appts)
    if (a.patientId === patientId && (a.status === "done" || a.status === "arrived") && a.date <= today && a.date > last && ok(a.procedure)) last = a.date;
  return last;
}

/** المتابعات الدورية المستحقة خلال windowDays (تشمل المتأخرة) */
export function dueFollowUps(i: {
  patients: Patient[];
  sessions: ClinicSession[];
  appointments: Appointment[];
  today: string;
  windowDays: number;
}): DueRow[] {
  const out: DueRow[] = [];
  for (const p of i.patients) {
    if (p.status !== "active") continue;
    for (const rule of p.followUps ?? []) {
      if (!rule.active) continue;
      const last = lastMatching(rule, p.id, i.sessions, i.appointments, i.today);
      const due = addDays(last, rule.everyDays);
      const daysLeft = dayDiff(due, i.today);
      if (daysLeft > i.windowDays) continue;
      const rx = safeRx(rule.matchSource);
      const hasUpcoming = i.appointments.some(
        (a) => a.patientId === p.id && a.status === "scheduled" && a.date >= i.today && (!rx || rx.test(a.procedure)),
      );
      out.push({ key: `${p.id}:${rule.id}`, patient: p, rule, last, due, daysLeft, hasUpcoming });
    }
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

export function periodLabel(days: number): string {
  if (days % 30 === 0) {
    const m = days / 30;
    return m === 1 ? "كل شهر" : m === 2 ? "كل شهرين" : m <= 10 ? `كل ${m} أشهر` : `كل ${m} شهرًا`;
  }
  if (days % 7 === 0) {
    const w = days / 7;
    return w === 1 ? "كل أسبوع" : w === 2 ? "كل أسبوعين" : `كل ${w} أسابيع`;
  }
  return `كل ${days} يومًا`;
}
