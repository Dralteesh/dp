import type { Appointment, ClinicSession } from "@/types";

/** آخر إجراء للمريض: من آخر موعد (غير ملغى) أو آخر جلسة، أيّهما أحدث؛ وإلا undefined */
export function lastProcedure(patientId: string, appointments: Appointment[], sessions: ClinicSession[]): string | undefined {
  let best: { key: string; proc: string } | undefined;
  for (const a of appointments) {
    if (a.patientId !== patientId || a.status === "cancelled" || !a.procedure) continue;
    const key = `${a.date} ${a.startTime}`;
    if (!best || key > best.key) best = { key, proc: a.procedure };
  }
  for (const s of sessions) {
    if (s.patientId !== patientId || !s.procedure) continue;
    const key = `${s.date} 23:59`;
    if (!best || key > best.key) best = { key, proc: s.procedure };
  }
  return best?.proc;
}
