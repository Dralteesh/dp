import { FlexWidget, TextWidget } from "react-native-android-widget";
import { DEFAULT_SIZE, fitText, type WSize } from "@/widgets/fit";
import type { WidgetData } from "@/widgets/widgetData";

const PAD = 14;

/** ودجت "الصلاة القادمة": سماء متدرّجة بنفس ألوان بطاقة الصلاة (النصوص تتكيّف مع المقاس فلا تُقصّ) */
export function PrayerWidget({ data, size = DEFAULT_SIZE }: { data: WidgetData; size?: WSize }) {
  const room = size.w - PAD * 2;
  const tall = size.h >= 100;
  const head = fitText(`الصلاة القادمة • ${data.prayer.city}`, room, 12, 9);
  const label = fitText(data.prayer.label, room, tall ? 28 : 24, 16);
  const time = fitText(data.prayer.time, room, 15, 11);
  const left = fitText(`بعد ${data.prayer.remaining}`, room, 12, 9);
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "column",
        justifyContent: "space-between",
        borderRadius: 28,
        padding: PAD,
        backgroundGradient: { from: "#3FA9F5", to: "#1E3A8A", orientation: "TOP_BOTTOM" },
      }}
    >
      <TextWidget text={head.text} maxLines={1} truncate="END" style={{ fontSize: head.size, color: "#FFFFFFCC" }} />
      <FlexWidget style={{ flexDirection: "column" }}>
        <TextWidget text={label.text} maxLines={1} truncate="END" style={{ fontSize: label.size, fontWeight: "700", color: "#FFFFFF" }} />
        <TextWidget text={time.text} maxLines={1} truncate="END" style={{ fontSize: time.size, color: "#FFFFFF" }} />
        <TextWidget text={left.text} maxLines={1} truncate="END" style={{ fontSize: left.size, fontWeight: "600", color: "#FFFFFFCC" }} />
      </FlexWidget>
    </FlexWidget>
  );
}
