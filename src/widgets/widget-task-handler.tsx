import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { AlarmWidget } from "@/widgets/AlarmWidget";
import { CountdownListWidget } from "@/widgets/CountdownListWidget";
import { CountdownWidget } from "@/widgets/CountdownWidget";
import { ClinicWidget } from "@/widgets/ClinicWidget";
import { PrayerWidget } from "@/widgets/PrayerWidget";
import { QuranWidget } from "@/widgets/QuranWidget";
import { TasksWidget } from "@/widgets/TasksWidget";
import { TodayWidget } from "@/widgets/TodayWidget";
import { WeatherWidget } from "@/widgets/WeatherWidget";
import { refreshPrayerSchedule } from "@/lib/notifications";
import { sizeOf } from "@/widgets/fit";
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
 * معالج الودجت: يُستدعى عند إضافة الودجت أو تحديثه الدوري (حتى والتطبيق مغلق).
 * يقرأ البيانات من AsyncStorage ويرسم الودجت المناسب.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const name = props.widgetInfo.widgetName;
  // مقاس الودجت الحالي (dp): تُبنى النصوص والرسمة بحسبه كي لا يُقصّ شيء
  const size = sizeOf(props.widgetInfo as { width?: number; height?: number });

  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED": {
      if (name === "WeatherWidget") {
        props.renderWidget(<WeatherWidget data={await loadWeatherWidgetData(props.widgetAction === "WIDGET_UPDATE")} size={size} />);
        break;
      }
      if (name === "AlarmWidget") {
        props.renderWidget(<AlarmWidget data={await loadAlarmWidgetData()} size={size} />);
        break;
      }
      if (name === "TasksWidget") {
        props.renderWidget(<TasksWidget data={await loadTasksWidgetData(4)} size={size} />);
        break;
      }
      if (name === "ClinicWidget") {
        props.renderWidget(<ClinicWidget data={await loadClinicWidgetData()} size={size} />);
        break;
      }
      if (name === "QuranWidget") {
        props.renderWidget(<QuranWidget data={await loadQuranWidgetData()} size={size} />);
        break;
      }
      if (name === "CountdownWidget") {
        props.renderWidget(<CountdownWidget data={await loadCountdownWidgetData(1)} size={size} />);
        break;
      }
      if (name === "CountdownListWidget") {
        props.renderWidget(<CountdownListWidget data={await loadCountdownWidgetData(4)} size={size} />);
        break;
      }
      const data = await loadWidgetData(name === "TodayWidget" ? 4 : 1);
      if (name === "TodayWidget") props.renderWidget(<TodayWidget data={data} size={size} />);
      else if (name === "PrayerWidget") props.renderWidget(<PrayerWidget data={data} size={size} />);
      // تجديد جدول الصلاة والأذكار دون فتح التطبيق (التحديث الدوري كل 30 دقيقة).
      // الأحداث والمواعيد لا تُمسّ هنا لأن بياناتها غير محمّلة في هذا السياق.
      if (props.widgetAction === "WIDGET_UPDATE") {
        refreshPrayerSchedule().catch(() => {});
      }
      break;
    }
    default:
      break;
  }
}
