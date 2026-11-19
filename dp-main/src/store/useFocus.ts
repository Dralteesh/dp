import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/id";
import { storage } from "@/lib/storage";

export type Species = "oak" | "pine" | "olive" | "cherry" | "cypress";

export const SPECIES: Record<Species, { label: string; cost: number; desc: string; leaf: string; leaf2: string; trunk: string }> = {
  oak: { label: "سنديان", cost: 0, desc: "الشجرة الأولى: متينة وصبورة", leaf: "#3E9B4F", leaf2: "#6CC46F", trunk: "#8B5A2B" },
  pine: { label: "صنوبر", cost: 50, desc: "مخروطية تعلو طبقة فوق طبقة", leaf: "#2F7D55", leaf2: "#55AB7C", trunk: "#7A4B24" },
  olive: { label: "زيتون", cost: 100, desc: "عريضة الظل وثمارها داكنة", leaf: "#8AA33F", leaf2: "#B4CB6B", trunk: "#6B4E2E" },
  cherry: { label: "كرز", cost: 150, desc: "تتفتح بالأزهار الوردية", leaf: "#F4A7C0", leaf2: "#FBD3E1", trunk: "#7B4A3A" },
  cypress: { label: "سرو", cost: 200, desc: "شاهقة نحيلة كاللهب الأخضر", leaf: "#2B7550", leaf2: "#4B9A72", trunk: "#5E4128" },
};

export const DEFAULT_TAGS = ["دراسة", "قراءة", "عمل", "مراجعة", "أخرى"];

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
  /** تصنيفات مخصّصة */
  tags: string[];
  /** هدف التركيز اليومي بالدقائق */
  dailyGoal: number;
  addTag: (t: string) => void;
  removeTag: (t: string) => void;
  setDailyGoal: (m: number) => void;
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
      tags: DEFAULT_TAGS,
      dailyGoal: 120,
      addTag: (t) => {
        const v = t.trim();
        if (v && !get().tags.includes(v)) set((s) => ({ tags: [...s.tags, v] }));
      },
      removeTag: (t) => set((s) => (s.tags.length > 1 ? { tags: s.tags.filter((x) => x !== t) } : s)),
      setDailyGoal: (m) => set({ dailyGoal: Math.min(600, Math.max(15, Math.round(m))) }),
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
      version: 2,
      storage,
      // الإصدار 2: استُبدلت «شجرة السنّ» بالسرو، وأُضيفت التصنيفات والهدف اليومي
      migrate: (persisted: any) => {
        const fix = (sp: string): Species => (sp === "tooth" ? "cypress" : (sp as Species));
        const p = persisted ?? {};
        return {
          ...p,
          active: p.active ? { ...p.active, species: fix(p.active.species) } : null,
          records: (p.records ?? []).map((r: FocusRecord) => ({ ...r, species: fix(r.species) })),
          unlocked: Array.from(new Set(((p.unlocked ?? ["oak"]) as string[]).map(fix))),
          coins: p.coins ?? 0,
          tags: p.tags ?? DEFAULT_TAGS,
          dailyGoal: p.dailyGoal ?? 120,
        };
      },
      partialize: (s) => ({ active: s.active, records: s.records, coins: s.coins, unlocked: s.unlocked, tags: s.tags, dailyGoal: s.dailyGoal }),
    },
  ),
);
