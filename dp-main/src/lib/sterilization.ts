import { addDays, fmtDateShort } from "@/lib/dates";
import type { SterilCycle } from "@/types/extras";

export const SPORE_EVERY_DAYS = 7;
export const LOAD_PRESETS = ["قبضات", "أدوات كشف", "أدوات جراحة", "أدوات لبية", "مختلط"];

export type CycleState = "failed" | "expired" | "expiring" | "valid";

/** تاريخ انتهاء صلاحية الحمولة (دورة ناجحة فقط) */
export function cycleExpiry(c: SterilCycle): string | null {
  return c.kind === "cycle" && c.passed ? addDays(c.date, Math.max(0, c.validDays)) : null;
}

export function cycleState(c: SterilCycle, today: string, warnDays = 3): CycleState {
  if (!c.passed) return "failed";
  const exp = cycleExpiry(c);
  if (!exp) return "valid";
  if (exp < today) return "expired";
  if (exp <= addDays(today, warnDays)) return "expiring";
  return "valid";
}

function daysBetween(a: string, b: string): number {
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000);
}

/** آخر اختبار بيولوجي وهل تأخر عن الدورية الموصى بها */
export function sporeStatus(cycles: SterilCycle[], today: string, every = SPORE_EVERY_DAYS) {
  const last = cycles.filter((c) => c.kind === "spore").sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (!last) return { last: null as SterilCycle | null, daysSince: null as number | null, overdue: cycles.length > 0 };
  const daysSince = daysBetween(last.date, today);
  return { last, daysSince, overdue: daysSince > every };
}

/** صلاحية عملية: آخر دورة ناجحة غير منتهية */
export function activeSterileLoads(cycles: SterilCycle[], today: string): SterilCycle[] {
  return cycles.filter((c) => c.kind === "cycle" && cycleState(c, today) !== "failed" && cycleState(c, today) !== "expired");
}

/** سجل نصي للمشاركة/الأرشفة */
export function logText(cycles: SterilCycle[], title = "سجل التعقيم"): string {
  const rows = [...cycles].sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
  return [
    `*${title}*`,
    ...rows.map((c) => {
      const kind = c.kind === "spore" ? "اختبار بيولوجي" : "دورة";
      const res = c.passed ? "ناجح" : "فاشل";
      const exp = cycleExpiry(c);
      return `• ${c.date} ${c.time} — ${kind} (${c.device})${c.load ? ` — ${c.load}` : ""}${
        c.tempC ? ` — ${c.tempC}°م` : ""
      }${c.minutes ? ` / ${c.minutes} د` : ""} — ${res}${exp ? ` — صالح حتى ${fmtDateShort(exp)}` : ""}`;
    }),
  ].join("\n");
}
