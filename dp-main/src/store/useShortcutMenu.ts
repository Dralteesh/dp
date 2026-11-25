import { Vibration } from "react-native";
import { create } from "zustand";

export type ShortcutItem = { label: string; icon: string; onPress: () => void; hint?: string };

type State = {
  title: string;
  items: ShortcutItem[];
  open: boolean;
  show: (title: string, items: ShortcutItem[]) => void;
  hide: () => void;
};

/** قائمة اختصارات صغيرة تظهر بالضغط المطوّل على بطاقات الرئيسية (يعرضها ShortcutMenuHost) */
export const useShortcutMenu = create<State>((set) => ({
  title: "",
  items: [],
  open: false,
  show: (title, items) => {
    Vibration.vibrate(15);
    set({ title, items, open: true });
  },
  hide: () => set({ open: false }),
}));
