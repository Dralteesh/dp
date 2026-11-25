import { create } from "zustand";
import { persist } from "zustand/middleware";
import { storage } from "@/lib/storage";

/** إعدادات خاصة بهذا الجهاز فقط (لا تُزامَن مع السحابة): قفل التطبيق وآخر نسخة احتياطية */
type DeviceState = {
  lockEnabled: boolean;
  lastBackupAt?: number;
  set: (patch: Partial<Pick<DeviceState, "lockEnabled" | "lastBackupAt">>) => void;
};

export const useDevice = create<DeviceState>()(
  persist(
    (set) => ({
      lockEnabled: false,
      set: (patch) => set(patch),
    }),
    {
      name: "dp.device.v1",
      storage,
      partialize: (s) => ({ lockEnabled: s.lockEnabled, lastBackupAt: s.lastBackupAt }),
    },
  ),
);
