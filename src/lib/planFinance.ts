/**
 * مالية خطط العلاج (دوال نقية، بلا React ولا مخازن).
 * الصافي = التكلفة − الخصم. الدفعات المربوطة بخطة تُحسب لها؛ الدفعات العامة (بلا خطة) توزَّع
 * على خطط المريض من الأقدم، ثم تُوزَّع دفعة كل خطة على بنودها بالترتيب.
 */
import type { Expense, Payment, PlanItem, TreatmentPlan } from "@/types";

/** صافي البند بعد الخصم */
export const itemNet = (it: Pick<PlanItem, "cost" | "discount">): number => Math.max(0, it.cost - (it.discount ?? 0));

export const planGross = (pl: TreatmentPlan): number => pl.items.reduce((a, i) => a + i.cost, 0);
export const planNet = (pl: TreatmentPlan): number => pl.items.reduce((a, i) => a + itemNet(i), 0);
export const planDiscount = (pl: TreatmentPlan): number => planGross(pl) - planNet(pl);

export type PayStatus = "paid" | "partial" | "unpaid";
export type ItemPay = { paid: number; status: PayStatus };

export type PlanFin = {
  plan: TreatmentPlan;
  gross: number;
  discount: number;
  net: number;
  /** المدفوع لهذه الخطة (المربوط + حصتها من الدفعات العامة) */
  paid: number;
  remaining: number;
  /** المنجز من الخطة (مستحق فعلًا على المريض) */
  doneNet: number;
  /** حالة دفع كل بند */
  items: Map<string, ItemPay>;
  /** مصاريف مربوطة بالخطة وربحها (المدفوع − المصاريف) */
  expenses: number;
  profit: number;
};

export type PatientFin = { plans: PlanFin[]; credit: number };

/** مالية كل خطط مريض (الأحدث أولًا كما في المخزن) + الرصيد الدائن غير الموزَّع */
export function patientPlanFinance(plans: TreatmentPlan[], payments: Payment[], expenses: Expense[], patientId: string): PatientFin {
  const mine = plans.filter((p) => p.patientId === patientId);
  const ids = new Set(mine.map((p) => p.id));
  const pays = payments.filter((p) => p.patientId === patientId);
  let pool = pays.filter((p) => !p.planId || !ids.has(p.planId)).reduce((a, p) => a + p.amount, 0);

  const paidBy = new Map<string, number>();
  for (const pl of [...mine].sort((a, b) => a.createdAt - b.createdAt)) {
    const tagged = pays.filter((p) => p.planId === pl.id).reduce((a, p) => a + p.amount, 0);
    const need = Math.max(0, planNet(pl) - tagged);
    const take = Math.min(need, Math.max(0, pool));
    pool -= take;
    paidBy.set(pl.id, tagged + take);
  }

  const out: PlanFin[] = mine.map((pl) => {
    const net = planNet(pl);
    const paid = paidBy.get(pl.id) ?? 0;
    let left = paid;
    const items = new Map<string, ItemPay>();
    for (const it of pl.items) {
      const due = itemNet(it);
      const got = Math.min(due, left);
      left -= got;
      items.set(it.id, { paid: got, status: due <= 0 || got >= due - 0.5 ? "paid" : got > 0 ? "partial" : "unpaid" });
    }
    const exp = expenses.filter((e) => e.planId === pl.id).reduce((a, e) => a + e.amount, 0);
    return {
      plan: pl,
      gross: planGross(pl),
      discount: planDiscount(pl),
      net,
      paid,
      remaining: Math.max(0, net - paid),
      doneNet: pl.items.filter((i) => i.done).reduce((a, i) => a + itemNet(i), 0),
      items,
      expenses: exp,
      profit: paid - exp,
    };
  });
  return { plans: out, credit: Math.max(0, pool) };
}

/** يوزّع خصمًا (نسبة أو مبلغًا) على البنود غير المنجزة بالتناسب مع تكلفتها */
export function distributeDiscount(items: PlanItem[], mode: "percent" | "amount", value: number, note?: string): Map<string, { discount: number; discountNote?: string }> {
  const open = items.filter((i) => !i.done && i.cost > 0);
  const base = open.reduce((a, i) => a + i.cost, 0);
  const out = new Map<string, { discount: number; discountNote?: string }>();
  if (!base || value <= 0) return out;
  const total = mode === "percent" ? (base * Math.min(100, value)) / 100 : Math.min(base, value);
  let used = 0;
  open.forEach((it, n) => {
    const d = n === open.length - 1 ? Math.round(total - used) : Math.round((total * it.cost) / base);
    used += d;
    out.set(it.id, { discount: Math.min(it.cost, Math.max(0, d)), discountNote: note || undefined });
  });
  return out;
}

export const PAY_LABEL: Record<PayStatus, string> = { paid: "مدفوع", partial: "جزئي", unpaid: "غير مدفوع" };
export const PAY_COLOR: Record<PayStatus, { fg: string; bg: string }> = {
  paid: { fg: "#166534", bg: "#DCFCE7" },
  partial: { fg: "#92400E", bg: "#FEF3C7" },
  unpaid: { fg: "#991B1B", bg: "#FEE2E2" },
};
