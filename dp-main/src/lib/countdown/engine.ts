/**
 * محرّك العدّادات (منطق نقي بلا React Native): يصلح للواجهة وللودجت وللإشعارات.
 * - التواريخ تُحسب بتوقيت الجهاز (وقت الجدار) فلا يتزحزح «الساعة 9 صباحًا» عند الصيف/الشتاء.
 * - الفرق بين لحظتين تقويمي (سنوات/أشهر/أيام) ثم ساعات/دقائق/ثوانٍ فعلية، فيبقى دقيقًا حتى الثانية.
 */
import type { CdUnitMode, Countdown } from "../../types/countdown";

export const MS_SEC = 1000;
export const MS_MIN = 60_000;
export const MS_HOUR = 3_600_000;
export const MS_DAY = 86_400_000;
/** مهلة بعد لحظة الحدث تُعرض فيها «حان الموعد» قبل الانتقال للتالي */
export const GRACE_MS = 60_000;

type Parts = { y: number; m: number; d: number; h: number; mi: number };

const daysInMonth = (y: number, m0: number) => new Date(y, m0 + 1, 0).getDate();

function baseOf(cd: Pick<Countdown, "date" | "time" | "instantMs">): { p: Parts; utc: boolean } {
  if (cd.instantMs != null && Number.isFinite(cd.instantMs)) {
    const d = new Date(cd.instantMs);
    return { p: { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes() }, utc: true };
  }
  const [y, m, d] = cd.date.split("-").map(Number);
  const [h, mi] = cd.time.split(":").map(Number);
  return { p: { y, m: m - 1, d, h: h || 0, mi: mi || 0 }, utc: false };
}

const make = (p: Parts, utc: boolean): number =>
  utc ? Date.UTC(p.y, p.m, p.d, p.h, p.mi, 0, 0) : new Date(p.y, p.m, p.d, p.h, p.mi, 0, 0).getTime();

/** لحظة التكرار رقم i (0 = الأصل). أشهر قصيرة: 31 → آخر يوم في الشهر. 29 فبراير → 28 في غير الكبيس */
export function occurrenceMs(cd: Countdown, i: number): number {
  const { p, utc } = baseOf(cd);
  const r = cd.repeat;
  if (i === 0 || r.type === "none") return i === 0 ? make(p, utc) : NaN;
  switch (r.type) {
    case "daily":
      return make({ ...p, d: p.d + i }, utc);
    case "weekly":
      return make({ ...p, d: p.d + 7 * i }, utc);
    case "days":
      return make({ ...p, d: p.d + Math.max(1, Math.floor(r.every ?? 1)) * i }, utc);
    case "monthly": {
      const total = p.m + i;
      const y = p.y + Math.floor(total / 12);
      const m = ((total % 12) + 12) % 12;
      return make({ ...p, y, m, d: Math.min(p.d, daysInMonth(y, m)) }, utc);
    }
    case "yearly": {
      const y = p.y + i;
      return make({ ...p, y, d: Math.min(p.d, daysInMonth(y, p.m)) }, utc);
    }
    default:
      return NaN;
  }
}

/** متوسط طول الدورة بالميلي ثانية (للتقدير فقط) */
function periodEstimate(cd: Countdown): number {
  const r = cd.repeat;
  switch (r.type) {
    case "daily": return MS_DAY;
    case "weekly": return 7 * MS_DAY;
    case "days": return Math.max(1, Math.floor(r.every ?? 1)) * MS_DAY;
    case "monthly": return 30.4375 * MS_DAY;
    case "yearly": return 365.25 * MS_DAY;
    default: return Infinity;
  }
}

/** أصغر فهرس تكرار i يكون occ(i)+grace أكبر من now */
export function occurrenceIndexAt(cd: Countdown, nowMs: number): number {
  if (cd.repeat.type === "none") return 0;
  const first = occurrenceMs(cd, 0);
  if (!(nowMs - GRACE_MS >= first)) return 0;
  let i = Math.max(0, Math.floor((nowMs - first) / periodEstimate(cd)) - 2);
  let guard = 0;
  while (guard++ < 5000 && occurrenceMs(cd, i) + GRACE_MS <= nowMs) i++;
  guard = 0;
  while (guard++ < 5000 && i > 0 && occurrenceMs(cd, i - 1) + GRACE_MS > nowMs) i--;
  return i;
}

export type CdState = "upcoming" | "now" | "past" | "since" | "pending";

export type CdStatus = {
  state: CdState;
  /** لحظة الهدف (أو بداية العدّ التصاعدي) */
  target: number;
  /** الفترة التي تُفصَّل: from <= to */
  from: number;
  to: number;
  /** فهرس التكرار الحالي */
  index: number;
  /** نسبة التقدّم 0..1 (للتنازلي فقط) */
  progress: number | null;
};

