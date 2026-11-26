/**
 * مراحل العلاج الجاهزة. عند إنجاز بند تطابق إجراؤه مرحلة، يُقترح بند المرحلة التالية بتاريخ مستهدف (dueOn).
 * المطابقة بالاسم (تعبير نمطي) ما لم يحمل البند flow صريحًا.
 */
import { addDays } from "@/lib/dates";
import type { PlanItem } from "@/types";

export type FlowStep = { label: string; match: RegExp; afterDays: number; minutes: number };
export type Flow = { id: string; label: string; steps: FlowStep[] };

export const FLOWS: Flow[] = [
  {
    id: "implant",
    label: "زرع",
    steps: [
      { label: "زرع - جراحة", match: /زرع.*جراح|جراحة.*زرع|^زرع$|زرعة$/, afterDays: 0, minutes: 90 },
      { label: "زرع - كشف اندماج وطبعة", match: /اندماج|طبعة.*زرع|زرع.*طبعة/, afterDays: 90, minutes: 45 },
      { label: "زرع - تركيب تاج", match: /تركيب.*(تاج|زرع)|زرع.*تركيب/, afterDays: 14, minutes: 60 },
    ],
  },
  {
    id: "endo",
    label: "عصب",
    steps: [
      { label: "عصب - فتح وتنظيف", match: /فتح|تنظيف.*(قنا|عصب)/, afterDays: 0, minutes: 60 },
      { label: "عصب - حشو قنوات", match: /حشو.*قنو|حشو.*عصب|حشو قنوات/, afterDays: 7, minutes: 60 },
      { label: "عصب - ترميم نهائي", match: /ترميم نهائي|حشو نهائي/, afterDays: 14, minutes: 45 },
    ],
  },
  {
    id: "crown",
    label: "تاج",
    steps: [
      { label: "تاج - تحضير وطبعة", match: /تحضير|طبعة.*تاج/, afterDays: 0, minutes: 60 },
      { label: "تاج - تجربة", match: /تجربة/, afterDays: 7, minutes: 30 },
      { label: "تاج - تركيب نهائي", match: /تركيب.*(تاج|جسر)|تلبيس/, afterDays: 7, minutes: 45 },
    ],
  },
  {
    id: "ortho",
    label: "تقويم",
    steps: [
      { label: "تقويم - تركيب جهاز", match: /تركيب.*(تقويم|براكيت|جهاز)/, afterDays: 0, minutes: 60 },
      { label: "تقويم - تفعيل", match: /تفعيل|مراجعة.*تقويم|تقويم.*مراجعة/, afterDays: 35, minutes: 20 },
      { label: "تقويم - جهاز تثبيت", match: /تثبيت|retainer/i, afterDays: 0, minutes: 30 },
    ],
  },
];

export type FlowPos = { flow: Flow; step: number };

/** موضع البند ضمن مسار: صريح (flow) أو بالمطابقة الاسمية */
export function flowPosOf(it: Pick<PlanItem, "procedure" | "flow">): FlowPos | null {
  if (it.flow) {
    const f = FLOWS.find((x) => x.id === it.flow!.id);
    if (f && f.steps[it.flow.step]) return { flow: f, step: it.flow.step };
  }
  for (const f of FLOWS) {
    // نبحث من الأخيرة للأولى حتى تغلب المراحل المتقدمة على العامة (مثل «زرع» العامة)
    for (let i = f.steps.length - 1; i >= 0; i--) if (f.steps[i].match.test(it.procedure)) return { flow: f, step: i };
  }
  return null;
}

export type NextStep = { label: string; dueOn: string; minutes: number; flow: { id: string; step: number } };

/** المرحلة التالية بعد إنجاز بند في تاريخ doneOn؛ null إن لم يوجد مسار أو انتهى */
export function nextStepAfter(it: Pick<PlanItem, "procedure" | "flow">, doneOn: string): NextStep | null {
  const pos = flowPosOf(it);
  if (!pos) return null;
  const next = pos.flow.steps[pos.step + 1];
  if (!next) return null;
  return { label: next.label, dueOn: addDays(doneOn, next.afterDays), minutes: next.minutes, flow: { id: pos.flow.id, step: pos.step + 1 } };
}
