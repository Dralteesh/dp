/**
 * ربط أقسام العيادة (دوال نقية، بلا React ولا مخازن).
 * الموعد ← أسنان ← بنود خطة ← جلسات ← دفعات. انظر ARCHITECTURE-CLINIC.md.
 */
import { priceInBase } from "@/lib/currency";
import { itemNet } from "@/lib/planFinance";
import type { Appointment, Patient, PlanItem, TreatmentPlan } from "@/types";
import type { PriceItem } from "@/types/extras";

/** إجراءات لا تُنشئ بندًا في الخطة (كشف/مراجعة/متابعة) */
export const NON_PLAN_RX = /كشف|استشار|مراجعة|متابعة|فحص|تذكير|تنظيف|تلميع/;

export const isPlanProcedure = (proc: string): boolean => !!proc.trim() && !NON_PLAN_RX.test(proc);

/** أسنان البند (يدعم السجلات القديمة التي فيها tooth نصًا حرًا) */
export function itemTeeth(it: Pick<PlanItem, "teeth" | "tooth">): string[] {
  if (it.teeth?.length) return it.teeth;
  if (!it.tooth) return [];
  return it.tooth.split(/[\s,،\-–/]+/).filter((x) => /^\d{2}$/.test(x));
}

export type OpenItem = { plan: TreatmentPlan; item: PlanItem };

/** بنود الخطة غير المنجزة للمريض (الأحدث أولًا) */
export function openItems(plans: TreatmentPlan[], patientId: string): OpenItem[] {
  const out: OpenItem[] = [];
  for (const plan of plans) {
    if (plan.patientId !== patientId) continue;
    for (const item of plan.items) if (!item.done) out.push({ plan, item });
  }
  return out;
}

/** البند المرتبط بموعد مجدول (قادم) — يمنع إظهار البند في «يحتاجون موعدًا» */
export function scheduledItemIds(appts: Appointment[], today: string): Set<string> {
  const s = new Set<string>();
  for (const a of appts) {
    if (a.status !== "scheduled" && a.status !== "arrived") continue;
    if (a.date < today) continue;
    for (const id of a.planItemIds ?? []) s.add(id);
  }
  return s;
}

/** سعر إجراء من قائمة الأسعار (تطابق الاسم أو احتواؤه) بالعملة الأساسية */
export function priceForProcedure(proc: string, priceList: PriceItem[], usdRate: number): number {
  const p = proc.trim();
  if (!p) return 0;
  const it = priceList.find((x) => x.active && (x.name === p || p.includes(x.name) || x.name.includes(p)));
  return it ? priceInBase(it, usdRate) ?? 0 : 0;
}

/** بند جديد لكل سن (سنّ واحد لكل بند ليُحسب سعره وإنجازه منفردًا) */
export function itemsForTeeth(
  proc: string,
  teeth: string[],
  priceList: PriceItem[],
  usdRate: number,
): Omit<PlanItem, "id" | "done" | "sessionId">[] {
  const cost = priceForProcedure(proc, priceList, usdRate);
  const list = teeth.length ? teeth : [undefined];
  return list.map((t) => ({ procedure: proc, tooth: t, teeth: t ? [t] : undefined, cost }));
}

/** هل يوجد بند مفتوح لنفس الإجراء والسن؟ (لا نكرّره عند الحجز) */
export function findOpenFor(opens: OpenItem[], proc: string, tooth: string | undefined): OpenItem | undefined {
  return opens.find(
    (o) =>
      o.item.procedure === proc &&
      (tooth ? itemTeeth(o.item).includes(tooth) : itemTeeth(o.item).length === 0),
  );
}

/** ملخّص «الحالة الآن» لمريض: المتبقي من الخطة والتكلفة */
export function planSummary(plans: TreatmentPlan[], patientId: string) {
  let open = 0;
  let done = 0;
  let openCost = 0;
  for (const pl of plans) {
    if (pl.patientId !== patientId) continue;
    for (const it of pl.items) {
      if (it.done) done++;
      else {
        open++;
        openCost += itemNet(it);
      }
    }
  }
  return { open, done, openCost };
}

export const teethLabel = (teeth: string[] | undefined): string => (teeth?.length ? teeth.join("،") : "");

/** تحويل نص سن حرّ إلى قائمة (للترحيل) */
export function splitTeeth(raw: string | undefined): string[] {
  return raw ? raw.split(/[\s,،\-–/]+/).filter((x) => /^\d{2}$/.test(x)) : [];
}

export type PatientLike = Pick<Patient, "id" | "name">;
