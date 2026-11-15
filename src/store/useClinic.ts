import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/id";
import { STORAGE_KEYS, storage } from "@/lib/storage";
import type {
  Appointment,
  AppointmentStatus,
  ClinicSession,
  Patient,
  Payment,
  ToothStatus,
} from "@/types";

type NewPatient = Omit<Patient, "id" | "createdAt" | "teeth" | "status"> &
  Partial<Pick<Patient, "status" | "teeth">>;
type NewAppointment = Omit<Appointment, "id" | "createdAt" | "status"> &
  Partial<Pick<Appointment, "status">>;
type NewSession = Omit<ClinicSession, "id" | "createdAt">;
type NewPayment = Omit<Payment, "id" | "createdAt">;

type ClinicState = {
  patients: Patient[];
  appointments: Appointment[];
  sessions: ClinicSession[];
  payments: Payment[];

  addPatient: (p: NewPatient) => string;
  updatePatient: (id: string, patch: Partial<Patient>) => void;
  /** يحذف المريض وكل ما يتعلق به */
  removePatient: (id: string) => void;
  setTooth: (patientId: string, tooth: string, status: ToothStatus | null) => void;

  addAppointment: (a: NewAppointment) => string;
  updateAppointment: (id: string, patch: Partial<Appointment>) => void;
  setAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  removeAppointment: (id: string) => void;

  addSession: (s: NewSession) => void;
  removeSession: (id: string) => void;
  addPayment: (p: NewPayment) => void;
  removePayment: (id: string) => void;

  resetAll: () => void;
};

export const useClinic = create<ClinicState>()(
  persist(
    (set) => ({
      patients: [],
      appointments: [],
      sessions: [],
      payments: [],

      addPatient: (p) => {
        const id = uid();
        const patient: Patient = {
          ...p,
          id,
          status: p.status ?? "active",
          teeth: p.teeth ?? {},
          createdAt: Date.now(),
        };
        set((s) => ({ patients: [patient, ...s.patients] }));
        return id;
      },
      updatePatient: (id, patch) =>
        set((s) => ({ patients: s.patients.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      removePatient: (id) =>
        set((s) => ({
          patients: s.patients.filter((p) => p.id !== id),
          appointments: s.appointments.filter((a) => a.patientId !== id),
          sessions: s.sessions.filter((x) => x.patientId !== id),
          payments: s.payments.filter((x) => x.patientId !== id),
        })),
      setTooth: (patientId, tooth, status) =>
        set((s) => ({
          patients: s.patients.map((p) => {
            if (p.id !== patientId) return p;
            const teeth = { ...p.teeth };
            if (status) teeth[tooth] = status;
            else delete teeth[tooth];
            return { ...p, teeth };
          }),
        })),

      addAppointment: (a) => {
        const id = uid();
        const appt: Appointment = {
          ...a,
          id,
          status: a.status ?? "scheduled",
          createdAt: Date.now(),
        };
        set((s) => ({ appointments: [...s.appointments, appt] }));
        return id;
      },
      updateAppointment: (id, patch) =>
        set((s) => ({
          appointments: s.appointments.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),
      setAppointmentStatus: (id, status) =>
        set((s) => ({
          appointments: s.appointments.map((a) => (a.id === id ? { ...a, status } : a)),
        })),
      removeAppointment: (id) =>
        set((s) => ({ appointments: s.appointments.filter((a) => a.id !== id) })),

      addSession: (x) =>
        set((s) => ({ sessions: [{ ...x, id: uid(), createdAt: Date.now() }, ...s.sessions] })),
      removeSession: (id) => set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) })),
      addPayment: (x) =>
        set((s) => ({ payments: [{ ...x, id: uid(), createdAt: Date.now() }, ...s.payments] })),
      removePayment: (id) => set((s) => ({ payments: s.payments.filter((x) => x.id !== id) })),

      resetAll: () => set({ patients: [], appointments: [], sessions: [], payments: [] }),
    }),
    {
      name: STORAGE_KEYS.clinic,
      storage,
      partialize: (s) => ({
        patients: s.patients,
        appointments: s.appointments,
        sessions: s.sessions,
        payments: s.payments,
      }),
    },
  ),
);

/** رصيد المريض: المستحق (الجلسات) - المدفوع */
export function patientBalance(
  patientId: string,
  sessions: ClinicSession[],
  payments: Payment[],
) {
  const charged = sessions.filter((s) => s.patientId === patientId).reduce((a, s) => a + s.cost, 0);
  const paid = payments.filter((p) => p.patientId === patientId).reduce((a, p) => a + p.amount, 0);
  return { charged, paid, balance: charged - paid };
}
