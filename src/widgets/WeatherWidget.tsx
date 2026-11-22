import { FlexWidget, SvgWidget, TextWidget } from "react-native-android-widget";
import { illustrationSvg, kindGradient } from "@/lib/weatherSvg";
import type { WeatherWidgetData } from "@/widgets/widgetData";

/** ودجت الطقس: بطاقة ملوّنة بحسب الحالة + رسمة مجسّمة (8 رسومات: شمس، قمر، غائم، مطر، ثلج، عاصفة، ضباب، غائم جزئيًا) */
export function WeatherWidget({ data }: { data: WeatherWidgetData }) {
  const bg = kindGradient(data.kind, data.isDay)[0] as `#${string}`;
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: "match_parent", width: "match_parent", flexDirection: "column", backgroundColor: bg, borderRadius: 28, padding: 14 }}
    >
      <FlexWidget style={{ width: "match_parent", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <FlexWidget style={{ flexDirection: "column" }}>
          <TextWidget text={data.city} style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF" }} />
          <TextWidget text={data.dateLabel} style={{ fontSize: 12, color: "#E6EEFF" }} />
        </FlexWidget>
        <FlexWidget style={{ flexDirection: "column", alignItems: "flex-end" }}>
          <TextWidget text={data.temp} style={{ fontSize: 34, fontWeight: "700", color: "#FFFFFF" }} />
          <TextWidget text={data.label} style={{ fontSize: 13, fontWeight: "600", color: "#FFFFFF" }} />
        </FlexWidget>
      </FlexWidget>
      <SvgWidget svg={illustrationSvg(data.kind, data.isDay)} style={{ width: "match_parent", height: 96 }} />
    </FlexWidget>
  );
}
