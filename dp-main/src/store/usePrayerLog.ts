import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addDays, todayISO } from "@/lib/dates";
import { storage } from "@/lib/storage";

/** الصلوات الخمس (بدون الشروق) */
export type FardKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

type PrayerLogState = {
  /** تاريخ اليوم ISO ← الصلاة ← وقت الضغط على «صليت» (ms) */
  done: Record<string, Partial<Record<FardKey, number>>>;
  /** «ذكّرني بعد 10 د»: "iso-key" ← وقت بدء التكرار المؤجَّل (ms) */
  snoozeUntil: Record<string, number>;
  setSnooze: (iso: string, key: FardKey, until: number) => void;
  markDone: (iso: string, key: FardKey) => void;
  unmark: (iso: string, key: FardKey) => void;
  isDone: (iso: string, key: FardKey) => boolean;
};

const KEEP_DAYS = 60;

/** يُبقي آخر 60 يومًا فقط */
function prune(done: PrayerLogState["done"]): PrayerLogState["done"] {
  const min = addDays(todayISO(), -KEEP_DAYS);
  const out: PrayerLogState["done"] = {};
  for (const iso of Object.keys(done)) if (iso >= min) out[iso] = done[iso];
  return out;
}

/** سجل «صليت» — محلي على الجهاز */
export const usePrayerLog = create<PrayerLogState>()(
  persist(
    (set, get) => ({
      done: {},
      snoozeUntil: {},
      setSnooze: (iso, key, until) =>
        set((s) => {
          const min = Date.now() - 86400000; // نحتفظ بيوم واحد فقط
          const next: Record<string, number> = {};
          for (const k of Object.keys(s.snoozeUntil)) if (s.snoozeUntil[k] > min) next[k] = s.snoozeUntil[k];
          next[`${iso}-${key}`] = until;
          return { snoozeUntil: next };
        }),
      markDone: (iso, key) =>
        set((s) => ({ done: prune({ ...s.done, [iso]: { ...s.done[iso], [key]: Date.now() } }) })),
      unmark: (iso, key) =>
        set((s) => {
          const day = { ...s.done[iso] };
          delete day[key];
          return { done: { ...s.done, [iso]: day } };
        }),
      isDone: (iso, key) => !!get().done[iso]?.[key],
    }),
    {
      name: "dp.prayerlog.v1",
      version: 1,
      storage,
      partialize: (s) => ({ done: s.done, snoozeUntil: s.snoozeUntil }),
      migrate: (persisted) => ({ done: {}, snoozeUntil: {}, ...(persisted as object) }) as never,
    },
  ),
);
