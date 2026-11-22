import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/id";
import { storage } from "@/lib/storage";

/** سجل نوم يدوي: تاريخ الاستيقاظ + وقت النوم + وقت الاستيقاظ + تقييم ذاتي 1..5 */
export type SleepLog = { id: string; date: string; bed: string; wake: string; quality: number };

/** جلسة تعقب جارية: بدأت عند start (ms) والمنبّه المتوقع alarm بصيغة HH:MM */
export type SleepSession = { start: number; alarm?: string };

type State = {
  logs: SleepLog[];
  session: SleepSession | null;
  startSession: (alarm?: string) => void;
  /** يُنهي الجلسة ويحفظ سجلًا ويعيده (أو null إن كانت قصيرة جدًا) */
  stopSession: () => SleepLog | null;
  cancelSession: () => void;
  add: (l: Omit<SleepLog, "id">) => void;
  remove: (id: string) => void;
};

export const useSleep = create<State>()(
  persist(
    (set, get) => ({
      logs: [],
      session: null,
      startSession: (alarm) => set({ session: { start: Date.now(), alarm } }),
      cancelSession: () => set({ session: null }),
      stopSession: () => {
        const cur = get().session;
        set({ session: null });
        if (!cur) return null;
        const end = Date.now();
        // أقل من 20 دقيقة لا يُعدّ نومًا
        if (end - cur.start < 20 * 60000) return null;
        const hm = (t: number) => {
          const d = new Date(t);
          return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        };
        const d = new Date(end);
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const log: SleepLog = { id: uid(), date, bed: hm(cur.start), wake: hm(end), quality: 4 };
        get().add({ date, bed: log.bed, wake: log.wake, quality: 4 });
        return log;
      },
      add: (l) =>
        set((s) => ({
          // سجل واحد لكل تاريخ: الجديد يستبدل القديم
          logs: [...s.logs.filter((x) => x.date !== l.date), { ...l, id: uid() }].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 400),
        })),
      remove: (id) => set((s) => ({ logs: s.logs.filter((x) => x.id !== id) })),
    }),
    { name: "dp.sleep.v1", storage, partialize: (s) => ({ logs: s.logs, session: s.session }) },
  ),
);

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** مدة النوم بالساعات (تتجاوز منتصف الليل إن لزم) */
export function sleepHours(bed: string, wake: string): number {
  let d = toMin(wake) - toMin(bed);
  if (d <= 0) d += 24 * 60;
  return d / 60;
}

/** درجة 0..100: 70٪ للمدة (الأمثل 7–9 ساعات) و30٪ للتقييم الذاتي */
export function sleepScore(l: Pick<SleepLog, "bed" | "wake" | "quality">): number {
  const h = sleepHours(l.bed, l.wake);
  const dev = h < 7 ? 7 - h : h > 9 ? h - 9 : 0;
  const dur = Math.max(0, 100 - dev * 22);
  return Math.round(dur * 0.7 + Math.max(1, Math.min(5, l.quality)) * 20 * 0.3);
}

/** أوقات النوم المقترحة للاستيقاظ في وقت معيّن: دورات 90 دقيقة + 15 دقيقة للنعاس */
export function bedtimesFor(wake: string): { time: string; cycles: number; hours: number }[] {
  const w = toMin(wake);
  return [6, 5, 4].map((cycles) => {
    const t = (((w - cycles * 90 - 15) % 1440) + 1440) % 1440;
    return {
      time: `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`,
      cycles,
      hours: (cycles * 90) / 60,
    };
  });
}
