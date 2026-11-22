import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/id";
import { storage } from "@/lib/storage";
import type {
  ConsentRecord,
  InstallPlan,
  LabOrder,
  OrthoCase,
  PriceItem,
  SterilCycle,
  WaitEntry,
  WaitStatus,
} from "@/types/extras";

type ExtrasState = {
  priceList: PriceItem[];
  waitlist: WaitEntry[];
  sterilization: SterilCycle[];
  orthoCases: OrthoCase[];
  consents: ConsentRecord[];
  installPlans: InstallPlan[];
  labOrders: LabOrder[];

  /** يعدّل ملف التقويم أو ينشئه للمريض */
  saveOrtho: (patientId: string, patch: Partial<Omit<OrthoCase, "id" | "patientId" | "createdAt">>) => void;
  addConsent: (c: Omit<ConsentRecord, "id" | "createdAt">) => void;
  updateConsent: (id: string, patch: Partial<ConsentRecord>) => void;
  removeConsent: (id: string) => void;
  addInstallPlan: (p: Omit<InstallPlan, "id" | "createdAt">) => void;
  updateInstallPlan: (id: string, patch: Partial<InstallPlan>) => void;
  removeInstallPlan: (id: string) => void;
  addLab: (l: Omit<LabOrder, "id" | "createdAt">) => void;
  updateLab: (id: string, patch: Partial<LabOrder>) => void;
  removeLab: (id: string) => void;

  addPrice: (p: Omit<PriceItem, "id" | "createdAt" | "active">) => void;
  updatePrice: (id: string, patch: Partial<PriceItem>) => void;
  removePrice: (id: string) => void;

  addWait: (w: Omit<WaitEntry, "id" | "createdAt" | "status">) => void;
  setWaitStatus: (id: string, status: WaitStatus) => void;
  removeWait: (id: string) => void;

  addCycle: (c: Omit<SterilCycle, "id" | "createdAt">) => void;
  removeCycle: (id: string) => void;

  resetAll: () => void;
};

/** بيانات العيادة الإضافية: قائمة الأسعار، قائمة الانتظار، سجل التعقيم */
export const useExtras = create<ExtrasState>()(
  persist(
    (set) => ({
      priceList: [],
      waitlist: [],
      sterilization: [],
      orthoCases: [],
      consents: [],
      installPlans: [],
      labOrders: [],

      saveOrtho: (patientId, patch) =>
        set((s) => {
          const cur = s.orthoCases.find((o) => o.patientId === patientId);
          if (cur) return { orthoCases: s.orthoCases.map((o) => (o.id === cur.id ? { ...o, ...patch } : o)) };
          return { orthoCases: [...s.orthoCases, { visits: [], ...patch, id: uid(), patientId, createdAt: Date.now() }] };
        }),
      addConsent: (c) => set((s) => ({ consents: [{ ...c, id: uid(), createdAt: Date.now() }, ...s.consents] })),
      updateConsent: (id, patch) => set((s) => ({ consents: s.consents.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeConsent: (id) => set((s) => ({ consents: s.consents.filter((x) => x.id !== id) })),
      addInstallPlan: (p) => set((s) => ({ installPlans: [{ ...p, id: uid(), createdAt: Date.now() }, ...s.installPlans] })),
      updateInstallPlan: (id, patch) =>
        set((s) => ({ installPlans: s.installPlans.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeInstallPlan: (id) => set((s) => ({ installPlans: s.installPlans.filter((x) => x.id !== id) })),
      addLab: (l) => set((s) => ({ labOrders: [{ ...l, id: uid(), createdAt: Date.now() }, ...s.labOrders] })),
      updateLab: (id, patch) => set((s) => ({ labOrders: s.labOrders.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeLab: (id) => set((s) => ({ labOrders: s.labOrders.filter((x) => x.id !== id) })),

      addPrice: (p) =>
        set((s) => ({ priceList: [...s.priceList, { ...p, id: uid(), active: true, createdAt: Date.now() }] })),
      updatePrice: (id, patch) =>
        set((s) => ({ priceList: s.priceList.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removePrice: (id) => set((s) => ({ priceList: s.priceList.filter((x) => x.id !== id) })),

      addWait: (w) =>
        set((s) => ({ waitlist: [...s.waitlist, { ...w, id: uid(), status: "waiting", createdAt: Date.now() }] })),
      setWaitStatus: (id, status) =>
        set((s) => ({
          waitlist: s.waitlist.map((x) =>
            x.id === id ? { ...x, status, notifiedAt: status === "notified" ? Date.now() : x.notifiedAt } : x,
          ),
        })),
      removeWait: (id) => set((s) => ({ waitlist: s.waitlist.filter((x) => x.id !== id) })),

      addCycle: (c) => set((s) => ({ sterilization: [{ ...c, id: uid(), createdAt: Date.now() }, ...s.sterilization] })),
      removeCycle: (id) => set((s) => ({ sterilization: s.sterilization.filter((x) => x.id !== id) })),

      resetAll: () => set({ priceList: [], waitlist: [], sterilization: [], orthoCases: [], consents: [], installPlans: [], labOrders: [] }),
    }),
    {
      name: "dp.extras.v1",
      storage,
      partialize: (s) => ({
        priceList: s.priceList,
        waitlist: s.waitlist,
        sterilization: s.sterilization,
        orthoCases: s.orthoCases,
        consents: s.consents,
        installPlans: s.installPlans,
        labOrders: s.labOrders,
      }),
    },
  ),
);
