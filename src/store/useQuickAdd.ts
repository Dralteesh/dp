import { create } from "zustand";

/** حالة نافذة «الإضافة السريعة» العامة (تُفتح بالضغط المطوّل على زر الرئيسية أو من زر +) */
type QuickAddState = {
  open: boolean;
  /** التاريخ المستهدف للأحداث الجديدة (YYYY-MM-DD)، وإلا اليوم */
  date?: string;
  show: (date?: string) => void;
  hide: () => void;
};

export const useQuickAdd = create<QuickAddState>((set) => ({
  open: false,
  date: undefined,
  show: (date) => set({ open: true, date }),
  hide: () => set({ open: false }),
}));
