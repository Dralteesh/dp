import React from "react";
import { Platform } from "react-native";
import { loadWidgetData } from "@/widgets/widgetData";

/**
 * يطلب تحديث الودجت فور تغيّر البيانات داخل التطبيق.
 * يتجاهل الأخطاء بصمت (Expo Go لا يحتوي الوحدة الأصلية).
 */
export async function refreshWidgets(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requestWidgetUpdate } = require("react-native-android-widget");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TodayWidget } = require("@/widgets/TodayWidget");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrayerWidget } = require("@/widgets/PrayerWidget");

    const data = await loadWidgetData(4);
    await requestWidgetUpdate({
      widgetName: "TodayWidget",
      renderWidget: () => React.createElement(TodayWidget, { data }),
      widgetNotFound: () => {},
    });
    await requestWidgetUpdate({
      widgetName: "PrayerWidget",
      renderWidget: () => React.createElement(PrayerWidget, { data }),
      widgetNotFound: () => {},
    });
  } catch {
    // الودجت غير متاح (Expo Go أو لم يُضف بعد)
  }
}
