import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/id";
import { STORAGE_KEYS, secureStorage } from "@/lib/storage";
import type {
  Appointment,
  AppointmentStatus,
  ClinicSession,
  Drug,
  Expense,
  InventoryItem,
  Patient,
  Payment,
  Prescription,
  StockMove,
  StockMoveKind,
  ToothStatus,
  TreatmentPlan,
  PlanItem,
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
  drugs: Drug[];
  prescriptions: Prescription[];
  inventory: InventoryItem[];
  stockMoves: StockMove[];
  plans: TreatmentPlan[];
  expenses: Expense[];

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

  addDrug: (d: Omit<Drug, "id" | "createdAt" | "active">) => void;
  updateDrug: (id: string, patch: Partial<Drug>) => void;
  removeDrug: (id: string) => void;

  addPrescription: (p: Omit<Prescription, "id" | "createdAt">) => string;
  removePrescription: (id: string) => void;

  addInventoryItem: (i: Omit<InventoryItem, "id" | "createdAt" | "active">) => void;
  updateInventoryItem: (id: string, patch: Partial<InventoryItem>) => void;
  /** يسجّل حركة ويحدّث كمية المادة: in يزيد، out ينقص (لا يقل عن 0)، adjust يضبط الكمية */
  moveStock: (itemId: string, kind: StockMoveKind, quantity: number, note?: string) => void;
  removeInventoryItem: (id: string) => void;

  addExpense: (e: Omit<Expense, "id" | "createdAt">) => void;
  removeExpense: (id: string) => void;

  addPlan: (patientId: string, title: string, items: Omit<PlanItem, "id" | "done" | "sessionId">[]) => string;
  updatePlan: (id: string, patch: Partial<Pick<TreatmentPlan, "title">>) => void;
  removePlan: (id: string) => void;
  addPlanItem: (planId: string, item: Omit<PlanItem, "id" | "done" | "sessionId">) => void;
  /** يضيف بنودًا لخطة المريض الحالية (أحدث خطة، أو تُنشأ «خطة علاج») ويُرجع معرّفات البنود الجديدة بالترتيب */
  addPlanItems: (patientId: string, items: Omit<PlanItem, "id" | "done" | "sessionId">[], planId?: string) => string[];
  /** يعدّل بندًا (مثل dueOn) في أي خطة */
  patchPlanItem: (itemId: string, patch: Partial<Omit<PlanItem, "id">>) => void;
  removePlanItem: (planId: string, itemId: string) => void;
  /** إنجاز بند: يضع علامة تم وينشئ جلسة بنفس التكلفة (تدخل في حساب المريض) */
  completePlanItem: (planId: string, itemId: string, date: string) => void;
  /** تراجع عن الإنجاز: يحذف الجلسة المرتبطة */
  undoPlanItem: (planId: string, itemId: string) => void;

  resetAll: () => void;
};

