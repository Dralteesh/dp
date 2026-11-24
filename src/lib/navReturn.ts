/**
 * وجهة العودة المؤقتة: الطقس يُفتح من سماء الصلاة، فيعيد زر الرجوع إلى الصلاة لا إلى الرئيسية
 * (تبويبات التطبيق ترجع إلى الرئيسية افتراضيًا). تُستهلك مرة واحدة وتُمسح عند مغادرة الشاشة.
 */
let target: string | null = null;

export const setWeatherReturn = (to: string) => {
  target = to;
};
export const takeWeatherReturn = (): string | null => {
  const t = target;
  target = null;
  return t;
};
export const clearWeatherReturn = () => {
  target = null;
};
