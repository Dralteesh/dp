import { FlexWidget, TextWidget } from "react-native-android-widget";
import type { QuranWidgetData } from "@/widgets/widgetData";

/** ودجت «تابع القراءة»: آخر سورة وصفحة، بلون ورق المصحف */
export function QuranWidget({ data }: { data: QuranWidgetData }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "column",
        justifyContent: "space-between",
        borderRadius: 28,
        padding: 16,
        backgroundGradient: { from: "#F6EBD3", to: "#E8D5A8", orientation: "TOP_BOTTOM" },
      }}
    >
      <TextWidget text="تابع القراءة" style={{ fontSize: 13, fontWeight: "600", color: "#7A6A4F" }} />
      <FlexWidget style={{ flexDirection: "column" }}>
        <TextWidget text={`سورة ${data.surah}`} style={{ fontSize: 22, fontWeight: "700", color: "#2B1D0E" }} />
        <TextWidget text={`الصفحة ${data.page} من 604`} style={{ fontSize: 13, color: "#B8860B", fontWeight: "600" }} />
      </FlexWidget>
    </FlexWidget>
  );
}
