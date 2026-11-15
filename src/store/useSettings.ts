import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STORAGE_KEYS, storage } from "@/lib/storage";
import type { PrayerKey, Settings } from "@/types";

export const DEFAULT_SETTINGS: Settings = {
  doctorName: "",
  prayerMethod: "mwl",
  madhab: "shafi",
  prayerAdjust: {},
  prayerNotify: {
    fajr: true,
    sunrise: false,
    dhuhr: true,
    asr: true,
    maghrib: true,
    isha: true,
  },
  defaultReminder: 30,
  appointmentReminder: 30,
  currency: "ل.س",
};

type SettingsState = Settings & {
  update: (patch: Partial<Settings>) => void;
  setAdjust: (key: PrayerKey, minutes: number) => void;
  toggleNotify: (key: PrayerKey) => void;
  reset: () => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
      setAdjust: (key, minutes) =>
        set((s) => ({ prayerAdjust: { ...s.prayerAdjust, [key]: minutes } })),
      toggleNotify: (key) =>
        set((s) => ({ prayerNotify: { ...s.prayerNotify, [key]: !s.prayerNotify[key] } })),
      reset: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: STORAGE_KEYS.settings,
      storage,
      partialize: (s) => ({
        doctorName: s.doctorName,
        prayerMethod: s.prayerMethod,
        madhab: s.madhab,
        prayerAdjust: s.prayerAdjust,
        prayerNotify: s.prayerNotify,
        defaultReminder: s.defaultReminder,
        appointmentReminder: s.appointmentReminder,
        currency: s.currency,
      }),
    },
  ),
);
