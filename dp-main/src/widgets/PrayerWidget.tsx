import { FlexWidget, TextWidget } from "react-native-android-widget";
import type { WidgetData } from "@/widgets/widgetData";

/** ودجت "الصلاة القادمة" بحجم صغير */
export function PrayerWidget({ data }: { data: WidgetData }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#14532D",
        borderRadius: 24,
        padding: 12,
      }}
    >
      <TextWidget text="الصلاة القادمة • حماه" style={{ fontSize: 11, color: "#BBF7D0" }} />
      <TextWidget
        text={data.prayer.label}
        style={{ fontSize: 24, fontWeight: "700", color: "#FFFFFF" }}
      />
      <TextWidget text={data.prayer.time} style={{ fontSize: 16, color: "#FFFFFF" }} />
      <TextWidget
        text={`بعد ${data.prayer.remaining}`}
        style={{ fontSize: 12, color: "#86EFAC" }}
      />
    </FlexWidget>
  );
}
