import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { PrayerWidget } from "@/widgets/PrayerWidget";
import { TodayWidget } from "@/widgets/TodayWidget";
import { loadWidgetData } from "@/widgets/widgetData";

/**
 * معالج الودجت: يُستدعى عند إضافة الودجت أو تحديثه الدوري (حتى والتطبيق مغلق).
 * يقرأ البيانات من AsyncStorage ويرسم الودجت المناسب.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const name = props.widgetInfo.widgetName;

  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED": {
      const data = await loadWidgetData(name === "TodayWidget" ? 4 : 1);
      if (name === "TodayWidget") props.renderWidget(<TodayWidget data={data} />);
      else if (name === "PrayerWidget") props.renderWidget(<PrayerWidget data={data} />);
      break;
    }
    default:
      break;
  }
}
