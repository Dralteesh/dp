import { useEffect, useMemo, useRef } from "react";
import { findFreeSlot } from "@/lib/autoSlot";
import { toISO } from "@/lib/dates";
import { activeTypes, detectTypes, planAutoAppointments, type PatientTypeKey } from "@/lib/patientType";
import { useAgendaInput } from "@/hooks/useAgenda";
import { useClinic } from "@/store/useClinic";
import type { Appointment } from "@/types";
import { useExtras } from "@/store/useExtras";

/** نوع المريض الذكي: الأنواع المستنتَجة والنهائية، وإنشاء المواعيد التلقائية (مرة واحدة لكل علامة) */
export function useSmartPatient(patientId: string | undefined): { detected: PatientTypeKey[]; types: PatientTypeKey[] } {
  const patient = useClinic((s) => s.patients.find((p) => p.id === patientId));
  const plans = useClinic((s) => s.plans);
  const sessions = useClinic((s) => s.sessions);
  const appointments = useClinic((s) => s.appointments);
  const addAppointment = useClinic((s) => s.addAppointment);
  const updatePatient = useClinic((s) => s.updatePatient);
  const labOrders = useExtras((s) => s.labOrders);
  const orthoCases = useExtras((s) => s.orthoCases);
  const agendaInput = useAgendaInput();
  const busy = useRef(false);

  const input = useMemo(
    () => (patient ? { patient, plans, sessions, appointments, labOrders, orthoCases } : null),
    [patient, plans, sessions, appointments, labOrders, orthoCases],
  );
  const detected = useMemo(() => (input ? detectTypes(input) : []), [input]);
  const types = useMemo(() => (input ? activeTypes(input) : []), [input]);

  useEffect(() => {
    if (!patient || busy.current) return;
    const todo = planAutoAppointments({
      patient,
      types,
      sessions,
      appointments,
      orthoCase: orthoCases.find((o) => o.patientId === patient.id),
      today: toISO(new Date()),
    });
    if (!todo.length) return;
    busy.current = true;
    // وقت فارغ لكل موعد (بلا تعارض مع المواعيد أو الدوام أو المناوبات)؛ ما لا يجد وقتًا يُترك لمحاولة لاحقة
    const placed: Appointment[] = [];
    const created: string[] = [];
    for (const a of todo) {
      const slot = findFreeSlot(a.date, a.durationMin, agendaInput, placed);
      if (!slot) continue;
      const id = addAppointment({ patientId: patient.id, date: slot.date, startTime: slot.startTime, durationMin: a.durationMin, procedure: a.procedure, notes: a.notes });
      placed.push({ id, patientId: patient.id, date: slot.date, startTime: slot.startTime, durationMin: a.durationMin, procedure: a.procedure, status: "scheduled", createdAt: Date.now() });
      created.push(a.tag);
    }
    if (created.length) updatePatient(patient.id, { autoDone: [...(patient.autoDone ?? []), ...created] });
    busy.current = false;
  }, [patient, types, sessions, appointments, orthoCases, agendaInput, addAppointment, updatePatient]);

  return { detected, types };
}
