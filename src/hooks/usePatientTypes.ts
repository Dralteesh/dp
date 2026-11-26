import { useMemo } from "react";
import { activeTypes, detectTypes, type PatientTypeKey } from "@/lib/patientType";
import { useClinic } from "@/store/useClinic";
import { useExtras } from "@/store/useExtras";

/** أنواع المريض (مستنتَجة ونهائية) بلا آثار جانبية — بخلاف useSmartPatient الذي ينشئ مواعيد تلقائية */
export function usePatientTypes(patientId: string | undefined): { detected: PatientTypeKey[]; types: PatientTypeKey[] } {
  const patient = useClinic((s) => s.patients.find((p) => p.id === patientId));
  const plans = useClinic((s) => s.plans);
  const sessions = useClinic((s) => s.sessions);
  const appointments = useClinic((s) => s.appointments);
  const labOrders = useExtras((s) => s.labOrders);
  const orthoCases = useExtras((s) => s.orthoCases);
  return useMemo(() => {
    if (!patient) return { detected: [], types: [] };
    const input = { patient, plans, sessions, appointments, labOrders, orthoCases };
    return { detected: detectTypes(input), types: activeTypes(input) };
  }, [patient, plans, sessions, appointments, labOrders, orthoCases]);
}
