import { useEffect, useRef } from "react";
import { create } from "zustand";

/**
 * طلب «إجراء القسم» من الزر العائم (الضغط المطوّل) إلى الشاشة الحالية.
 * الشاشة تستهلك الطلب فقط إن كان موجّهًا لاسم مسارها.
 */
type FabRequestState = {
  route: string | null;
  request: (route: string) => void;
  consume: () => void;
};

export const useFabRequest = create<FabRequestState>((set) => ({
  route: null,
  request: (route) => set({ route }),
  consume: () => set({ route: null }),
}));

/** تسجيل إجراء القسم: يُنفَّذ عند الضغط المطوّل على الزر العائم وأنت في هذه الشاشة */
export function useOnFabRequest(route: string, handler: () => void) {
  const pending = useFabRequest((s) => s.route);
  const consume = useFabRequest((s) => s.consume);
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (pending === route) {
      consume();
      ref.current();
    }
  }, [pending, route, consume]);
}
