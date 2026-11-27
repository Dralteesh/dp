import { create } from "zustand";
import { persist } from "zustand/middleware";
import { secureStorage } from "@/lib/storage";
import type { ApptExtra, AppointmentStatus } from "@/types";

/** مسودة حجز موعد جديد غير محفوظ: تُحفظ أثناء الكتابة وتُعرض للاستعادة عند فتح نموذج جديد */
export type ApptDraft = {
  savedAt: number;
  patientId?: string;
  date?: string;
  startTime?: string;
  duration: number;
  procedure: string;
  notes: string;
  status: AppointmentStatus;
  teeth: string[];
  linked: string[];
  extra: ApptExtra;
  planChoice?: string;
  costs: Record<string, string>;
};

type State = {
  draft: ApptDraft | null;
  setDraft: (d: ApptDraft) => void;
  clearDraft: () => void;
};

export const useApptDraft = create<State>()(
  persist(
    (set) => ({
      draft: null,
      setDraft: (draft) => set({ draft }),
      clearDraft: () => set({ draft: null }),
    }),
    { name: "dp.apptDraft.v1", storage: secureStorage, partialize: (s) => ({ draft: s.draft }) },
  ),
);