export function statusOf(cd: Countdown, nowMs: number): CdStatus {
  if (cd.direction === "up") {
    const ref = occurrenceMs(cd, 0);
    return nowMs >= ref
      ? { state: "since", target: ref, from: ref, to: nowMs, index: 0, progress: null }
      : { state: "pending", target: ref, from: nowMs, to: ref, index: 0, progress: null };
  }
  const index = occurrenceIndexAt(cd, nowMs);
  const target = occurrenceMs(cd, index);
  const start = index > 0 ? occurrenceMs(cd, index - 1) : cd.startAt ?? cd.createdAt;
  const prog = (now: number) => (target > start ? Math.min(1, Math.max(0, (now - start) / (target - start))) : null);
  if (nowMs < target) return { state: "upcoming", target, from: nowMs, to: target, index, progress: prog(nowMs) };
  if (nowMs - target < GRACE_MS || cd.repeat.type !== "none") {
    return { state: "now", target, from: target, to: target, index, progress: 1 };
  }
  return { state: "past", target, from: target, to: nowMs, index, progress: 1 };
}

// ───────────── فرق التقويم ─────────────

export type Breakdown = {
  years: number; months: number; days: number; hours: number; minutes: number; seconds: number;
  totalSeconds: number; totalMinutes: number; totalHours: number; totalDays: number; totalWeeks: number; totalMonths: number; totalYears: number;
};

function addMonthsClamped(a: Date, n: number): Date {
  const total = a.getMonth() + n;
  const y = a.getFullYear() + Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  return new Date(y, m, Math.min(a.getDate(), daysInMonth(y, m)), a.getHours(), a.getMinutes(), a.getSeconds(), a.getMilliseconds());
}
const addDaysWall = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());

function wholeDaysBetween(a: Date, bMs: number): number {
  let n = Math.max(0, Math.floor((bMs - a.getTime()) / MS_DAY) - 1);
  while (addDaysWall(a, n + 1).getTime() <= bMs) n++;
  while (n > 0 && addDaysWall(a, n).getTime() > bMs) n--;
  return n;
}

export function breakdown(fromMs: number, toMs: number): Breakdown {
  const to = Math.max(fromMs, toMs);
  const a = new Date(fromMs);
  const b = new Date(to);
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  let anchor = addMonthsClamped(a, months);
  if (anchor.getTime() > to) {
    months--;
    anchor = addMonthsClamped(a, months);
  }
  const days = wholeDaysBetween(anchor, to);
  const rem = to - addDaysWall(anchor, days).getTime();
  const ms = to - fromMs;
  return {
    years: Math.floor(months / 12),
    months: months % 12,
    days,
    hours: Math.floor(rem / MS_HOUR),
    minutes: Math.floor((rem % MS_HOUR) / MS_MIN),
    seconds: Math.floor((rem % MS_MIN) / MS_SEC),
    totalSeconds: Math.floor(ms / MS_SEC),
    totalMinutes: Math.floor(ms / MS_MIN),
    totalHours: Math.floor(ms / MS_HOUR),
    totalDays: wholeDaysBetween(a, to),
    totalWeeks: Math.floor(wholeDaysBetween(a, to) / 7),
    totalMonths: months,
    totalYears: Math.floor(months / 12),
  };
}

// ───────────── العرض ─────────────

export type UnitKey = "years" | "months" | "weeks" | "days" | "hours" | "minutes" | "seconds";
export type Part = { key: UnitKey; value: number };

/** يقرّر الأجزاء التي تُعرض حسب وضع الوحدة */
export function partsFor(b: Breakdown, mode: CdUnitMode): Part[] {
  const single: Partial<Record<CdUnitMode, Part>> = {
    seconds: { key: "seconds", value: b.totalSeconds },
    minutes: { key: "minutes", value: b.totalMinutes },
    hours: { key: "hours", value: b.totalHours },
    days: { key: "days", value: b.totalDays },
    weeks: { key: "weeks", value: b.totalWeeks },
    months: { key: "months", value: b.totalMonths },
    years: { key: "years", value: b.totalYears },
  };
  const s = single[mode];
  if (s) return [s];
  const seq: Part[] = [
    { key: "years", value: b.years },
    { key: "months", value: b.months },
    { key: "days", value: b.days },
    { key: "hours", value: b.hours },
    { key: "minutes", value: b.minutes },
    { key: "seconds", value: b.seconds },
  ];
  let first = seq.findIndex((p) => p.value > 0);
  if (first < 0) first = seq.length - 1;
  return mode === "full" ? seq.slice(first) : seq.slice(first, first + 3);
}

