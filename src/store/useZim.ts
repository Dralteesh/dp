import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { uid } from "@/lib/id";
import { forgetZim, ZimFile } from "@/lib/zim";
import { storage } from "@/lib/storage";

export type ZimItem = { id: string; name: string; desc?: string; lang?: string; uri: string; size: number; count: number; addedAt: number; openedAt?: number };
export type ZimFav = { zimId: string; path: string; title: string };

type State = {
  zims: ZimItem[];
  favs: ZimFav[];
  /** يستورد ملف ZIM واحدًا ويتحقق منه. يعيد الاسم أو null عند الإلغاء */
  importZim: () => Promise<string | null>;
  removeZim: (id: string) => Promise<void>;
  touch: (id: string) => void;
  toggleFav: (f: ZimFav) => void;
};

const DIR = `${FileSystem.documentDirectory}zim/`;

export const useZim = create<State>()(
  persist(
    (set, get) => ({
      zims: [],
      favs: [],
      importZim: async () => {
        const res = await DocumentPicker.getDocumentAsync({ type: "*/*", multiple: false, copyToCacheDirectory: true });
        if (res.canceled || !res.assets?.length) return null;
        const a = res.assets[0];
        if (!a.name.toLowerCase().endsWith(".zim")) {
          await FileSystem.deleteAsync(a.uri, { idempotent: true }).catch(() => {});
          throw new Error("اختر ملفًا بامتداد .zim");
        }
        await FileSystem.makeDirectoryAsync(DIR, { intermediates: true }).catch(() => {});
        const id = uid();
        const dest = `${DIR}${id}.zim`;
        await FileSystem.moveAsync({ from: a.uri, to: dest });
        try {
          const z = await ZimFile.open(dest);
          const name = (await z.meta("Title").catch(() => null)) || a.name.replace(/\.zim$/i, "");
          const desc = (await z.meta("Description").catch(() => null)) || undefined;
          const lang = (await z.meta("Language").catch(() => null)) || undefined;
          const info = await FileSystem.getInfoAsync(dest);
          const size = info.exists && "size" in info ? (info.size as number) : a.size ?? 0;
          set((s) => ({ zims: [{ id, name, desc, lang, uri: dest, size, count: z.count, addedAt: Date.now() }, ...s.zims] }));
          return name;
        } catch (e) {
          await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
          throw e;
        }
      },
      removeZim: async (id) => {
        const z = get().zims.find((x) => x.id === id);
        if (z) await FileSystem.deleteAsync(z.uri, { idempotent: true }).catch(() => {});
        forgetZim(id);
        set((s) => ({ zims: s.zims.filter((x) => x.id !== id), favs: s.favs.filter((f) => f.zimId !== id) }));
      },
      touch: (id) => set((s) => ({ zims: s.zims.map((z) => (z.id === id ? { ...z, openedAt: Date.now() } : z)) })),
      toggleFav: (f) =>
        set((s) => {
          const has = s.favs.some((x) => x.zimId === f.zimId && x.path === f.path);
          return { favs: has ? s.favs.filter((x) => !(x.zimId === f.zimId && x.path === f.path)) : [f, ...s.favs] };
        }),
    }),
    { name: "dp.zim.v1", storage, partialize: (s) => ({ zims: s.zims, favs: s.favs }) },
  ),
);
