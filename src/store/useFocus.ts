import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/id";
import { storage } from "@/lib/storage";

export type Species = "oak" | "pine" | "olive" | "cherry" | "tooth";

export const SPECIES: Record<Species, { label: string; cost: number; leaf: string; leaf2: string; trunk: string }> = {
  oak: { label: "سنديان", cost: 0, leaf: "#3E9B4F", leaf2: "#5DBB63", trunk: "#8B5A2B" },
  pine: { label: "صنوبر", cost: 50, leaf: "#2F7D55", leaf2: "#46A06E", trunk: "#7A4B24" },
  olive: { label: "زيتون", cost: 100, leaf: "#8AA33F", leaf2: "#A9C25A", trunk: "#6B4E2E" },
  cherry: { label: "كرز", cost: 150, leaf: "#F4A7C0", leaf2: "#F9C5D6", trunk: "#7B4A3A" },
  tooth: { label: "شجرة السنّ", cost: 200, leaf: "#EEF4F8", leaf2: "#FFFFFF", trunk: "#9FB6C6" },
};

export type ActiveSession = {
  startedAt: number;
  /** وقت الانتهاء المتوقع (يتمدد عند استراحة الصلاة) */
  endsAt: number;
  minutes: number;
  tag: string;
  species: Species;
  pausedAt?: number;
  notificationId?: string;
  /** آخر مرة كان التطبيق ظاهرًا فيها (لكشف الخروج أثناء إغلاق التطبيق) */
  lastSeen?: number;
};

export type FocusRecord = {
  id: string;
  at: number;
  minutes: number;
  tag: string;
  species: Species;
  status: "grown" | "withered";
};

type FocusState = {
  active: ActiveSession | null;
  records: FocusRecord[];
  coins: number;
  unlocked: Species[];
  setActive: (a: ActiveSession | null) => void;
  patchActive: (p: Partial<ActiveSession>) => void;
  finish: (status: "grown" | "withered") => void;
  unlock: (s: Species) => boolean;
};

export const useFocus = create<FocusState>()(
  persist(
    (set, get) => ({
      active: null,
      records: [],
      coins: 0,
      unlocked: ["oak"],
      setActive: (a) => set({ active: a }),
      patchActive: (p) => set((s) => (s.active ? { active: { ...s.active, ...p } } : s)),
      finish: (status) => {
        const a = get().active;
        if (!a) return;
        const rec: FocusRecord = { id: uid(), at: Date.now(), minutes: a.minutes, tag: a.tag, species: a.species, status };
        set((s) => ({
          active: null,
          records: [rec, ...s.records].slice(0, 1000),
          coins: s.coins + (status === "grown" ? a.minutes : 0),
        }));
      },
      unlock: (sp) => {
        const s = get();
        const cost = SPECIES[sp].cost;
        if (s.unlocked.includes(sp) || s.coins < cost) return false;
        set({ coins: s.coins - cost, unlocked: [...s.unlocked, sp] });
        return true;
      },
    }),
    {
      name: "dp.focus.v1",
      storage,
      partialize: (s) => ({ active: s.active, records: s.records, coins: s.coins, unlocked: s.unlocked }),
    },
  ),
);
