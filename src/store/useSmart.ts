import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toISO } from "@/lib/dates";
import { storage } from "@/lib/storage";

/** اقتراحات تجاهلها المستخدم (تعود غدًا إن بقي سببها) */
type SmartState = {
  day: string;
  dismissed: string[];
  dismiss: (id: string) => void;
  restore: () => void;
};

export const useSmart = create<SmartState>()(
  persist(
    (set, get) => ({
      day: toISO(new Date()),
      dismissed: [],
      dismiss: (id) => {
        const today = toISO(new Date());
        const base = get().day === today ? get().dismissed : [];
        set({ day: today, dismissed: base.includes(id) ? base : [...base, id] });
      },
      restore: () => set({ day: toISO(new Date()), dismissed: [] }),
    }),
    {
      name: "dp.smart.v1",
      storage,
      partialize: (s) => ({ day: s.day, dismissed: s.dismissed }),
    },
  ),
);
