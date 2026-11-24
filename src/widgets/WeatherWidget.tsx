import { FlexWidget, SvgWidget, TextWidget } from "react-native-android-widget";
import { illustrationSvg, kindGradient } from "@/lib/weatherSvg";
import type { WeatherWidgetData } from "@/widgets/widgetData";

/** ودجت الطقس: سماء متدرّجة بلون الحالة، نص أبيض واضح، ورسمة مجسّمة كبيرة بلا قصّ */
export function WeatherWidget({ data }: { data: WeatherWidgetData }) {
  const [top, bottom] = kindGradient(data.kind, data.isDay);
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 28,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundGradient: { from: top as `#${string}`, to: bottom as `#${string}`, orientation: "TOP_BOTTOM" },
      }}
    >
      <FlexWidget style={{ flex: 1, height: "match_parent", flexDirection: "column", justifyContent: "space-between" }}>
        <FlexWidget style={{ flexDirection: "column" }}>
          <TextWidget text={data.city} style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }} />
          <TextWidget text={data.dateLabel} style={{ fontSize: 12, color: "#FFFFFFCC" }} />
        </FlexWidget>
        <FlexWidget style={{ flexDirection: "column" }}>
          <TextWidget text={data.temp} style={{ fontSize: 44, fontWeight: "700", color: "#FFFFFF" }} />
          <TextWidget text={data.label} style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }} />
        </FlexWidget>
      </FlexWidget>
      <SvgWidget svg={illustrationSvg(data.kind, data.isDay)} style={{ width: 128, height: 122 }} />
    </FlexWidget>
  );
}
