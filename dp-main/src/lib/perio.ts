import type { PerioChart, PerioTooth } from "@/types/extras";

export const EMPTY_TOOTH = (): PerioTooth => ({ pd: [null, null, null, null, null, null], bop: false });

export function perioStats(teeth: Record<string, PerioTooth>) {
  let sites = 0;
  let sum = 0;
  let deep = 0;
  let measured = 0;
  let bop = 0;
  for (const t of Object.values(teeth)) {
    const vals = t.pd.filter((v): v is number => typeof v === "number");
    if (!vals.length && !t.bop) continue;
    measured++;
    if (t.bop) bop++;
    for (const v of vals) {
      sites++;
      sum += v;
      if (v >= 4) deep++;
    }
  }
  return {
    teeth: measured,
    avg: sites ? sum / sites : 0,
    deepSites: deep,
    deepPct: sites ? deep / sites : 0,
    bopPct: measured ? bop / measured : 0,
  };
}

/** يحوّل نصًا إلى عمق جيب صالح (0..15) أو null */
export function parsePd(raw: string): number | null {
  const v = Number(raw.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(",", "."));
  return raw.trim() !== "" && Number.isFinite(v) && v >= 0 && v <= 15 ? Math.round(v) : null;
}

export const sortedTeeth = (c: PerioChart) =>
  Object.keys(c.teeth).sort((a, b) => Number(a) - Number(b));
