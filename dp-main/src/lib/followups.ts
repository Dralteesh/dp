import { addDays, toISO } from "@/lib/dates";
import type { Appointment, ClinicSession, Patient } from "@/types";

/** مواعيد يوم معيّن التي ما زالت مجدولة، مرتبة بالوقت */
export function appointmentsOn(appts: Appointment[], date: string): Appointment[] {
  return appts
    .filter((a) => a.date === date && a.status === "scheduled")
    .sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
}

/** تاريخ آخر زيارة فعلية: آخر جلسة أو موعد تمّ/حضر، وإلا تاريخ فتح الملف */
export function lastVisit(patient: Patient, sessions: ClinicSession[], appts: Appointment[], today: string): string {
  let last = toISO(new Date(patient.createdAt));
  for (const s of sessions) if (s.patientId === patient.id && s.date <= today && s.date > last) last = s.date;
  for (const a of appts)
    if (a.patientId === patient.id && (a.status === "done" || a.status === "arrived") && a.date <= today && a.date > last)
      last = a.date;
  return last;
}

/** ما قبل أشهر: يطرح months أشهر من تاريخ (مع ضبط نهاية الشهر) */
export function monthsAgo(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1 - months, 1);
  const last = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
  dt.setDate(Math.min(d, last));
  return toISO(dt);
}

export type Recall = { patient: Patient; last: string; daysSince: number };

/**
 * مرضى لم يزوروا منذ months أشهر أو أكثر، ولا موعد قادم لهم، ولهم رقم هاتف.
 * الأقدم زيارةً أولًا. المرضى الذين راسلناهم خلال muteDays يُخفون.
 */
export function recallCandidates(
  patients: Patient[],
  sessions: ClinicSession[],
  appts: Appointment[],
  months: number,
  now: Date = new Date(),
  muteDays = 30,
): Recall[] {
  const today = toISO(now);
  const cutoff = monthsAgo(today, months);
  const upcoming = new Set(appts.filter((a) => a.date >= today && a.status === "scheduled").map((a) => a.patientId));
  const out: Recall[] = [];
  for (const p of patients) {
    if (!p.phone?.trim() || upcoming.has(p.id)) continue;
    if (p.recalledAt && now.getTime() - p.recalledAt < muteDays * 86_400_000) continue;
    const last = lastVisit(p, sessions, appts, today);
    if (last > cutoff) continue;
    const daysSince = Math.round((new Date(today).getTime() - new Date(last).getTime()) / 86_400_000);
    out.push({ patient: p, last, daysSince });
  }
  return out.sort((a, b) => (a.last < b.last ? -1 : 1));
}

export { addDays };
