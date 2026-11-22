import type { Appointment, ClinicSession, Patient } from "@/types";

type Range = { from: string; to: string };
const inR = (d: string, r: Range | null) => !r || (d >= r.from && d <= r.to);

export type Count = { key: string; n: number; sum: number };

/** أكثر الإجراءات تنفيذًا مع مجموع تكلفتها */
export function topProcedures(sessions: ClinicSession[], r: Range | null, limit = 8): Count[] {
  const m = new Map<string, Count>();
  for (const s of sessions) {
    if (!inR(s.date, r)) continue;
    const c = m.get(s.procedure) ?? { key: s.procedure, n: 0, sum: 0 };
    c.n++;
    c.sum += s.cost;
    m.set(s.procedure, c);
  }
  return [...m.values()].sort((a, b) => b.n - a.n || b.sum - a.sum).slice(0, limit);
}

/** أكثر الأسنان معالجة (الجلسات التي ذُكر فيها رقم سن) */
export function topTeeth(sessions: ClinicSession[], r: Range | null, limit = 8): Count[] {
  const m = new Map<string, Count>();
  for (const s of sessions) {
    const t = s.tooth?.trim();
    if (!t || !inR(s.date, r)) continue;
    const c = m.get(t) ?? { key: t, n: 0, sum: 0 };
    c.n++;
    c.sum += s.cost;
    m.set(t, c);
  }
  return [...m.values()].sort((a, b) => b.n - a.n).slice(0, limit);
}

/** عدد المواعيد المنجزة لكل يوم أسبوع (0 = الأحد) */
export function weekdayCounts(appts: Appointment[], r: Range | null): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0];
  for (const a of appts) {
    if (a.status !== "done" && a.status !== "arrived") continue;
    if (!inR(a.date, r)) continue;
    out[new Date(a.date + "T12:00:00").getDay()]++;
  }
  return out;
}

const BUCKETS: Array<[string, number, number]> = [
  ["أقل من 12", 0, 11],
  ["12–17", 12, 17],
  ["18–30", 18, 30],
  ["31–45", 31, 45],
  ["46–60", 46, 60],
  ["أكبر من 60", 61, 200],
];

export function ageBuckets(patients: Patient[], year = new Date().getFullYear()): Array<{ label: string; n: number }> {
  const out = BUCKETS.map(([label]) => ({ label, n: 0 }));
  let unknown = 0;
  for (const p of patients) {
    if (!p.birthYear) {
      unknown++;
      continue;
    }
    const age = year - p.birthYear;
    const i = BUCKETS.findIndex(([, lo, hi]) => age >= lo && age <= hi);
    if (i >= 0) out[i].n++;
  }
  if (unknown) out.push({ label: "غير مسجّل", n: unknown });
  return out;
}

export function genderCounts(patients: Patient[]) {
  return {
    male: patients.filter((p) => p.gender === "male").length,
    female: patients.filter((p) => p.gender === "female").length,
    unknown: patients.filter((p) => !p.gender).length,
  };
}

/** نسبة عدم الحضور من المواعيد المحسومة (منجز + لم يحضر) */
export function noShowRate(appts: Appointment[], r: Range | null) {
  let done = 0;
  let missed = 0;
  for (const a of appts) {
    if (!inR(a.date, r)) continue;
    if (a.status === "done" || a.status === "arrived") done++;
    else if (a.status === "no_show") missed++;
  }
  const total = done + missed;
  return { done, missed, rate: total ? missed / total : 0 };
}

/** تقسيم المقبوض: حصة الطبيب والمواد (نسب مئوية من المقبوض) والباقي للعيادة */
export function splitIncome(collected: number, doctorPct: number, materialsPct: number) {
  const d = Math.max(0, Math.min(100, doctorPct));
  const m = Math.max(0, Math.min(100 - d, materialsPct));
  const doctor = Math.round((collected * d) / 100);
  const materials = Math.round((collected * m) / 100);
  return { doctor, materials, clinic: collected - doctor - materials };
}
