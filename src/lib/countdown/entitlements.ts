/**
 * الميزات المدفوعة. افتراضيًا كل شيء مفتوح (BILLING_ENABLED = false) لأن التطبيق شخصي.
 * لتفعيل الاشتراك: اربط RevenueCat (react-native-purchases) ثم اجعل BILLING_ENABLED = true
 * وأعد قيمة usePro() من customerInfo.entitlements.active["pro"]. التفاصيل في COUNTDOWNS-AR.md.
 */
export const BILLING_ENABLED = false;
export const FREE_LIMITS = { counters: 5, reminders: 1 } as const;

export function usePro(): boolean {
  // TODO(RevenueCat): return Boolean(customerInfo?.entitlements.active["pro"]);
  return !BILLING_ENABLED;
}
