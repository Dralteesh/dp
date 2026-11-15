import type { Appointment, Patient, PlannerEvent, ShiftType } from "@/types";
import { addDays, minutesToTime, toMinutes, weekdayOf } from "@/lib/dates";

/** عنصر موحّد يظهر في جدول اليوم: حدث من التقويم أو موعد من العيادة الخاصة */
export type AgendaItem = {
  key: string;
  source: "event" | "appointment";
  refId: string;
  type: ShiftType;
  title: string;
  subtitle?: string;
  date: string;
  startTime: string;
  endTime: string;
  endsNextDay: boolean;
  /** تكملة مناوبة بدأت أمس */
  continuation?: boolean;
  status?: string;
};

export type AgendaInput = {
  events: PlannerEvent[];
  appointments: Appointment[];
  patients: Patient[];
};

/** هل يقع الحدث في هذا اليوم (مع حساب التكرار الأسبوعي)؟ */
export function occursOn(e: PlannerEvent, iso: string): boolean {
  if (e.repeat === "weekly") {
    if (iso < e.date) return false;
    if (e.repeatUntil && iso > e.repeatUntil) return false;
    return (e.weekdays ?? []).includes(weekdayOf(iso));
  }
  return e.date === iso;
}

export function agendaFor(iso: string, input: AgendaInput): AgendaItem[] {
  const items: AgendaItem[] = [];
  const yesterday = addDays(iso, -1);

  for (const e of input.events) {
    if (occursOn(e, iso)) {
      items.push({
        key: `e:${e.id}:${iso}`,
        source: "event",
        refId: e.id,
        type: e.type,
        title: e.title,
        subtitle: e.location,
        date: iso,
        startTime: e.startTime,
        endTime: e.endTime,
        endsNextDay: e.endsNextDay,
      });
    }
    if (e.endsNextDay && occursOn(e, yesterday)) {
      items.push({
        key: `e:${e.id}:${iso}:c`,
        source: "event",
        refId: e.id,
        type: e.type,
        title: e.title,
        subtitle: "تكملة من الأمس",
        date: iso,
        startTime: "00:00",
        endTime: e.endTime,
        endsNextDay: false,
        continuation: true,
      });
    }
  }

  const patientName = new Map(input.patients.map((p) => [p.id, p.name]));
  for (const a of input.appointments) {
    if (a.date !== iso || a.status === "cancelled" || a.status === "postponed") continue;
    items.push({
      key: `a:${a.id}`,
      source: "appointment",
      refId: a.id,
      type: "private",
      title: patientName.get(a.patientId) ?? "مريض",
      subtitle: a.procedure,
      date: iso,
      startTime: a.startTime,
      endTime: minutesToTime(toMinutes(a.startTime) + a.durationMin),
      endsNextDay: false,
      status: a.status,
    });
  }

  return items.sort((x, y) => toMinutes(x.startTime) - toMinutes(y.startTime));
}

/** الأنواع الموجودة في يوم معيّن (للنقاط الملوّنة في التقويم) */
export function typesOn(iso: string, input: AgendaInput): ShiftType[] {
  const set = new Set<ShiftType>();
  for (const it of agendaFor(iso, input)) set.add(it.type);
  return Array.from(set);
}
