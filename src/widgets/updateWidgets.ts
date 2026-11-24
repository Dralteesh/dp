import React from "react";
import { sizeOf } from "@/widgets/fit";
import { Platform } from "react-native";
import {
  loadAlarmWidgetData,
  loadCountdownWidgetData,
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
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      CountdownWidget: require("@/widgets/CountdownWidget").CountdownWidget,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      CountdownListWidget: require("@/widgets/CountdownListWidget").CountdownListWidget,
    };

    const [today, weather, alarm, tasks, clinic, quran, countdowns] = await Promise.all([
      loadWidgetData(4),
      loadWeatherWidgetData(false),
      loadAlarmWidgetData(),
      loadTasksWidgetData(4),
      loadClinicWidgetData(),
      loadQuranWidgetData(),
      loadCountdownWidgetData(4),
    ]);
    const jobs: [string, object][] = [
      ["WeatherWidget", weather],
      ["TodayWidget", today],
      ["PrayerWidget", today],
      ["AlarmWidget", alarm],
      ["TasksWidget", tasks],
      ["ClinicWidget", clinic],
      ["QuranWidget", quran],
      ["CountdownWidget", countdowns],
      ["CountdownListWidget", countdowns],
    ];
    for (const [widgetName, data] of jobs) {
      const Comp = mods[widgetName as keyof typeof mods] as React.ComponentType<{ data: never; size?: { w: number; h: number } }>;
      await requestWidgetUpdate({
        widgetName,
        renderWidget: (info: { width?: number; height?: number }) => React.createElement(Comp, { data: data as never, size: sizeOf(info) }),
        widgetNotFound: () => {},
      });
    }
  } catch {
    // الودجت غير متاح (Expo Go أو لم يُضف بعد)
  }
}
