import { todayISO } from "@/lib/dates";
import { sharePdf } from "@/lib/pdf";
import { patientPlanFinance } from "@/lib/planFinance";
import { receiptHtml, type DocCtx } from "@/lib/pdfHtml";
import { patientBalance, useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";

/** يبني إيصال دفعة PDF ويشاركه (واتساب/حفظ). يقرأ المخازن مباشرة؛ يعيد رسالة خطأ أو null. */
export async function shareReceipt(paymentId: string): Promise<string | null> {
  const st = useClinic.getState();
  const payment = st.payments.find((p) => p.id === paymentId);
  if (!payment) return "الدفعة غير موجودة.";
  const patient = st.patients.find((p) => p.id === payment.patientId);
  if (!patient) return "المريض غير موجود.";
  const se = useSettings.getState();
  const ctx: DocCtx = { clinicName: se.clinicName, doctorName: se.doctorName, logo: se.clinicLogo || undefined, currency: se.currency, dateISO: todayISO() };
  const fin = patientPlanFinance(st.plans, st.payments, st.expenses, patient.id);
  const pf = payment.planId ? fin.plans.find((x) => x.plan.id === payment.planId) : undefined;
  const balance = patientBalance(patient.id, st.sessions, st.payments).balance;
  return sharePdf(receiptHtml(ctx, patient, { payment, planTitle: pf?.plan.title, balance, planRemaining: pf?.remaining }), `إيصال-${patient.name}-${payment.date}`);
}
