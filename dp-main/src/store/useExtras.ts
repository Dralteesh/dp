import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/id";
import { storage } from "@/lib/storage";
import type { PriceItem, SterilCycle, WaitEntry, WaitStatus } from "@/types/extras";

type ExtrasState = {
  priceList: PriceItem[];
  waitlist: WaitEntry[];
  sterilization: SterilCycle[];

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

      resetAll: () => set({ priceList: [], waitlist: [], sterilization: [] }),
    }),
    {
      name: "dp.extras.v1",
      storage,
      partialize: (s) => ({ priceList: s.priceList, waitlist: s.waitlist, sterilization: s.sterilization }),
    },
  ),
);
