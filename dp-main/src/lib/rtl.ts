import { DevSettings, I18nManager } from "react-native";

/**
 * يفرض اتجاه RTL. في أول تشغيل على هاتف غير عربي يحتاج التطبيق إعادة تشغيل
 * ليُطبَّق الاتجاه؛ نعيد false عندها ليعرض التطبيق تنبيهًا بسيطًا.
 */
export function setupRTL(): boolean {
  I18nManager.allowRTL(true);
  if (!I18nManager.isRTL) {
    I18nManager.forceRTL(true);
    if (__DEV__) {
      DevSettings.reload();
    }
  }
  return I18nManager.isRTL;
}

/** محاذاة نص الحقول حسب الاتجاه الحالي */
export function inputAlign(): "left" | "right" {
  return I18nManager.isRTL ? "right" : "left";
}

/** موضع زر عائم: أسفل يسار في RTL (معيار Material) */
export function fabSide(): { left: number } | { right: number } {
  return I18nManager.isRTL ? { left: 20 } : { right: 20 };
}
