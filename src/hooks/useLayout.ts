import { useWindowDimensions } from "react-native";

/** معلومات التخطيط المتجاوب: تتحدث تلقائيًا عند التدوير أو تغيير حجم النافذة */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  return { width, height, isWide: width >= 700, isLandscape: width > height };
}
