import { agendaFor, type AgendaInput, type AgendaItem } from "@/lib/agenda";
import { addDays, endDayWord, fmtTime, spanDaysOf, toMinutes, weekdayOf } from "@/lib/dates";
import type { PlannerEvent } from "@/types";

export type Clash = { date: string; item: AgendaItem };

/** مجال العنصر بالدقائق ضمن يومه [بداية، نهاية) */
export function itemInterval(it: AgendaItem): [number, number] {
  const s = toMinutes(it.startTime);
  let e = it.endsNextDay ? 1440 : toMinutes(it.endTime);
  if (e <= s) e = it.endsNextDay ? 1440 : s + 1;
  return [s, e];
}

const overlap = (a: [number, number], b: [number, number]) => a[0] < b[1] && b[0] < a[1];

type Ignore = { appointmentId?: string; eventId?: string };

/** عناصر اليوم التي تتقاطع مع مجال [s, e) (تتجاهل الملغى والمؤجل ولم يحضر) */
function clashesInDay(date: string, seg: [number, number], input: AgendaInput, ignore: Ignore): Clash[] {
  const out: Clash[] = [];
  const skipStatus = new Set(["no_show"]);
  for (const it of agendaFor(date, input)) {
    if (it.source === "appointment" && it.refId === ignore.appointmentId) continue;
    if (it.source === "event" && it.refId === ignore.eventId) continue;
    if (it.source === "appointment" && it.status && skipStatus.has(it.status)) continue;
    if (overlap(seg, itemInterval(it))) out.push({ date, item: it });
  }
  return out;
}

/** تعارضات موعد (تاريخ + وقت + مدة) مع كل ما في الجدول: مواعيد، دوام، مناوبات، أنشطة */
export function findClashes(
  date: string,
  startTime: string,
  durationMin: number,
  input: AgendaInput,
  ignore: Ignore = {},
): Clash[] {
  const s = toMinutes(startTime);
  const e = s + Math.max(1, durationMin);
  const out = clashesInDay(date, [s, Math.min(e, 1440)], input, ignore);
  if (e > 1440) out.push(...clashesInDay(addDays(date, 1), [0, e - 1440], input, ignore));
  return out.sort((a, b) => (a.date + a.item.startTime < b.date + b.item.startTime ? -1 : 1));
}

type EventShape = Pick<PlannerEvent, "date" | "startTime" | "endTime" | "endsNextDay" | "extraDays" | "repeat" | "weekdays" | "repeatUntil">;

/** التواريخ التي سيقع فيها الحدث (حتى أفق محدد للتكرار الأسبوعي) */
export function eventDates(ev: EventShape, horizonDays = 60): string[] {
  if (ev.repeat !== "weekly") return [ev.date];
  const out: string[] = [];
  for (let i = 0; i <= horizonDays; i++) {
    const d = addDays(ev.date, i);
    if (ev.repeatUntil && d > ev.repeatUntil) break;
    if ((ev.weekdays ?? []).includes(weekdayOf(d))) out.push(d);
  }
  return out;
}

/** تعارضات حدث جديد/معدّل مع المواعيد والأحداث الأخرى */
export function eventClashes(ev: EventShape, input: AgendaInput, ignoreEventId?: string, horizonDays = 60): Clash[] {
  const s = toMinutes(ev.startTime);
  const span = spanDaysOf(ev);
  const e = span >= 1 ? 1440 : Math.max(toMinutes(ev.endTime), s + 1);
  const out: Clash[] = [];
  for (const d of eventDates(ev, horizonDays)) {
    out.push(...clashesInDay(d, [s, e], input, { eventId: ignoreEventId }));
    for (let k = 1; k <= span; k++) {
      const end = k === span ? toMinutes(ev.endTime) : 1440;
      if (end > 0) out.push(...clashesInDay(addDays(d, k), [0, end], input, { eventId: ignoreEventId }));
    }
  }
  // إزالة التكرار (نفس العنصر قد يظهر من يومين)
  const seen = new Set<string>();
  return out.filter((c) => (seen.has(c.item.key) ? false : (seen.add(c.item.key), true)));
}

/** سطر وصف: «دوام المشفى 8:00 ص – 2:00 م» */
export function describeClash(c: Clash): string {
  const it = c.item;
  const who = it.source === "appointment" ? `موعد ${it.title}` : it.title;
  const end = it.endsNextDay ? `${endDayWord(it.extraDays ?? 1)} ${fmtTime(it.endTime)}` : fmtTime(it.endTime);
  return `${who} ${fmtTime(it.startTime)} – ${end}`;
}

/** رسالة مختصرة لعدة تعارضات */
export function summarizeClashes(list: Clash[], max = 3): string {
  const lines = list.slice(0, max).map((c) => `• ${c.date.slice(5)}: ${describeClash(c)}`);
  if (list.length > max) lines.push(`• و${list.length - max} أخرى`);
  return lines.join("\n");
}
