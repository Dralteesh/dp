/**
 * إنهاء الزيارة (مسار واحد يربط الموعد بالخطة والجلسات والدفعات وملف التقويم والمراحل التالية).
 * يقرأ المخازن مباشرة (getState) لأنه يُستدعى من أحداث الواجهة لا من render.
 */
import { priceForProcedure, itemTeeth, isPlanProcedure } from "@/lib/clinicLink";
import { toISO } from "@/lib/dates";
import { uid } from "@/lib/id";
import { nextStepAfter, type NextStep } from "@/lib/workflows";
import { useClinic } from "@/store/useClinic";
import { useExtras } from "@/store/useExtras";
import { useSettings } from "@/store/useSettings";
import type { Appointment, ForeignAmount, PlanItem } from "@/types";

export type NextProposal = { fromItemId: string; step: NextStep; teeth: string[] };

/** اقتراحات المرحلة التالية لبنود الموعد المختارة (للعرض في ورقة الإنهاء) */
export function proposalsFor(itemIds: string[], doneOn: string): NextProposal[] {
  const plans = useClinic.getState().plans;
  const out: NextProposal[] = [];
  const seen = new Set<string>();
  for (const id of itemIds) {
    const item = plans.flatMap((p) => p.items).find((i) => i.id === id);
    if (!item) continue;
    const step = nextStepAfter(item, doneOn);
    if (!step) continue;
    const teeth = itemTeeth(item);
    const k = `${step.label}|${teeth.join(",")}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ fromItemId: id, step, teeth });
  }
  return out;
}

export type VisitOptions = {
  /** بنود الخطة التي أُنجزت في هذه الزيارة */
  itemIds: string[];
  /** مبلغ مقبوض الآن: amount بعملة العيادة، وforeign إن أُدخل بالدولار */
  payment?: { amount: number; foreign?: ForeignAmount };
  paymentNote?: string;
  /** خطة العلاج التي تُسجَّل عليها الدفعة */
  paymentPlanId?: string;
  /** المراحل التالية المقبولة */
  accept?: NextProposal[];
  date?: string;
};

export type VisitResult = { completed: number; payment: number; nextAdded: number };

export function completeVisit(apptId: string, opt: VisitOptions): VisitResult {
  const clinic = useClinic.getState();
  const appt = clinic.appointments.find((a) => a.id === apptId);
  const res: VisitResult = { completed: 0, payment: 0, nextAdded: 0 };
  if (!appt) return res;
  const date = opt.date ?? appt.date ?? toISO(new Date());

  // 1) إنجاز بنود الخطة (ينشئ جلسة لكل بند بتكلفته)
  for (const id of opt.itemIds) {
    const st = useClinic.getState();
    const plan = st.plans.find((p) => p.items.some((i) => i.id === id));
    const item = plan?.items.find((i) => i.id === id);
    if (plan && item && !item.done) {
      st.completePlanItem(plan.id, id, date);
      res.completed++;
    }
  }

  // 2) إعدادات النوع: زيارة تقويم في ملف الحالة، وجلسة بلا تكلفة عند غياب بنود (ليلتقطها كشف الأنواع والمواعيد التلقائية)
  const ex = appt.extra;
  if (ex?.ortho?.work) {
    const ox = useExtras.getState();
    const cur = ox.orthoCases.find((o) => o.patientId === appt.patientId);
    const done = [ex.ortho.work, ex.ortho.wire && `سلك ${ex.ortho.wire}`, ex.ortho.elastics && `مطاطات ${ex.ortho.elastics}`].filter(Boolean).join(" • ");
    const next = ex.ortho.nextWeeks ? `بعد ${ex.ortho.nextWeeks} أسابيع` : undefined;
    ox.saveOrtho(appt.patientId, { visits: [...(cur?.visits ?? []), { id: uid(), date, done, next }] });
  }
  const hasExtra = !!(ex?.implant?.stage || ex?.endo?.stage || ex?.crowns?.stage || ex?.pedo?.work || ex?.ortho?.work);
  if (res.completed === 0 && hasExtra && isPlanProcedure(appt.procedure)) {
    const detail = [ex?.implant?.stage, ex?.implant?.system, ex?.implant?.size, ex?.endo?.stage, ex?.crowns?.stage, ex?.pedo?.work].filter(Boolean).join(" • ");
    useClinic.getState().addSession({
      patientId: appt.patientId,
      date,
      procedure: appt.procedure,
      tooth: appt.teeth?.length ? appt.teeth.join("،") : undefined,
      notes: detail ? `من الموعد: ${detail}` : "من الموعد",
      cost: 0,
    });
  }

  // 3) الدفعة
  if (opt.payment && opt.payment.amount > 0) {
    useClinic.getState().addPayment({
      patientId: appt.patientId,
      date,
      amount: opt.payment.amount,
      foreign: opt.payment.foreign,
      note: opt.paymentNote?.trim() || "دفعة عند الزيارة",
      planId: opt.paymentPlanId,
      apptId: appt.id,
    });
    res.payment = opt.payment.amount;
  }

  // 4) المراحل التالية (بنود جديدة بتاريخ مستهدف تظهر في «يحتاجون موعدًا»)
  if (opt.accept?.length) {
    const { priceList } = useExtras.getState();
    const usdRate = useSettings.getState().usdRate;
    const items: Omit<PlanItem, "id" | "done" | "sessionId">[] = [];
    for (const p of opt.accept) {
      const cost = priceForProcedure(p.step.label, priceList, usdRate);
      if (p.teeth.length) for (const t of p.teeth) items.push({ procedure: p.step.label, tooth: t, teeth: [t], cost, dueOn: p.step.dueOn, flow: p.step.flow });
      else items.push({ procedure: p.step.label, cost, dueOn: p.step.dueOn, flow: p.step.flow });
    }
    useClinic.getState().addPlanItems(appt.patientId, items);
    res.nextAdded = items.length;
  }

  // 5) إغلاق الموعد
  const patch: Partial<Appointment> = { status: "done", visitDone: true };
  useClinic.getState().updateAppointment(apptId, patch);
  return res;
}
