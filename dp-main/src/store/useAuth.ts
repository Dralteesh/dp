import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type SyncStatus = "idle" | "syncing" | "ok" | "error";

type AuthState = {
  session: Session | null;
  ready: boolean;
  syncStatus: SyncStatus;
  lastSyncAt: number | null;
  syncError: string | null;
  init: () => () => void;
  setSync: (p: Partial<Pick<AuthState, "syncStatus" | "lastSyncAt" | "syncError">>) => void;
};

export const useAuth = create<AuthState>((set) => ({
  session: null,
  ready: false,
  syncStatus: "idle",
  lastSyncAt: null,
  syncError: null,
  setSync: (p) => set(p),
  init: () => {
    supabase.auth.getSession().then(({ data }) => set({ session: data.session, ready: true }));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => set({ session, ready: true }));
    return () => data.subscription.unsubscribe();
  },
}));
