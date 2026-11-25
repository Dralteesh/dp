import type { AgendaInput } from "@/lib/agenda";
import { findClashes } from "@/lib/conflicts";
import { addDays, minutesToTime } from "@/lib/dates";
import type { Appointment } from "@/types";

/**
 * أقرب وقت فارغ (خطوة 15 د، بين 09:00 و20:00) لموعد تلقائي، الأقرب إلى wantMin.
 * يتجنب كل التعارضات (مواعيد، دوام، مناوبات). يجرّب اليوم المقترح ثم الأيام التالية حتى spanDays.
 * يُرجع null إن لم يجد، فلا يُنشأ الموعد ويُعاد المحاولة لاحقًا.
 */
export function findFreeSlot(
  date: string,
  dur: number,
  input: AgendaInput,
  extra: Appointment[] = [],
  wantMin = 10 * 60,
  spanDays = 7,
): { date: string; startTime: string } | null {
  const merged: AgendaInput = { ...input, appointments: [...input.appointments, ...extra] };
  for (let d = 0; d <= spanDays; d++) {
    const day = addDays(date, d);
    let best: number | null = null;
    for (let m = 9 * 60; m + dur <= 20 * 60; m += 15) {
      if (findClashes(day, minutesToTime(m), dur, merged).length) continue;
      if (best == null || Math.abs(m - wantMin) < Math.abs(best - wantMin)) best = m;
    }
    if (best != null) return { date: day, startTime: minutesToTime(best) };
  }
  return null;
}
