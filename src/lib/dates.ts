import { DAYS, MONTHS } from "@/constants/arabic";

export const pad = (n: number) => String(n).padStart(2, "0");

/** تاريخ محلي بصيغة YYYY-MM-DD (بدون مشاكل المناطق الزمنية) */
export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const todayISO = () => toISO(new Date());

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function weekdayOf(iso: string): number {
  return fromISO(iso).getDay();
}

/** 42 خلية للشهر (6 أسبوع) والأسبوع يبدأ بالسبت */
export function monthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 1) % 7; // السبت = 0
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { iso: toISO(d), inMonth: d.getMonth() === month };
  });
}

export function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(total: number): string {
  const t = ((total % 1440) + 1440) % 1440;
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}

/** 14:30 -> 2:30 م */
export function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "م" : "ص";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

export function fmtTimeDate(d: Date): string {
  return fmtTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
}

export function fmtDateLong(iso: string): string {
  const d = fromISO(iso);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function fmtDateFull(iso: string): string {
  const d = fromISO(iso);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDateShort(iso: string): string {
  const d = fromISO(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** وصف نسبي: اليوم / غدًا / أمس / تاريخ */
export function relativeDay(iso: string): string {
  const t = todayISO();
  if (iso === t) return "اليوم";
  if (iso === addDays(t, 1)) return "غدًا";
  if (iso === addDays(t, -1)) return "أمس";
  return fmtDateShort(iso);
}

/** دمج تاريخ ووقت في كائن Date محلي */
export function combine(iso: string, time: string): Date {
  const d = fromISO(iso);
  const [h, m] = time.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

/** صيغة ISO محلية بدون منطقة زمنية (يستعملها المنبّه الأصلي) */
export function localISOString(d: Date): string {
  return `${toISO(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

/** 5400000ms -> "1 س 30 د" */
export function fmtDuration(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h} س ${m} د`;
  if (h > 0) return `${h} س`;
  return `${m} د`;
}

/** عدّاد: 01:05:09 */
export function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

/** عدد الأيام التي تمتد إليها المناوبة بعد يوم البدء (0 = نفس اليوم، 1 = الغد، 2 = بعد غد ...) */
export function spanDaysOf(e: { endsNextDay: boolean; extraDays?: number }): number {
  if (typeof e.extraDays === "number" && e.extraDays >= 0) return Math.min(30, Math.floor(e.extraDays));
  return e.endsNextDay ? 1 : 0;
}

/** كلمة يوم الانتهاء نسبةً ليوم العرض: «الغد» / «بعد غد» / «بعد 3 أيام» */
export function endDayWord(days: number): string {
  if (days <= 0) return "";
  if (days === 1) return "الغد";
  if (days === 2) return "بعد غد";
  return `بعد ${days} أيام`;
}
