import { useEffect, useState } from "react";

type PersistedStore = {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (fn: (state: any) => void) => () => void;
  };
};

/** يعيد true عندما تنتهي كل المخازن من قراءة AsyncStorage */
export function useHydrated(stores: PersistedStore[]): boolean {
  const [ready, setReady] = useState(() => stores.every((s) => s.persist.hasHydrated()));

  useEffect(() => {
    if (ready) return;
    const check = () => {
      if (stores.every((s) => s.persist.hasHydrated())) setReady(true);
    };
    const unsubs = stores.map((s) => s.persist.onFinishHydration(check));
    check();
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ready;
}
