import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/id";
import { STORAGE_KEYS, storage } from "@/lib/storage";
import { blankCountdown, normalizeCountdown } from "@/lib/countdown/presets";
import type { CdSort, CdThemeMode, Countdown } from "@/types/countdown";

type State = {
  items: Countdown[];
  theme: CdThemeMode;
  sort: CdSort;
  add: (c: Partial<Omit<Countdown, "id" | "createdAt" | "updatedAt">>) => string;
  update: (id: string, patch: Partial<Countdown>) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => string | null;
  toggleFavorite: (id: string) => void;
  togglePin: (id: string) => void;
  /** استعادة: دمج حسب المعرّف (الأحدث تحديثًا يفوز) أو استبدال كامل */
  importItems: (items: Countdown[], mode: "merge" | "replace") => void;
  setPrefs: (p: Partial<Pick<State, "theme" | "sort">>) => void;
  resetAll: () => void;
};

export const useCountdowns = create<State>()(
  persist(
    (set, get) => ({
      items: [],
      theme: "auto",
      sort: "nearest",
      add: (c) => {
        const id = uid();
        const now = Date.now();
        set((s) => ({ items: [...s.items, normalizeCountdown({ ...blankCountdown(), ...c, id, createdAt: now, updatedAt: now })] }));
        return id;
      },
      update: (id, patch) =>
        set((s) => ({ items: s.items.map((x) => (x.id === id ? normalizeCountdown({ ...x, ...patch, id, updatedAt: Date.now() }) : x)) })),
      remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
      duplicate: (id) => {
        const src = get().items.find((x) => x.id === id);
        if (!src) return null;
        const nid = uid();
        const now = Date.now();
        set((s) => ({ items: [...s.items, { ...src, id: nid, title: `${src.title} (نسخة)`, pinned: false, createdAt: now, updatedAt: now }] }));
        return nid;
      },
      toggleFavorite: (id) =>
        set((s) => ({ items: s.items.map((x) => (x.id === id ? { ...x, favorite: !x.favorite, updatedAt: Date.now() } : x)) })),
      togglePin: (id) =>
        set((s) => ({ items: s.items.map((x) => (x.id === id ? { ...x, pinned: !x.pinned, updatedAt: Date.now() } : x)) })),
      importItems: (incoming, mode) =>
        set((s) => {
          const clean = incoming.map((x) => normalizeCountdown(x));
          if (mode === "replace") return { items: clean };
          const map = new Map<string, Countdown>(s.items.map((x): [string, Countdown] => [x.id, x]));
          for (const x of clean) {
            const cur = map.get(x.id);
            if (!cur || x.updatedAt >= cur.updatedAt) map.set(x.id, x);
          }
          return { items: [...map.values()] };
        }),
      setPrefs: (p) => set(p),
      resetAll: () => set({ items: [] }),
    }),
    {
      name: STORAGE_KEYS.countdowns,
      storage,
      partialize: (s) => ({ items: s.items, theme: s.theme, sort: s.sort }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return {
          ...current,
          ...p,
          items: Array.isArray(p.items) ? p.items.filter((x) => x && typeof x.id === "string").map((x) => normalizeCountdown(x)) : [],
        };
      },
    },
  ),
);
