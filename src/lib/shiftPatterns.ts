import { addDays, fromISO, pad, spanDaysOf, toMinutes } from "@/lib/dates";
import { uid } from "@/lib/id";
import type { PlannerEvent } from "@/types";

/** كل n أيام ابتداءً من تاريخ، لعدد مرات محدد (مثال: مناوبة كل 4 أيام) */
export function cycleDates(start: string, everyDays: number, count: number): string[] {
  const step = Math.max(1, Math.floor(everyDays));
  const n = Math.max(0, Math.min(Math.floor(count), 120));
  return Array.from({ length: n }, (_, i) => addDays(start, i * step));
}

/** كل أيام شهر معيّن (month: 0..11) */
export function monthDates(year: number, month: number): string[] {
  const last = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: last }, (_, i) => `${year}-${pad(month + 1)}-${pad(i + 1)}`);
}

/** أيام الأسبوع المحددة داخل مجال تاريخ (0=الأحد..6=السبت) */
export function weekdayDates(from: string, to: string, weekdays: number[]): string[] {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < 400; d = addDays(d, 1)) {
    if (weekdays.includes(fromISO(d).getDay())) out.push(d);
  }
  return out;
}

export type ShiftTemplate = Pick<
  PlannerEvent,
  "type" | "title" | "startTime" | "endTime" | "endsNextDay" | "location" | "notes" | "reminderMinutes" | "alarmMinutes"
>;

/** يبني أحداثًا غير متكررة بمعرّف سلسلة مشترك (للحذف الجماعي) */
export function buildSeries(dates: string[], tpl: ShiftTemplate, seriesId: string = uid(), now = Date.now()): PlannerEvent[] {
  return [...new Set(dates)].sort().map((date, i) => ({
    ...tpl,
    id: uid() + i,
    date,
    repeat: "none" as const,
    reminderMinutes: tpl.reminderMinutes,
    alarmMinutes: tpl.alarmMinutes,
    seriesId,
    createdAt: now + i,
  }));
}

/** يحذف التواريخ التي لديها فعلًا حدث بنفس النوع ووقت البداية (لا تكرار عند إعادة التوليد) */
export function skipExisting(dates: string[], events: PlannerEvent[], tpl: Pick<ShiftTemplate, "type" | "startTime">): {
  fresh: string[];
  skipped: string[];
} {
  const have = new Set(events.filter((e) => e.type === tpl.type && e.startTime === tpl.startTime).map((e) => e.date));
  const fresh: string[] = [];
  const skipped: string[] = [];
  for (const d of dates) (have.has(d) ? skipped : fresh).push(d);
  return { fresh, skipped };
}

export type SeriesInfo = { id: string; title: string; type: PlannerEvent["type"]; count: number; first: string; last: string };

/** السلاسل المولَّدة الموجودة (للعرض والحذف) */
export function listSeries(events: PlannerEvent[]): SeriesInfo[] {
  const map = new Map<string, SeriesInfo>();
  for (const e of events) {
    if (!e.seriesId) continue;
    const cur = map.get(e.seriesId);
    if (!cur) map.set(e.seriesId, { id: e.seriesId, title: e.title, type: e.type, count: 1, first: e.date, last: e.date });
    else {
      cur.count++;
      if (e.date < cur.first) cur.first = e.date;
      if (e.date > cur.last) cur.last = e.date;
    }
  }
  return [...map.values()].sort((a, b) => (a.first < b.first ? 1 : -1));
}

/** مدة حدث بالساعات (تدعم الانتهاء في اليوم التالي) */
export function eventHours(e: Pick<PlannerEvent, "startTime" | "endTime" | "endsNextDay" | "extraDays">): number {
  const s = toMinutes(e.startTime);
  let m = toMinutes(e.endTime) - s;
  const span = spanDaysOf(e);
  if (span > 0) m += 1440 * span;
  else if (m <= 0) m += 1440;
  return Math.round((m / 60) * 100) / 100;
}


