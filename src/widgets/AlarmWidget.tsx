import { FlexWidget, TextWidget } from "react-native-android-widget";
import type { AlarmWidgetData } from "@/widgets/widgetData";

/** ودجت المنبّه القادم: خلفية نيلية بنفس لغة صفحة المنبّه، والوقت كبير */
export function AlarmWidget({ data }: { data: AlarmWidgetData }) {
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
        backgroundGradient: { from: "#4C4FD0", to: "#0F1B3D", orientation: "TOP_BOTTOM" },
      }}
    >
      <FlexWidget style={{ width: "match_parent", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <TextWidget text="المنبّه القادم" style={{ fontSize: 13, fontWeight: "600", color: "#FFFFFFB3" }} />
        <TextWidget text={`${data.activeCount} فعّال`} style={{ fontSize: 12, color: "#FFFFFF99" }} />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: "column" }}>
        <TextWidget text={data.time} style={{ fontSize: 38, fontWeight: "700", color: "#FFFFFF" }} />
        <TextWidget
          text={data.label ? `${data.when} • ${data.label}` : data.when}
          truncate="END"
          maxLines={1}
          style={{ fontSize: 13, color: "#FFFFFFCC" }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
