import { addDays } from "@/lib/dates";
import { FARD } from "@/lib/prayer";
import type { FardKey } from "@/store/usePrayerLog";

type Done = Record<string, Partial<Record<FardKey, number>>>;

export const countDay = (done: Done, iso: string) => FARD.filter((k) => done[iso]?.[k as FardKey]).length;

/** سلسلة الأيام المتتالية التي أُكملت فيها الصلوات الخمس. اليوم الجاري لا يكسر السلسلة إن لم يكتمل بعد. */
export function currentStreak(done: Done, today: string): number {
  let iso = countDay(done, today) === 5 ? today : addDays(today, -1);
  let n = 0;
  while (countDay(done, iso) === 5) {
    n++;
    iso = addDays(iso, -1);
  }
  return n;
}

export function bestStreak(done: Done): number {
  const days = Object.keys(done).filter((d) => countDay(done, d) === 5).sort();
  let best = 0, run = 0, prev = "";
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** نسبة الالتزام (0–1) وعدد الصلوات المؤدّاة خلال آخر n يومًا تنتهي باليوم */
export function rangeStats(done: Done, today: string, n: number) {
  let prayed = 0;
  for (let i = 0; i < n; i++) prayed += countDay(done, addDays(today, -i));
  return { prayed, total: n * 5, ratio: prayed / (n * 5) };
}

/** عدد المؤدّاة لكل صلاة خلال آخر n يومًا */
export function perPrayer(done: Done, today: string, n: number): Record<FardKey, number> {
  const out = { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 } as Record<FardKey, number>;
  for (let i = 0; i < n; i++) for (const k of FARD) if (done[addDays(today, -i)]?.[k as FardKey]) out[k as FardKey]++;
  return out;
}
