import { FlexWidget, TextWidget } from "react-native-android-widget";
import type { ClinicWidgetData } from "@/widgets/widgetData";

/** ودجت العيادة: عدد مواعيد اليوم والمنجَز والموعد التالي */
export function ClinicWidget({ data }: { data: ClinicWidgetData }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 28,
        padding: 16,
        backgroundGradient: { from: "#14B8A6", to: "#0E6FA5", orientation: "TOP_BOTTOM" },
      }}
    >
      <FlexWidget style={{ flex: 1, height: "match_parent", flexDirection: "column", justifyContent: "space-between" }}>
        <TextWidget text="العيادة اليوم" style={{ fontSize: 13, fontWeight: "600", color: "#FFFFFFCC" }} />
        {data.next ? (
          <FlexWidget style={{ flexDirection: "column" }}>
            <TextWidget text={`التالي ${data.next.time}`} style={{ fontSize: 12, color: "#FFFFFFCC" }} />
            <TextWidget text={data.next.patient} truncate="END" maxLines={1} style={{ fontSize: 17, fontWeight: "700", color: "#FFFFFF" }} />
            <TextWidget text={data.next.procedure} truncate="END" maxLines={1} style={{ fontSize: 12, color: "#FFFFFFCC" }} />
          </FlexWidget>
        ) : (
          <TextWidget text={data.total === 0 ? "لا مواعيد اليوم" : "انتهت مواعيد اليوم"} style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }} />
        )}
      </FlexWidget>
      <FlexWidget style={{ flexDirection: "column", alignItems: "center", backgroundColor: "#FFFFFF2E", borderRadius: 22, paddingHorizontal: 18, paddingVertical: 10 }}>
        <TextWidget text={String(data.total)} style={{ fontSize: 34, fontWeight: "700", color: "#FFFFFF" }} />
        <TextWidget text="موعد" style={{ fontSize: 11, color: "#FFFFFFCC" }} />
        <TextWidget text={`${data.done} منجَز`} style={{ fontSize: 11, color: "#FFFFFFCC" }} />
      </FlexWidget>
    </FlexWidget>
  );
}
