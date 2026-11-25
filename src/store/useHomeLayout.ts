import { create } from "zustand";
import { persist } from "zustand/middleware";
import { storage } from "@/lib/storage";

export type BlockId =
  | "prayer"
  | "weather"
  | "week"
  | "day"
  | "clinic"
  | "alarms"
  | "docs"
  | "knowledge"
  | "places"
  | "countdown"
  | "recent";

export type Span = "third" | "half" | "twothird" | "full";

export const SPAN_ORDER: Span[] = ["third", "half", "twothird", "full"];
export const SPAN_PCT: Record<Span, `${number}%`> = { third: "31.5%", half: "48.5%", twothird: "65%", full: "100%" };
export const SPAN_LABEL: Record<Span, string> = { third: "ثلث", half: "نصف", twothird: "ثلثان", full: "كامل" };

/** ارتفاعات ثابتة اختيارية (0 = تلقائي حسب المحتوى) */
export const HEIGHTS = [0, 120, 180, 260, 360];

export type BlockDef = { id: BlockId; title: string; icon: string; span: Span };

/** كتل الرئيسية بترتيبها الافتراضي (نفس ترتيب الرئيسية الأصلية) */
export const BLOCKS: BlockDef[] = [
  { id: "prayer", title: "الصلاة", icon: "moon-outline", span: "twothird" },
  { id: "weather", title: "الطقس", icon: "partly-sunny-outline", span: "third" },
  { id: "week", title: "الجدول الأسبوعي", icon: "calendar-outline", span: "full" },
  { id: "day", title: "اليوم المحدّد", icon: "today-outline", span: "full" },
  { id: "clinic", title: "العيادة", icon: "medkit-outline", span: "full" },
  { id: "alarms", title: "المنبّهات القادمة", icon: "alarm-outline", span: "full" },
  { id: "docs", title: "المستندات", icon: "document-text-outline", span: "full" },
  { id: "knowledge", title: "المعرفة", icon: "library-outline", span: "half" },
  { id: "places", title: "أماكني", icon: "map-outline", span: "half" },
  { id: "countdown", title: "لحظاتي", icon: "hourglass-outline", span: "full" },
  { id: "recent", title: "المستندات الأخيرة", icon: "time-outline", span: "full" },
];

export type HomeItem = { id: BlockId; hidden: boolean; span: Span; height: number };

const defaults = (): HomeItem[] => BLOCKS.map((b) => ({ id: b.id, hidden: false, span: b.span, height: 0 }));

/** يصحّح ما حُفظ: يحذف المجهول والمكرّر، ويضيف الكتل الجديدة في آخر القائمة */
function normalize(raw: unknown): HomeItem[] {
  const base = defaults();
  const byId = new Map(base.map((i) => [i.id, i]));
  const out: HomeItem[] = [];
  const seen = new Set<string>();
  if (Array.isArray(raw)) {
    for (const r of raw as Partial<HomeItem>[]) {
      const d = r && typeof r.id === "string" ? byId.get(r.id as BlockId) : undefined;
      if (!d || seen.has(d.id)) continue;
      seen.add(d.id);
      out.push({
        id: d.id,
        hidden: !!r.hidden,
        span: SPAN_ORDER.includes(r.span as Span) ? (r.span as Span) : d.span,
        height: HEIGHTS.includes(Number(r.height)) ? Number(r.height) : 0,
      });
    }
  }
  for (const d of base) if (!seen.has(d.id)) out.push(d);
  return out;
}

type State = {
  items: HomeItem[];
  /** ينقل الكتلة إلى موضع الهدف */
  move: (id: BlockId, toIndex: number) => void;
  cycleSpan: (id: BlockId) => void;
  cycleHeight: (id: BlockId) => void;
  toggleHidden: (id: BlockId) => void;
  reset: () => void;
};

const patch = (items: HomeItem[], id: BlockId, f: (i: HomeItem) => HomeItem) => items.map((i) => (i.id === id ? f(i) : i));

export const useHomeLayout = create<State>()(
  persist(
    (set) => ({
      items: defaults(),
      move: (id, toIndex) =>
        set((s) => {
          const from = s.items.findIndex((i) => i.id === id);
          if (from < 0 || toIndex < 0 || toIndex >= s.items.length || from === toIndex) return s;
          const next = [...s.items];
          const [m] = next.splice(from, 1);
          next.splice(toIndex, 0, m);
          return { items: next };
        }),
      cycleSpan: (id) => set((s) => ({ items: patch(s.items, id, (i) => ({ ...i, span: SPAN_ORDER[(SPAN_ORDER.indexOf(i.span) + 1) % SPAN_ORDER.length] })) })),
      cycleHeight: (id) => set((s) => ({ items: patch(s.items, id, (i) => ({ ...i, height: HEIGHTS[(HEIGHTS.indexOf(i.height) + 1) % HEIGHTS.length] })) })),
      toggleHidden: (id) => set((s) => ({ items: patch(s.items, id, (i) => ({ ...i, hidden: !i.hidden })) })),
      reset: () => set({ items: defaults() }),
    }),
    {
      name: "dp.homelayout.v1",
      storage,
      partialize: (s) => ({ items: s.items }),
      merge: (persisted, current) => ({ ...current, items: normalize((persisted as Partial<State> | undefined)?.items) }),
    },
  ),
);
