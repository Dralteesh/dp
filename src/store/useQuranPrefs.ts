import { create } from "zustand";
import { persist } from "zustand/middleware";
import { storage } from "@/lib/storage";

type State = {
  fontSize: number;
  paper: boolean; // true: ورق دافئ، false: ليلي
  tajweed: boolean;
  lastPage: number;
  bookmarks: string[]; // "surah:ayah@page"
  set: (p: Partial<Pick<State, "fontSize" | "paper" | "tajweed" | "lastPage">>) => void;
  toggleBookmark: (key: string, page: number) => void;
};

export const useQuranPrefs = create<State>()(
  persist(
    (set) => ({
      fontSize: 30,
      paper: true,
      tajweed: false,
      lastPage: 1,
      bookmarks: [],
      set: (p) => set(p),
      toggleBookmark: (key, page) =>
        set((s) => {
          const has = s.bookmarks.some((b) => b.split("@")[0] === key);
          return { bookmarks: has ? s.bookmarks.filter((b) => b.split("@")[0] !== key) : [...s.bookmarks, `${key}@${page}`] };
        }),
    }),
    {
      name: "dp.quran.v1",
      storage,
      partialize: (s) => ({ fontSize: s.fontSize, paper: s.paper, tajweed: s.tajweed, lastPage: s.lastPage, bookmarks: s.bookmarks }),
    },
  ),
);