export const useClinic = create<ClinicState>()(
  persist(
    (set) => ({
      patients: [],
      appointments: [],
      sessions: [],
      payments: [],
      drugs: [],
      prescriptions: [],
      inventory: [],
      stockMoves: [],
      plans: [],
      expenses: [],

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
          prescriptions: s.prescriptions.filter((x) => x.patientId !== id),
          plans: s.plans.filter((x) => x.patientId !== id),
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

      addDrug: (d) =>
        set((s) => ({ drugs: [{ ...d, id: uid(), active: true, createdAt: Date.now() }, ...s.drugs] })),
      updateDrug: (id, patch) =>
        set((s) => ({ drugs: s.drugs.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      removeDrug: (id) => set((s) => ({ drugs: s.drugs.filter((d) => d.id !== id) })),

      addPrescription: (p) => {
        const id = uid();
        set((s) => ({ prescriptions: [{ ...p, id, createdAt: Date.now() }, ...s.prescriptions] }));
        return id;
      },
      removePrescription: (id) =>
        set((s) => ({ prescriptions: s.prescriptions.filter((x) => x.id !== id) })),

      addInventoryItem: (i) =>
        set((s) => ({
          inventory: [{ ...i, id: uid(), active: true, createdAt: Date.now() }, ...s.inventory],
        })),
      updateInventoryItem: (id, patch) =>
        set((s) => ({ inventory: s.inventory.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      moveStock: (itemId, kind, quantity, note) =>
        set((s) => {
          const item = s.inventory.find((i) => i.id === itemId);
          if (!item || !Number.isFinite(quantity) || quantity < 0) return {};
          const after =
            kind === "in" ? item.quantity + quantity : kind === "out" ? Math.max(0, item.quantity - quantity) : quantity;
          const move: StockMove = { id: uid(), itemId, kind, quantity, after, note, createdAt: Date.now() };
          return {
            inventory: s.inventory.map((i) => (i.id === itemId ? { ...i, quantity: after } : i)),
            stockMoves: [move, ...s.stockMoves],
          };
        }),
      removeInventoryItem: (id) =>
        set((s) => ({
          inventory: s.inventory.filter((i) => i.id !== id),
          stockMoves: s.stockMoves.filter((m) => m.itemId !== id),
        })),

      addExpense: (e) =>
        set((s) => ({ expenses: [{ ...e, id: uid(), createdAt: Date.now() }, ...s.expenses] })),
      removeExpense: (id) => set((s) => ({ expenses: s.expenses.filter((x) => x.id !== id) })),

      addPlan: (patientId, title, items) => {
        const id = uid();
        const plan: TreatmentPlan = {
          id,
          patientId,
          title,
          items: items.map((i) => ({ ...i, id: uid(), done: false })),
          createdAt: Date.now(),
        };
        set((s) => ({ plans: [plan, ...s.plans] }));
        return id;
      },
      updatePlan: (id, patch) =>
        set((s) => ({ plans: s.plans.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      removePlan: (id) => set((s) => ({ plans: s.plans.filter((p) => p.id !== id) })),
      addPlanItem: (planId, item) =>
        set((s) => ({
          plans: s.plans.map((p) =>
            p.id === planId ? { ...p, items: [...p.items, { ...item, id: uid(), done: false }] } : p,
          ),
        })),
      addPlanItems: (patientId, items, planId) => {
        const ids = items.map(() => uid());
        set((s) => {
          const made: PlanItem[] = items.map((i, n) => ({ ...i, id: ids[n], done: false }));
          const cur = (planId ? s.plans.find((p) => p.id === planId && p.patientId === patientId) : undefined) ?? s.plans.find((p) => p.patientId === patientId);
          if (cur) return { plans: s.plans.map((p) => (p.id === cur.id ? { ...p, items: [...p.items, ...made] } : p)) };
          const plan: TreatmentPlan = { id: uid(), patientId, title: "خطة علاج", items: made, createdAt: Date.now() };
          return { plans: [plan, ...s.plans] };
        });
        return ids;
      },
      patchPlanItem: (itemId, patch) =>
        set((s) => ({
          plans: s.plans.map((p) => (p.items.some((i) => i.id === itemId) ? { ...p, items: p.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) } : p)),
        })),
      removePlanItem: (planId, itemId) =>
        set((s) => ({
          plans: s.plans.map((p) =>
            p.id === planId ? { ...p, items: p.items.filter((i) => i.id !== itemId) } : p,
          ),
        })),
      completePlanItem: (planId, itemId, date) =>
        set((s) => {
          const plan = s.plans.find((p) => p.id === planId);
          const item = plan?.items.find((i) => i.id === itemId);
          if (!plan || !item || item.done) return {};
          const session: ClinicSession = {
            id: uid(),
            patientId: plan.patientId,
            date,
            procedure: item.procedure,
            tooth: item.tooth ?? (item.teeth?.length ? item.teeth.join("،") : undefined),
            notes: `من خطة العلاج: ${plan.title}`,
            cost: item.cost,
            createdAt: Date.now(),
          };
          return {
            sessions: [session, ...s.sessions],
            plans: s.plans.map((p) =>
              p.id === planId
                ? { ...p, items: p.items.map((i) => (i.id === itemId ? { ...i, done: true, sessionId: session.id } : i)) }
                : p,
            ),
          };
        }),
      undoPlanItem: (planId, itemId) =>
        set((s) => {
          const plan = s.plans.find((p) => p.id === planId);
          const item = plan?.items.find((i) => i.id === itemId);
          if (!plan || !item || !item.done) return {};
          return {
            sessions: s.sessions.filter((x) => x.id !== item.sessionId),
            plans: s.plans.map((p) =>
              p.id === planId
                ? { ...p, items: p.items.map((i) => (i.id === itemId ? { ...i, done: false, sessionId: undefined } : i)) }
                : p,
            ),
          };
        }),

      resetAll: () =>
        set({
          patients: [],
          appointments: [],
          sessions: [],
          payments: [],
          drugs: [],
          prescriptions: [],
          inventory: [],
          stockMoves: [],
          plans: [],
          expenses: [],
        }),
    }),
    {
      name: STORAGE_KEYS.clinic,
      storage: secureStorage,
      partialize: (s) => ({
        patients: s.patients,
        appointments: s.appointments,
        sessions: s.sessions,
        payments: s.payments,
        drugs: s.drugs,
        prescriptions: s.prescriptions,
        inventory: s.inventory,
        stockMoves: s.stockMoves,
        plans: s.plans,
        expenses: s.expenses,
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
