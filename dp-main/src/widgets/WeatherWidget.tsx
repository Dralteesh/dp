import { FlexWidget, SvgWidget, TextWidget } from "react-native-android-widget";
import { illustrationSvg, kindGradient } from "@/lib/weatherSvg";
import { DEFAULT_SIZE, fitText, type WSize } from "@/widgets/fit";
import type { WeatherWidgetData } from "@/widgets/widgetData";

const PADX = 16;
const GAP = 8;

/** ودجت الطقس: سماء متدرّجة بلون الحالة. عرض الرسمة وأحجام الخطوط يتبعان مقاس الودجت فلا يُقصّ نص */
export function WeatherWidget({ data, size = DEFAULT_SIZE }: { data: WeatherWidgetData; size?: WSize }) {
  const [top, bottom] = kindGradient(data.kind, data.isDay);
  // الرسمة: لا تتجاوز ثلث العرض ولا ارتفاع الودجت، وتختفي في العروض الضيقة جدًا
  const maxByH = Math.floor((size.h - 20) / 0.95);
  const illusW = size.w < 190 ? 0 : Math.max(64, Math.min(128, Math.floor(size.w * 0.34), maxByH));
  const illusH = Math.round(illusW * 0.95);
  const room = size.w - PADX * 2 - (illusW ? illusW + GAP : 0);
  const compact = size.h < 120;

  const city = fitText(data.city, room, 16, 11);
  const date = fitText(data.dateLabel, room, 12, 9);
  const temp = fitText(data.temp, room, compact ? 36 : 44, 24);
  const label = fitText(data.label, room, 14, 10);

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 28,
        paddingHorizontal: PADX,
        paddingVertical: 10,
        backgroundGradient: { from: top as `#${string}`, to: bottom as `#${string}`, orientation: "TOP_BOTTOM" },
      }}
    >
      <FlexWidget style={{ width: room, height: "match_parent", flexDirection: "column", justifyContent: "space-between" }}>
        <FlexWidget style={{ flexDirection: "column" }}>
          <TextWidget text={city.text} maxLines={1} truncate="END" style={{ fontSize: city.size, fontWeight: "700", color: "#FFFFFF" }} />
          <TextWidget text={date.text} maxLines={1} truncate="END" style={{ fontSize: date.size, color: "#FFFFFFCC" }} />
        </FlexWidget>
        <FlexWidget style={{ flexDirection: "column" }}>
          <TextWidget text={temp.text} maxLines={1} truncate="END" style={{ fontSize: temp.size, fontWeight: "700", color: "#FFFFFF" }} />
          <TextWidget text={label.text} maxLines={1} truncate="END" style={{ fontSize: label.size, fontWeight: "600", color: "#FFFFFF" }} />
        </FlexWidget>
      </FlexWidget>
      {illusW ? (
        <SvgWidget svg={illustrationSvg(data.kind, data.isDay)} style={{ width: illusW, height: illusH, marginStart: GAP }} />
      ) : null}
    </FlexWidget>
  );
}
