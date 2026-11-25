import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { uid } from "@/lib/id";
import { dropCache, extractTitle, KNOW_EXT, readRaw } from "@/lib/knowledge";
import { storage } from "@/lib/storage";

export type KItem = {
  id: string;
  title: string;
  uri: string;
  ext: string;
  size: number;
  topic?: string;
  addedAt: number;
  openedAt?: number;
  /** 0..1 */
  progress?: number;
  fav?: boolean;
};
export type KMark = { id: string; itemId: string; pos: number; label: string; createdAt: number };
export type KNote = { id: string; itemId: string; pos: number; text: string; createdAt: number };

type State = {
  items: KItem[];
  marks: KMark[];
  notes: KNote[];
  fontSize: number;
  night: boolean;
  importFiles: () => Promise<{ added: number; skipped: number }>;
  addText: (title: string, body: string, topic?: string) => Promise<string>;
  removeItem: (id: string) => Promise<void>;
  patchItem: (id: string, patch: Partial<KItem>) => void;
  addMark: (itemId: string, pos: number, label: string) => void;
  removeMark: (id: string) => void;
  addNote: (itemId: string, pos: number, text: string) => void;
  removeNote: (id: string) => void;
  setPrefs: (p: Partial<Pick<State, "fontSize" | "night">>) => void;
};

const DIR = `${FileSystem.documentDirectory}knowledge/`;
const ensureDir = () => FileSystem.makeDirectoryAsync(DIR, { intermediates: true }).catch(() => {});

export const useKnowledge = create<State>()(
  persist(
    (set, get) => ({
      items: [],
      marks: [],
      notes: [],
      fontSize: 18,
      night: false,
      importFiles: async () => {
        const res = await DocumentPicker.getDocumentAsync({ type: "*/*", multiple: true, copyToCacheDirectory: true });
        if (res.canceled || !res.assets?.length) return { added: 0, skipped: 0 };
        await ensureDir();
        const added: KItem[] = [];
        let skipped = 0;
        for (const a of res.assets) {
          const ext = (a.name.split(".").pop() ?? "").toLowerCase();
          if (!KNOW_EXT.includes(ext)) {
            skipped++;
            continue;
          }
          const id = uid();
          const dest = `${DIR}${id}.${ext}`;
          await FileSystem.copyAsync({ from: a.uri, to: dest });
          let title = a.name.replace(/\.[^.]+$/, "");
          try {
            title = extractTitle(await readRaw({ uri: dest }), ext, a.name);
          } catch {
            // نبقي اسم الملف
          }
          added.push({ id, title, uri: dest, ext, size: a.size ?? 0, addedAt: Date.now() });
        }
        set((s) => ({ items: [...added, ...s.items] }));
        return { added: added.length, skipped };
      },
      addText: async (title, body, topic) => {
        await ensureDir();
        const id = uid();
        const dest = `${DIR}${id}.txt`;
        await FileSystem.writeAsStringAsync(dest, body);
        const it: KItem = { id, title: title.trim() || "بدون عنوان", uri: dest, ext: "txt", size: body.length, topic: topic?.trim() || undefined, addedAt: Date.now() };
        set((s) => ({ items: [it, ...s.items] }));
        return id;
      },
      removeItem: async (id) => {
        const it = get().items.find((x) => x.id === id);
        if (it) await FileSystem.deleteAsync(it.uri, { idempotent: true }).catch(() => {});
        dropCache(id);
        set((s) => ({
          items: s.items.filter((x) => x.id !== id),
          marks: s.marks.filter((m) => m.itemId !== id),
          notes: s.notes.filter((n) => n.itemId !== id),
        }));
      },
      patchItem: (id, patch) => set((s) => ({ items: s.items.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      addMark: (itemId, pos, label) => set((s) => ({ marks: [{ id: uid(), itemId, pos, label, createdAt: Date.now() }, ...s.marks] })),
      removeMark: (id) => set((s) => ({ marks: s.marks.filter((m) => m.id !== id) })),
      addNote: (itemId, pos, text) => set((s) => ({ notes: [{ id: uid(), itemId, pos, text, createdAt: Date.now() }, ...s.notes] })),
      removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
      setPrefs: (p) => set(p),
    }),
    {
      name: "dp.knowledge.v1",
      storage,
      partialize: (s) => ({ items: s.items, marks: s.marks, notes: s.notes, fontSize: s.fontSize, night: s.night }),
    },
  ),
);
