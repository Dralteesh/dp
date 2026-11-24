import { FlexWidget, TextWidget } from "react-native-android-widget";
import type { WidgetData } from "@/widgets/widgetData";

/** ودجت "الصلاة القادمة": سماء متدرّجة بنفس ألوان بطاقة الصلاة */
export function PrayerWidget({ data }: { data: WidgetData }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "column",
        justifyContent: "space-between",
        borderRadius: 28,
        padding: 14,
        backgroundGradient: { from: "#3FA9F5", to: "#1E3A8A", orientation: "TOP_BOTTOM" },
      }}
    >
      <TextWidget text="الصلاة القادمة • حماه" style={{ fontSize: 12, color: "#FFFFFFCC" }} />
      <FlexWidget style={{ flexDirection: "column" }}>
        <TextWidget text={data.prayer.label} style={{ fontSize: 28, fontWeight: "700", color: "#FFFFFF" }} />
        <TextWidget text={data.prayer.time} style={{ fontSize: 15, color: "#FFFFFF" }} />
        <TextWidget text={`بعد ${data.prayer.remaining}`} style={{ fontSize: 12, fontWeight: "600", color: "#FFFFFFCC" }} />
      </FlexWidget>
    </FlexWidget>
  );
}
