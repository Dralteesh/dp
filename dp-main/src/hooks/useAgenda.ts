import { useMemo } from "react";
import { agendaFor, type AgendaInput, type AgendaItem } from "@/lib/agenda";
import { useClinic } from "@/store/useClinic";
import { usePlanner } from "@/store/usePlanner";

/** المصدر الموحّد للتقويم: أحداث الدوام/المناوبات + مواعيد العيادة الخاصة */
export function useAgendaInput(): AgendaInput {
  const events = usePlanner((s) => s.events);
  const appointments = useClinic((s) => s.appointments);
  const patients = useClinic((s) => s.patients);
  return useMemo(() => ({ events, appointments, patients }), [events, appointments, patients]);
}

export function useAgenda(iso: string): AgendaItem[] {
  const input = useAgendaInput();
  return useMemo(() => agendaFor(iso, input), [iso, input]);
}
