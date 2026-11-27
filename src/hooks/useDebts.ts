import { useMemo } from "react";
import { useClinic } from "@/store/useClinic";

/** رصيد كل مريض (جلسات − دفعات): المفتاح معرّف المريض، والقيمة الموجبة = عليه ذمّة */
export function useDebts(): Map<string, number> {
  const sessions = useClinic((s) => s.sessions);
  const payments = useClinic((s) => s.payments);
  return useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sessions) m.set(s.patientId, (m.get(s.patientId) ?? 0) + s.cost);
    for (const p of payments) m.set(p.patientId, (m.get(p.patientId) ?? 0) - p.amount);
    return m;
  }, [sessions, payments]);
}
