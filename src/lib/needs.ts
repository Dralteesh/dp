/**
 * «يحتاجون موعدًا»: كل مريض/بند يستحق موعدًا خلال نافذة (7 أيام فأكثر) ولا موعد قادمًا يغطيه.
 * المصادر: بنود خطة بتاريخ مستهدف، بنود مفتوحة بلا تاريخ، تقويم مستحق، مخبر وصل، وإدخالات الانتظار اليدوية.
 */
import { addDays } from "@/lib/dates";
import { scheduledItemIds, itemTeeth } from "@/lib/clinicLink";
import { lastOrthoVisit, needsFittingBooking, orthoNextVisit, activeTypes } from "@/lib/patientType";
import type { Appointment, ClinicSession, Patient, TreatmentPlan } from "@/types";
import type { LabOrder, OrthoCase, WaitEntry } from "@/types/extras";

export type NeedKind = "plan" | "ortho" | "lab" | "manual";

export type NeedRow = {
  key: string;
  kind: NeedKind;
  patient: Patient;
  /** السبب بصيغة مقروءة */
  reason: string;
  procedure: string;
  teeth: string[];
  /** التاريخ المستهدف (قد يكون ماضيًا = متأخر) */
  due?: string;
  overdue: boolean;
  planItemIds: string[];
  waitId?: string;
  /** أصغر = أعجل */
  rank: number;
};

export type NeedsInput = {
  patients: Patient[];
  plans: TreatmentPlan[];
  appointments: Appointment[];
  sessions: ClinicSession[];
  labOrders: LabOrder[];
  orthoCases: OrthoCase[];
  waitlist: WaitEntry[];
  today: string;
  /** نافذة الأيام (الافتراضي 7) */
  windowDays?: number;
};

const dayDiff = (a: string, b: string) => Math.round((new Date(a + "T00:00:00").getTime() - new Date(b + "T00:00:00").getTime()) / 86_400_000);

export function computeNeeds(i: NeedsInput): NeedRow[] {
  const win = i.windowDays ?? 7;
  const limit = addDays(i.today, win);
  const byId = new Map(i.patients.map((p) => [p.id, p]));
  const booked = scheduledItemIds(i.appointments, i.today);
  const upcomingOf = (pid: string) => i.appointments.some((a) => a.patientId === pid && a.status === "scheduled" && a.date >= i.today);
  const rows: NeedRow[] = [];

  // 1) بنود الخطة المفتوحة بلا موعد يغطيها (مجمّعة لكل مريض وتاريخ مستهدف)
  const groups = new Map<string, NeedRow>();
  for (const pl of i.plans) {
    const p = byId.get(pl.patientId);
    if (!p || p.status !== "active") continue;
    for (const it of pl.items) {
      if (it.done || booked.has(it.id)) continue;
      const due = it.dueOn;
      // بند بتاريخ بعد النافذة لا يظهر بعد
      if (due && due > limit) continue;
      const gk = `${p.id}|${due ?? "none"}`;
      const teeth = itemTeeth(it);
      const g = groups.get(gk);
      if (g) {
        g.planItemIds.push(it.id);
        for (const t of teeth) if (!g.teeth.includes(t)) g.teeth.push(t);
        if (!g.procedure.includes(it.procedure)) g.procedure += `، ${it.procedure}`;
      } else {
        const overdue = !!due && due < i.today;
        groups.set(gk, {
          key: `plan:${gk}`,
          kind: "plan",
          patient: p,
          reason: due ? (overdue ? `متأخر ${dayDiff(i.today, due)} يومًا` : due === i.today ? "اليوم" : `خلال ${dayDiff(due, i.today)} أيام`) : "بند خطة بلا موعد",
          procedure: it.procedure,
          teeth: [...teeth],
          due,
          overdue,
          planItemIds: [it.id],
          rank: due ? dayDiff(due, i.today) : win + 1,
        });
      }
    }
  }
  rows.push(...groups.values());

  // 2) تقويم: الزيارة التالية مستحقة ولا موعد قادم
  for (const p of i.patients) {
    if (p.status !== "active" || upcomingOf(p.id)) continue;
    const types = activeTypes({ patient: p, plans: i.plans, sessions: i.sessions, appointments: i.appointments, labOrders: i.labOrders, orthoCases: i.orthoCases });
    if (!types.includes("ortho")) continue;
    const last = lastOrthoVisit(i.orthoCases.find((o) => o.patientId === p.id), i.sessions, p.id);
    if (!last) continue;
    const due = orthoNextVisit(last).date;
    if (due > limit) continue;
    const overdue = due < i.today;
    rows.push({
      key: `ortho:${p.id}`,
      kind: "ortho",
      patient: p,
      reason: overdue ? `زيارة تقويم متأخرة ${dayDiff(i.today, due)} يومًا` : `زيارة تقويم خلال ${dayDiff(due, i.today)} أيام`,
      procedure: "تقويم - مراجعة",
      teeth: [],
      due,
      overdue,
      planItemIds: [],
      rank: dayDiff(due, i.today),
    });
  }

  // 3) مخبر: وصل العمل ولم يُحجز تركيب
  for (const o of i.labOrders) {
    const p = byId.get(o.patientId);
    if (!p || !needsFittingBooking(o, i.appointments, i.today)) continue;
    rows.push({
      key: `lab:${o.id}`,
      kind: "lab",
      patient: p,
      reason: "وصل عمل المخبر — احجز التركيب",
      procedure: `تركيب ${o.work}`,
      teeth: o.tooth ? [o.tooth] : [],
      overdue: false,
      planItemIds: [],
      rank: -1,
    });
  }

  // 4) قائمة الانتظار اليدوية
  for (const w of i.waitlist) {
    if (w.status !== "waiting" && w.status !== "notified") continue;
    const p = byId.get(w.patientId);
    if (!p) continue;
    rows.push({
      key: `wait:${w.id}`,
      kind: "manual",
      patient: p,
      reason: w.notes?.trim() || "في قائمة الانتظار",
      procedure: w.procedure,
      teeth: [],
      due: w.date ?? w.from,
      overdue: false,
      planItemIds: [],
      waitId: w.id,
      rank: w.date ? dayDiff(w.date, i.today) : win,
    });
  }

  return rows.sort((a, b) => a.rank - b.rank || a.patient.name.localeCompare(b.patient.name, "ar"));
}
