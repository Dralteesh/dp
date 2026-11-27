import { useMemo } from "react";
import { patientPlanFinance, type PlanFin } from "@/lib/planFinance";
import { useClinic } from "@/store/useClinic";
import type { Patient } from "@/types";

export type PlanDebtRow = { patient: Patient; fin: PlanFin };

/** خطط العلاج التي بقي منها مبلغ غير مدفوع (الأكبر أولًا) عبر كل المرضى */
export function usePlanDebts(): PlanDebtRow[] {
  const patients = useClinic((s) => s.patients);
  const plans = useClinic((s) => s.plans);
  const payments = useClinic((s) => s.payments);
  const expenses = useClinic((s) => s.expenses);
  return useMemo(() => {
    const out: PlanDebtRow[] = [];
    for (const p of patients) {
      if (!plans.some((x) => x.patientId === p.id)) continue;
      for (const fin of patientPlanFinance(plans, payments, expenses, p.id).plans) if (fin.remaining > 0 && fin.net > 0) out.push({ patient: p, fin });
    }
    return out.sort((a, b) => b.fin.remaining - a.fin.remaining);
  }, [patients, plans, payments, expenses]);
}