/** كل كم ميلي ثانية يلزم تحديث الواجهة */
export function tickResolution(cd: Countdown, nowMs: number): number {
  const st = statusOf(cd, nowMs);
  if (st.state === "past" || st.state === "now") return MS_MIN;
  const parts = partsFor(breakdown(st.from, st.to), cd.unit);
  return parts.some((p) => p.key === "seconds") ? MS_SEC : MS_MIN;
}

const AR: Record<UnitKey, [string, string, string]> = {
  seconds: ["ثانية", "ثانيتان", "ثوانٍ"],
  minutes: ["دقيقة", "دقيقتان", "دقائق"],
  hours: ["ساعة", "ساعتان", "ساعات"],
  days: ["يوم", "يومان", "أيام"],
  weeks: ["أسبوع", "أسبوعان", "أسابيع"],
  months: ["شهر", "شهران", "أشهر"],
  years: ["سنة", "سنتان", "سنوات"],
};

/** وسم الوحدة بجانب رقم منفصل: 1 مفرد، 2–10 جمع، 11+ مفرد، 0 جمع */
export function unitTag(key: UnitKey, n: number): string {
  const [one, , many] = AR[key];
  return n === 1 || n >= 11 ? one : many;
}

export function fmtNum(n: number): string {
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** عبارة كاملة: «يومان» / «5 أيام» / «يوم واحد» */
export function phrase(key: UnitKey, n: number): string {
  const [one, two] = AR[key];
  if (n === 1) return `${one} واحد`;
  if (n === 2) return two;
  return `${fmtNum(n)} ${unitTag(key, n)}`;
}

export const STATE_CAPTION: Record<CdState, string> = {
  upcoming: "متبقٍّ",
  now: "حان الموعد",
  past: "مضى منذ",
  since: "منذ",
  pending: "يبدأ بعد",
};

// ───────────── الجدولة والفرز ─────────────

/** مواعيد قادمة (بعد now) ضمن أفق زمني، بحد أقصى max */
export function upcomingOccurrences(cd: Countdown, nowMs: number, horizonMs: number, max: number): number[] {
  if (cd.direction !== "down") return [];
  const out: number[] = [];
  let i = cd.repeat.type === "none" ? 0 : occurrenceIndexAt(cd, nowMs);
  for (let guard = 0; guard < max + 3 && out.length < max; guard++, i++) {
    const t = occurrenceMs(cd, i);
    if (!Number.isFinite(t) || t - nowMs > horizonMs) break;
    if (t > nowMs) out.push(t);
    if (cd.repeat.type === "none") break;
  }
  return out;
}

/** مجموعات التصنيف */
export function matchesFilter(cd: Countdown, filter: string, nowMs: number): boolean {
  const st = statusOf(cd, nowMs).state;
  switch (filter) {
    case "upcoming": return st === "upcoming" || st === "now" || st === "pending";
    case "past": return st === "past" || st === "since";
    case "favorite": return cd.favorite;
    case "repeating": return cd.repeat.type !== "none";
    default: return true;
  }
}

export function sortCountdowns(list: Countdown[], sort: string, nowMs: number): Countdown[] {
  const info = new Map(list.map((c) => {
    const s = statusOf(c, nowMs);
    const future = s.state === "upcoming" || s.state === "now" || s.state === "pending";
    // القادم أولًا بترتيب الأقرب، ثم الماضي بترتيب الأحدث
    const key = future ? Math.abs(s.target - nowMs) : 1e15 + Math.abs(nowMs - s.target);
    return [c.id, key] as const;
  }));
  const k = (c: Countdown) => info.get(c.id) ?? 0;
  const cmp: Record<string, (a: Countdown, b: Countdown) => number> = {
    nearest: (a, b) => k(a) - k(b),
    newest: (a, b) => b.createdAt - a.createdAt,
    favorite: (a, b) => Number(!!b.favorite) - Number(!!a.favorite) || k(a) - k(b),
    name: (a, b) => a.title.localeCompare(b.title, "ar"),
  };
  const f = cmp[sort] ?? cmp.nearest;
  return [...list].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || f(a, b));
}

/** أقرب حدث قادم (للإحصاءات وللودجت) */
export function nearestUpcoming(list: Countdown[], nowMs: number): { cd: Countdown; status: CdStatus } | null {
  let best: { cd: Countdown; status: CdStatus } | null = null;
  for (const cd of list) {
    const status = statusOf(cd, nowMs);
    if (status.state !== "upcoming" && status.state !== "now" && status.state !== "pending") continue;
    if (!best || status.target < best.status.target) best = { cd, status };
  }
  return best;
}
