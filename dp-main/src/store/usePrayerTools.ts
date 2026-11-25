import { create } from "zustand";

/** طلب فتح نافذة «أدوات الصلاة» من خارج شاشة الصلاة (ضغط مطوّل على تبويب الصلاة في الشريط السفلي) */
type PrayerToolsState = {
  pending: boolean;
  request: () => void;
  consume: () => void;
};

export const usePrayerTools = create<PrayerToolsState>((set) => ({
  pending: false,
  request: () => set({ pending: true }),
  consume: () => set({ pending: false }),
}));
