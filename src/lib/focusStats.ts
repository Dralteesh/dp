import { addDays, toISO } from "@/lib/dates";
import type { FocusRecord } from "@/store/useFocus";

export type DayBar = { iso: string; minutes: number };

const grown = (rs: FocusRecord[]) => rs.filter((r) => r.status === "grown");

/** دقائق التركيز الناجحة لكل يوم (ISO → دقائق) */
export function minutesByDay(records: FocusRecord[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of grown(records)) {
    const d = toISO(new Date(r.at));
    m.set(d, (m.get(d) ?? 0) + r.minutes);
  }
  return m;
}

/** آخر n يومًا تنتهي باليوم المعطى، من الأقدم إلى الأحدث */
export function lastDays(byDay: Map<string, number>, todayIso: string, n: number): DayBar[] {
  const out: DayBar[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const iso = addDays(todayIso, -i);
    out.push({ iso, minutes: byDay.get(iso) ?? 0 });
  }
  return out;
}

/** أيام متتالية فيها تركيز ناجح حتى اليوم (أو حتى أمس إن لم تركّز اليوم بعد) */
export function streak(byDay: Map<string, number>, todayIso: string): number {
  let iso = byDay.get(todayIso) ? todayIso : addDays(todayIso, -1);
  let n = 0;
  while (byDay.get(iso)) {
    n++;
    iso = addDays(iso, -1);
  }
  return n;
}

/** توزيع الدقائق حسب التصنيف خلال آخر days يومًا، تنازليًا */
export function byTag(records: FocusRecord[], todayIso: string, days: number): [string, number][] {
  const from = addDays(todayIso, -(days - 1));
  const m = new Map<string, number>();
  for (const r of grown(records)) {
    const d = toISO(new Date(r.at));
    if (d >= from && d <= todayIso) m.set(r.tag, (m.get(r.tag) ?? 0) + r.minutes);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/** مستوى الخريطة الحرارية 0..4 نسبةً إلى الهدف اليومي */
export function heatLevel(minutes: number, goal: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  const r = minutes / Math.max(1, goal);
  return r < 0.25 ? 1 : r < 0.6 ? 2 : r < 1 ? 3 : 4;
}

/** موضع حتمي لشجرة في المشهد من معرّفها: x بين 0 و1، وصف العمق 0..rows-1 */
export function treeSlot(id: string, index: number, rows: number): { x: number; row: number; jitter: number } {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  const u = ((h >>> 0) % 10000) / 10000;
  const v = (((h >>> 0) >> 7) % 1000) / 1000;
  return { x: 0.04 + 0.92 * ((u * 0.55 + (index * 0.6180339887) % 1 * 0.45) % 1), row: index % rows, jitter: v };
}

export const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} س ${m % 60} د` : `${m} د`);
