import { fmtDateFull, fmtTime, toMinutes } from "@/lib/dates";
import type { Patient } from "@/types";
import type { PartOfDay, WaitEntry } from "@/types/extras";

export const PART_LABEL: Record<PartOfDay, string> = {
  any: "أي وقت",
  morning: "صباحًا",
  afternoon: "بعد الظهر",
  evening: "مساءً",
};

export function partOf(startTime: string): Exclude<PartOfDay, "any"> {
  const m = toMinutes(startTime);
  return m < 12 * 60 ? "morning" : m < 17 * 60 ? "afternoon" : "evening";
}

/** هل يناسب المدخل (انتظار/تم إشعاره) هذا الموعد الشاغر؟ */
export function entryFitsSlot(e: WaitEntry, date: string, startTime: string, today: string): boolean {
  if (e.status !== "waiting" && e.status !== "notified") return false;
  if (date < today) return false;
  if (e.date && date !== e.date) return false;
  if (e.from && date < e.from) return false;
  if (e.to && date > e.to) return false;
  if (e.part !== "any" && e.part !== partOf(startTime)) return false;
  return true;
}

export type WaitCandidate = { entry: WaitEntry; patient: Patient };

/** من يمكن مراسلته لموعد شاغر: الأقدم تسجيلًا أولًا، ولا يشمل صاحب الموعد الملغى */
export function slotCandidates(
  entries: WaitEntry[],
  patients: Patient[],
  slot: { date: string; startTime: string; excludePatientId?: string },
  today: string,
): WaitCandidate[] {
  const byId = new Map(patients.map((p) => [p.id, p]));
  const out: WaitCandidate[] = [];
  for (const entry of entries) {
    const patient = byId.get(entry.patientId);
    if (!patient || patient.id === slot.excludePatientId) continue;
    if (!entryFitsSlot(entry, slot.date, slot.startTime, today)) continue;
    out.push({ entry, patient });
  }
  return out.sort((a, b) => a.entry.createdAt - b.entry.createdAt);
}

export function slotMessage(patientName: string, date: string, startTime: string, clinicName?: string): string {
  return `السلام عليكم ${patientName}، توفّر موعد${clinicName ? ` في ${clinicName}` : ""} ${fmtDateFull(date)} الساعة ${fmtTime(
    startTime,
  )}. هل يناسبك؟ نرجو الرد بالتأكيد ليُحجز لك.`;
}

/** هل ينتظر المدخل يومًا بعينه (تاريخ محدد أو ضمن نطاقه)؟ المدخل بلا تاريخ لا يُعدّ لليوم بالذات */
export function entryWantsDay(e: WaitEntry, day: string): boolean {
  if (e.status !== "waiting" && e.status !== "notified") return false;
  if (e.date) return e.date === day;
  if (e.from || e.to) return (!e.from || day >= e.from) && (!e.to || day <= e.to);
  return false;
}

/** منتظرو يوم معيّن: من يريد هذا اليوم أولًا، ثم باقي المنتظرين (الأقدم تسجيلًا أولًا) */
export function waitersForDay(
  entries: WaitEntry[],
  patients: Patient[],
  day: string,
): { forDay: WaitCandidate[]; others: WaitCandidate[] } {
  const byId = new Map(patients.map((p) => [p.id, p]));
  const forDay: WaitCandidate[] = [];
  const others: WaitCandidate[] = [];
  for (const entry of entries) {
    if (entry.status !== "waiting" && entry.status !== "notified") continue;
    const patient = byId.get(entry.patientId);
    if (!patient) continue;
    (entryWantsDay(entry, day) ? forDay : others).push({ entry, patient });
  }
  const byAge = (a: WaitCandidate, b: WaitCandidate) => a.entry.createdAt - b.entry.createdAt;
  return { forDay: forDay.sort(byAge), others: others.sort(byAge) };
}
