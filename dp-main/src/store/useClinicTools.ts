import { create } from "zustand";

/** طلب فتح درج «أدوات العيادة» من خارج شاشة العيادة (ضغط مطوّل على شعار العيادة في الشريط السفلي) */
type ClinicToolsState = {
  pending: boolean;
  request: () => void;
  consume: () => void;
};

export const useClinicTools = create<ClinicToolsState>((set) => ({
  pending: false,
  request: () => set({ pending: true }),
  consume: () => set({ pending: false }),
}));
