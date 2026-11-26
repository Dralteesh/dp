import { useMemo } from "react";
import { todayISO } from "@/lib/dates";
import { computeNeeds, type NeedRow } from "@/lib/needs";
import { useClinic } from "@/store/useClinic";
import { useExtras } from "@/store/useExtras";

/** «يحتاجون موعدًا» خلال windowDays (الافتراضي 7) — انظر src/lib/needs.ts */
export function useNeeds(windowDays = 7): NeedRow[] {
  const patients = useClinic((s) => s.patients);
  const plans = useClinic((s) => s.plans);
  const appointments = useClinic((s) => s.appointments);
  const sessions = useClinic((s) => s.sessions);
  const labOrders = useExtras((s) => s.labOrders);
  const orthoCases = useExtras((s) => s.orthoCases);
  const waitlist = useExtras((s) => s.waitlist);
  const today = todayISO();
  return useMemo(
    () => computeNeeds({ patients, plans, appointments, sessions, labOrders, orthoCases, waitlist, today, windowDays }),
    [patients, plans, appointments, sessions, labOrders, orthoCases, waitlist, today, windowDays],
  );
}
