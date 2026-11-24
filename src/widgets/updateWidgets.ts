import React from "react";
import { Platform } from "react-native";
import {
  loadAlarmWidgetData,
  loadClinicWidgetData,
  loadQuranWidgetData,
  loadTasksWidgetData,
  loadWeatherWidgetData,
  loadWidgetData,
} from "@/widgets/widgetData";

/**
 * يطلب تحديث كل الودجات فور تغيّر البيانات داخل التطبيق.
 * يتجاهل الأخطاء بصمت (Expo Go لا يحتوي الوحدة الأصلية).
 */
export async function refreshWidgets(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requestWidgetUpdate } = require("react-native-android-widget");
    const mods = {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      TodayWidget: require("@/widgets/TodayWidget").TodayWidget,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      PrayerWidget: require("@/widgets/PrayerWidget").PrayerWidget,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      WeatherWidget: require("@/widgets/WeatherWidget").WeatherWidget,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      AlarmWidget: require("@/widgets/AlarmWidget").AlarmWidget,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      TasksWidget: require("@/widgets/TasksWidget").TasksWidget,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      ClinicWidget: require("@/widgets/ClinicWidget").ClinicWidget,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      QuranWidget: require("@/widgets/QuranWidget").QuranWidget,
    };

    const [today, weather, alarm, tasks, clinic, quran] = await Promise.all([
      loadWidgetData(4),
      loadWeatherWidgetData(false),
      loadAlarmWidgetData(),
      loadTasksWidgetData(4),
      loadClinicWidgetData(),
      loadQuranWidgetData(),
    ]);
    const jobs: [string, object][] = [
      ["WeatherWidget", weather],
      ["TodayWidget", today],
      ["PrayerWidget", today],
      ["AlarmWidget", alarm],
      ["TasksWidget", tasks],
      ["ClinicWidget", clinic],
      ["QuranWidget", quran],
    ];
    for (const [widgetName, data] of jobs) {
      const Comp = mods[widgetName as keyof typeof mods] as React.ComponentType<{ data: never }>;
      await requestWidgetUpdate({
        widgetName,
        renderWidget: () => React.createElement(Comp, { data: data as never }),
        widgetNotFound: () => {},
      });
    }
  } catch {
    // الودجت غير متاح (Expo Go أو لم يُضف بعد)
  }
}
