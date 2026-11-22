import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/id";
import { STORAGE_KEYS, storage } from "@/lib/storage";
import type { AlarmItem } from "@/types";

type NewAlarm = Omit<AlarmItem, "id">;

type AlarmsState = {
  alarms: AlarmItem[];
  addAlarm: (a: NewAlarm) => string;
  updateAlarm: (id: string, patch: Partial<AlarmItem>) => void;
  toggleAlarm: (id: string) => void;
  removeAlarm: (id: string) => void;
};

export const useAlarms = create<AlarmsState>()(
  persist(
    (set) => ({
      alarms: [],
      addAlarm: (a) => {
        const id = uid();
        set((s) => ({ alarms: [...s.alarms, { ...a, id }] }));
        return id;
      },
      updateAlarm: (id, patch) =>
        set((s) => ({ alarms: s.alarms.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      toggleAlarm: (id) =>
        set((s) => ({
          alarms: s.alarms.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
        })),
      removeAlarm: (id) => set((s) => ({ alarms: s.alarms.filter((a) => a.id !== id) })),
    }),
    {
      name: STORAGE_KEYS.alarms,
      storage,
      partialize: (s) => ({ alarms: s.alarms }),
    },
  ),
);
