import * as Location from "expo-location";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/id";
import { distM, trackStats, type Pt } from "@/lib/geo";
import { storage } from "@/lib/storage";

export type PlaceCat = "home" | "work" | "clinic" | "mosque" | "food" | "parking" | "nature" | "other";
export const PLACE_CATS: Record<PlaceCat, { label: string; icon: string; hex: string }> = {
  home: { label: "بيت", icon: "home", hex: "#0E6FA5" },
  work: { label: "عمل", icon: "briefcase", hex: "#475569" },
  clinic: { label: "عيادة/مستشفى", icon: "medkit", hex: "#DC2626" },
  mosque: { label: "مسجد", icon: "moon", hex: "#16A34A" },
  food: { label: "طعام", icon: "restaurant", hex: "#EA580C" },
  parking: { label: "موقف سيارتي", icon: "car", hex: "#6366F1" },
  nature: { label: "طبيعة", icon: "leaf", hex: "#15803D" },
  other: { label: "أخرى", icon: "location", hex: "#9333EA" },
};

export type Place = { id: string; name: string; lat: number; lng: number; cat: PlaceCat; note?: string; knowledgeId?: string; createdAt: number };
export type Track = { id: string; name: string; pts: Pt[]; distance: number; ascent: number; durationSec: number; createdAt: number };
type Rec = { pts: Pt[]; startedAt: number; distance: number; last?: Pt };

type State = {
  places: Place[];
  tracks: Track[];
  rec: Rec | null;
  addPlace: (p: Omit<Place, "id" | "createdAt">) => string;
  patchPlace: (id: string, patch: Partial<Place>) => void;
  removePlace: (id: string) => void;
  addTrack: (name: string, pts: Pt[]) => void;
  renameTrack: (id: string, name: string) => void;
  removeTrack: (id: string) => void;
  startRec: () => Promise<"ok" | "denied" | "error">;
  stopRec: (name?: string) => Track | null;
};

const MAX_PTS = 20000;
let sub: Location.LocationSubscription | null = null;

export const usePlaces = create<State>()(
  persist(
    (set, get) => ({
      places: [],
      tracks: [],
      rec: null,
      addPlace: (p) => {
        const id = uid();
        set((s) => ({ places: [{ ...p, id, createdAt: Date.now() }, ...s.places] }));
        return id;
      },
      patchPlace: (id, patch) => set((s) => ({ places: s.places.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      removePlace: (id) => set((s) => ({ places: s.places.filter((p) => p.id !== id) })),
      addTrack: (name, pts) => {
        const st = trackStats(pts);
        set((s) => ({ tracks: [{ id: uid(), name, pts, ...st, createdAt: Date.now() }, ...s.tracks] }));
      },
      renameTrack: (id, name) => set((s) => ({ tracks: s.tracks.map((t) => (t.id === id ? { ...t, name } : t)) })),
      removeTrack: (id) => set((s) => ({ tracks: s.tracks.filter((t) => t.id !== id) })),
      startRec: async () => {
        if (get().rec) return "ok";
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== "granted") return "denied";
        try {
          set({ rec: { pts: [], startedAt: Date.now(), distance: 0 } });
          sub = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 2000 },
            (loc) => {
              const r = get().rec;
              if (!r) return;
              if (loc.coords.accuracy != null && loc.coords.accuracy > 40) return; // نتجاهل القراءات الضعيفة
              const p: Pt = [loc.coords.latitude, loc.coords.longitude, loc.coords.altitude ?? undefined, loc.timestamp];
              const add = r.last ? distM({ lat: r.last[0], lng: r.last[1] }, { lat: p[0], lng: p[1] }) : 0;
              if (r.last && add < 3) return;
              set({ rec: { ...r, pts: r.pts.length < MAX_PTS ? [...r.pts, p] : r.pts, distance: r.distance + add, last: p } });
            },
          );
          return "ok";
        } catch {
          set({ rec: null });
          return "error";
        }
      },
      stopRec: (name) => {
        sub?.remove();
        sub = null;
        const r = get().rec;
        set({ rec: null });
        if (!r || r.pts.length < 2) return null;
        const st = trackStats(r.pts);
        const t: Track = { id: uid(), name: name || `مسار ${new Date(r.startedAt).toLocaleDateString("ar")}`, pts: r.pts, ...st, createdAt: Date.now() };
        set((s) => ({ tracks: [t, ...s.tracks] }));
        return t;
      },
    }),
    { name: "dp.places.v1", storage, partialize: (s) => ({ places: s.places, tracks: s.tracks }) },
  ),
);
