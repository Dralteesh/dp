import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { uid } from "@/lib/id";
import { storage } from "@/lib/storage";

export type DocItem = {
  id: string;
  name: string;
  /** المسار المحلي داخل التطبيق */
  uri: string;
  ext: string;
  size: number;
  addedAt: number;
  /** مفضّل */
  fav?: boolean;
  /** آخر فتح (لقسم «تابع القراءة») */
  openedAt?: number;
  /** PDF: آخر صفحة وصل إليها القارئ وعدد الصفحات */
  page?: number;
  pages?: number;
  /** PDF: مستوى التكبير والوضع الليلي */
  zoom?: number;
  night?: boolean;
};

type DocsState = {
  docs: DocItem[];
  /** يفتح منتقي الملفات وينسخها داخل التطبيق. يعيد عدد المضاف */
  importDocs: () => Promise<number>;
  removeDoc: (id: string) => Promise<void>;
  patchDoc: (id: string, patch: Partial<DocItem>) => void;
  toggleFav: (id: string) => void;
  touch: (id: string) => void;
};

const DIR = `${FileSystem.documentDirectory}docs/`;

export const useDocs = create<DocsState>()(
  persist(
    (set, get) => ({
      docs: [],
      importDocs: async () => {
        const res = await DocumentPicker.getDocumentAsync({ type: "*/*", multiple: true, copyToCacheDirectory: true });
        if (res.canceled || !res.assets?.length) return 0;
        await FileSystem.makeDirectoryAsync(DIR, { intermediates: true }).catch(() => {});
        const added: DocItem[] = [];
        for (const a of res.assets) {
          const ext = (a.name.split(".").pop() ?? "").toLowerCase();
          const id = uid();
          const dest = `${DIR}${id}${ext ? "." + ext : ""}`;
          await FileSystem.copyAsync({ from: a.uri, to: dest });
          added.push({ id, name: a.name, uri: dest, ext, size: a.size ?? 0, addedAt: Date.now() });
        }
        set((s) => ({ docs: [...added, ...s.docs] }));
        return added.length;
      },
      removeDoc: async (id) => {
        const d = get().docs.find((x) => x.id === id);
        if (d) await FileSystem.deleteAsync(d.uri, { idempotent: true }).catch(() => {});
        set((s) => ({ docs: s.docs.filter((x) => x.id !== id) }));
      },
      patchDoc: (id, patch) => set((s) => ({ docs: s.docs.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      toggleFav: (id) => set((s) => ({ docs: s.docs.map((d) => (d.id === id ? { ...d, fav: !d.fav } : d)) })),
      touch: (id) => set((s) => ({ docs: s.docs.map((d) => (d.id === id ? { ...d, openedAt: Date.now() } : d)) })),
    }),
    { name: "dp.docs.v1", storage, partialize: (s) => ({ docs: s.docs }) },
  ),
);

export type DocKind = "image" | "text" | "pdf" | "docx" | "sheet" | "other";

export function kindOf(ext: string): DocKind {
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp"].includes(ext)) return "image";
  if (["txt", "md", "log", "json", "xml", "csv", "tsv", "rtf", "ini"].includes(ext)) return "text";
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (["xlsx", "xls", "xlsm", "ods"].includes(ext)) return "sheet";
  return "other";
}

export const KIND_ICON: Record<DocKind, string> = {
  image: "image",
  text: "document-text",
  pdf: "document",
  docx: "reader",
  sheet: "grid",
  other: "attach",
};

/** لون كل نوع (للأيقونة والخلفية الفاتحة) والتسمية العربية */
export const KIND_META: Record<DocKind, { label: string; hex: string; soft: string }> = {
  pdf: { label: "PDF", hex: "#DC2626", soft: "#FEE2E2" },
  docx: { label: "Word", hex: "#2563EB", soft: "#DBEAFE" },
  sheet: { label: "Excel", hex: "#16A34A", soft: "#DCFCE7" },
  image: { label: "صور", hex: "#9333EA", soft: "#F3E8FF" },
  text: { label: "نصوص", hex: "#475569", soft: "#E2E8F0" },
  other: { label: "أخرى", hex: "#64748B", soft: "#F1F5F9" },
};

export function mimeOf(ext: string): string {
  const m: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ppt: "application/vnd.ms-powerpoint",
    txt: "text/plain",
    csv: "text/csv",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
  };
  return m[ext] ?? "*/*";
}
