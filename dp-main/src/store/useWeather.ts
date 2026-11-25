import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_CITY, fetchWeather, type City, type Weather } from "@/lib/weather";
import { scheduleWeatherAlerts } from "@/lib/weatherAlerts";
import { refreshWidgets } from "@/widgets/updateWidgets";
import { DEFAULT_UNITS, type Units } from "@/lib/weatherInsights";

type State = {
  cities: City[];
  index: number;
  cache: Record<string, Weather>;
  loading: boolean;
  error: string | null;
  units: Units;
  rainAlert: boolean;
  severeAlert: boolean;
  setUnits: (u: Partial<Units>) => void;
  setAlerts: (a: { rain?: boolean; severe?: boolean }) => void;
  /** يحدّث بيانات كل المدن المحفوظة (للمقارنة) */
  refreshAll: () => Promise<void>;
  setIndex: (i: number) => void;
  addCity: (c: City) => void;
  removeCity: (id: string) => void;
  refresh: (force?: boolean) => Promise<void>;
};

const STALE_MS = 15 * 60 * 1000;

export const useWeather = create<State>()(
  persist(
    (set, get) => ({
      cities: [DEFAULT_CITY],
      index: 0,
      cache: {},
      loading: false,
      error: null,
      units: DEFAULT_UNITS,
      rainAlert: true,
      severeAlert: true,
      setUnits: (u) => set((s) => ({ units: { ...s.units, ...u } })),
      setAlerts: (a) =>
        set((s) => ({ rainAlert: a.rain ?? s.rainAlert, severeAlert: a.severe ?? s.severeAlert })),
      refreshAll: async () => {
        const { cities } = get();
        const stale = cities.filter((c) => {
          const hit = get().cache[c.id];
          return !hit || Date.now() - hit.fetchedAt >= STALE_MS;
        });
        await Promise.all(
          stale.map(async (c) => {
            try {
              const w = await fetchWeather(c);
              set((s) => ({ cache: { ...s.cache, [c.id]: w } }));
            } catch {
              /* يبقى المخزَّن */
            }
          }),
        );
      },
      setIndex: (i) => {
        const n = get().cities.length;
        set({ index: ((i % n) + n) % n });
        get().refresh();
      },
      addCity: (c) => {
        const { cities } = get();
        const at = cities.findIndex((x) => x.id === c.id);
        if (at >= 0) set({ index: at });
        else set({ cities: [...cities, c], index: cities.length });
        get().refresh(true);
      },
      removeCity: (id) => {
        const { cities } = get();
        if (cities.length <= 1) return;
        const next = cities.filter((c) => c.id !== id);
        const cache = { ...get().cache };
        delete cache[id];
        set({ cities: next, cache, index: 0 });
        get().refresh();
      },
      refresh: async (force = false) => {
        const { cities, index, cache } = get();
        const city = cities[index];
        if (!city) return;
        const hit = cache[city.id];
        if (!force && hit && Date.now() - hit.fetchedAt < STALE_MS) return;
        set({ loading: true, error: null });
        try {
          const w = await fetchWeather(city);
          set((s) => ({ cache: { ...s.cache, [city.id]: w }, loading: false }));
          refreshWidgets().catch(() => {});
          // التنبيهات تُحسب للمدينة الأولى (مدينتك) فقط
          if (city.id === cities[0]?.id) {
            scheduleWeatherAlerts(w, city, { rain: get().rainAlert, severe: get().severeAlert }).catch(() => {});
          }
        } catch {
          set({ loading: false, error: hit ? "تعذّر التحديث — يُعرض آخر طقس محفوظ" : "تعذّر جلب الطقس. تحقق من الإنترنت." });
        }
      },
    }),
    {
      name: "dp.weather.v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        cities: s.cities,
        index: s.index,
        cache: s.cache,
        units: s.units,
        rainAlert: s.rainAlert,
        severeAlert: s.severeAlert,
      }),
    },
  ),
);
