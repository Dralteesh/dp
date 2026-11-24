import AsyncStorage from "@react-native-async-storage/async-storage";
import { createJSONStorage } from "zustand/middleware";

/**
 * طبقة التخزين الوحيدة في التطبيق.
 * حاليًا AsyncStorage. عند إضافة Supabase لاحقًا نغيّر هذا الملف فقط
 * (أو نضيف مزامنة فوقه) دون تعديل الشاشات.
 */
export const storage = createJSONStorage(() => AsyncStorage);

export const STORAGE_KEYS = {
  planner: "dp.planner.v1",
  clinic: "dp.clinic.v1",
  settings: "dp.settings.v1",
  alarms: "dp.alarms.v1",
  countdowns: "dp.countdowns.v1",
} as const;
