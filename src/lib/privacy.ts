import { fmtMoney } from "@/lib/format";
import { useDevice } from "@/store/useDevice";

/** هل وضع الخصوصية مفعّل؟ استدعِه داخل المكوّن ليُعاد رسمه عند التبديل */
export const useHideMoney = (): boolean => useDevice((s) => !!s.hideMoney);

/** مثل fmtMoney لكنه يخفي المبلغ في وضع الخصوصية. للواجهة فقط: ملفات PDF والتصدير تستعمل fmtMoney الكامل */
export function fmtMoneyP(n: number, currency: string): string {
  return useDevice.getState().hideMoney ? "•••" : fmtMoney(n, currency);
}
