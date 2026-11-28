/**
 * اختبارات مالية الخطط (لا تحتاج مكتبات): node --experimental-strip-types scripts/test-finance.ts
 * تُشغَّل في GitHub Actions قبل البناء. أي فشل يوقف البناء.
 */
import { distributeDiscount, itemNet, patientPlanFinance } from "../src/lib/planFinance";

let failed = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `\n    got:  ${JSON.stringify(got)}\n    want: ${JSON.stringify(want)}`}`);
};

const item = (id: string, cost: number, extra: Record<string, unknown> = {}) => ({ id, procedure: id, cost, done: false, ...extra }) as any;
const plan = (id: string, items: any[], createdAt = 1, patientId = "p1") => ({ id, patientId, title: id, items, createdAt }) as any;
const pay = (id: string, amount: number, extra: Record<string, unknown> = {}) => ({ id, patientId: "p1", date: "2026-11-01", amount, createdAt: 1, ...extra }) as any;

// الصافي بعد الخصم
eq("صافي البند", itemNet({ cost: 100, discount: 30 }), 70);
eq("الخصم لا يتجاوز التكلفة", itemNet({ cost: 100, discount: 500 }), 0);

// دفعة مربوطة توزَّع على البنود بالترتيب
{
  const f = patientPlanFinance([plan("A", [item("i1", 100), item("i2", 100)])], [pay("x", 150, { planId: "A" })], [], "p1");
  const a = f.plans[0];
  eq("مدفوع الخطة", a.paid, 150);
  eq("متبقي الخطة", a.remaining, 50);
  eq("البند الأول مدفوع", a.items.get("i1")?.status, "paid");
  eq("البند الثاني جزئي", a.items.get("i2")?.status, "partial");
}

// دفعة عامة توزَّع على الخطط من الأقدم
{
  const plans = [plan("new", [item("n1", 100)], 20), plan("old", [item("o1", 100)], 10)];
  const f = patientPlanFinance(plans, [pay("g", 130)], [], "p1");
  const by = (id: string) => f.plans.find((x) => x.plan.id === id)!;
  eq("الأقدم تُسدَّد أولًا", by("old").paid, 100);
  eq("الأحدث يأخذ الباقي", by("new").paid, 30);
  eq("لا رصيد دائن", f.credit, 0);
}

// دفعة زائدة = رصيد دائن
{
  const f = patientPlanFinance([plan("A", [item("i1", 100)])], [pay("x", 250)], [], "p1");
  eq("رصيد دائن", f.credit, 150);
  eq("المتبقي صفر", f.plans[0].remaining, 0);
}

// الاسترداد (مبلغ سالب) لا يكسر التوزيع
{
  const f = patientPlanFinance([plan("A", [item("i1", 100)])], [pay("x", 100, { planId: "A" }), pay("r", -40, { planId: "A", refund: true })], [], "p1");
  eq("المدفوع بعد الاسترداد", f.plans[0].paid, 60);
  eq("المتبقي بعد الاسترداد", f.plans[0].remaining, 40);
  const g = patientPlanFinance([plan("A", [item("i1", 100)])], [pay("x", 100), pay("r", -150, { refund: true })], [], "p1");
  eq("استرداد عام أكبر من الدفعات: لا رصيد سالب", g.credit, 0);
  eq("استرداد عام: الخطة لا تُسدَّد بمبلغ سالب", g.plans[0].paid >= 0, true);
}

// الخصم داخل الخطة يخفض الصافي ويدخل في البنود
{
  const f = patientPlanFinance([plan("A", [item("i1", 100, { discount: 20 }), item("i2", 100)])], [pay("x", 180, { planId: "A" })], [], "p1");
  eq("صافي الخطة", f.plans[0].net, 180);
  eq("مسدّدة بالكامل", f.plans[0].remaining, 0);
  eq("إجمالي الخصم", f.plans[0].discount, 20);
}

// المصاريف المربوطة والربح
{
  const f = patientPlanFinance([plan("A", [item("i1", 100)])], [pay("x", 100, { planId: "A" })], [{ id: "e", planId: "A", amount: 30, category: "lab", date: "2026-11-01", createdAt: 1 }] as any, "p1");
  eq("مصاريف الخطة", f.plans[0].expenses, 30);
  eq("ربح الخطة", f.plans[0].profit, 70);
}

// توزيع خصم نسبة على البنود غير المنجزة فقط ويطابق المجموع
{
  const items = [item("a", 100), item("b", 200), item("c", 300, { done: true })];
  const m = distributeDiscount(items, "percent", 10);
  eq("لا خصم على المنجز", m.has("c"), false);
  eq("مجموع الخصم = 10٪ من المفتوح", [...m.values()].reduce((s, v) => s + v.discount, 0), 30);
  const amt = distributeDiscount([item("a", 100), item("b", 100), item("c", 100)], "amount", 100);
  eq("مبلغ يُوزَّع بالتناسب ومجموعه مطابق", [...amt.values()].reduce((s, v) => s + v.discount, 0), 100);
  eq("خصم صفر لا يفعل شيئًا", distributeDiscount(items, "amount", 0).size, 0);
}

if (failed) throw new Error(`${failed} اختبار فشل`);
console.log("\nكل الاختبارات نجحت");
