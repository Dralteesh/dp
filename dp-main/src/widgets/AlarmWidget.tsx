import { FlexWidget, TextWidget } from "react-native-android-widget";
import { DEFAULT_SIZE, fitText, type WSize } from "@/widgets/fit";
import type { AlarmWidgetData } from "@/widgets/widgetData";

const PAD = 16;

/** ودجت المنبّه القادم: خلفية نيلية بنفس لغة صفحة المنبّه، والوقت كبير (النصوص تتكيّف مع المقاس) */
export function AlarmWidget({ data, size = DEFAULT_SIZE }: { data: AlarmWidgetData; size?: WSize }) {
  const room = size.w - PAD * 2;
  const title = fitText("المنبّه القادم", room * 0.6, 13, 10);
  const count = fitText(`${data.activeCount} فعّال`, room * 0.36, 12, 9);
  const time = fitText(data.time, room, size.h >= 100 ? 38 : 30, 22);
  const whenLine = data.label ? `${data.when} • ${data.label}` : data.when;
  const when = fitText(whenLine, room, 13, 10);
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
        backgroundGradient: { from: "#4C4FD0", to: "#0F1B3D", orientation: "TOP_BOTTOM" },
      }}
    >
      <FlexWidget style={{ width: "match_parent", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <TextWidget text={title.text} maxLines={1} truncate="END" style={{ fontSize: title.size, fontWeight: "600", color: "#FFFFFFB3" }} />
        <TextWidget text={count.text} maxLines={1} truncate="END" style={{ fontSize: count.size, color: "#FFFFFF99" }} />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: "column" }}>
        <TextWidget text={time.text} maxLines={1} truncate="END" style={{ fontSize: time.size, fontWeight: "700", color: "#FFFFFF" }} />
        <TextWidget text={when.text} maxLines={1} truncate="END" style={{ fontSize: when.size, color: "#FFFFFFCC" }} />
      </FlexWidget>
    </FlexWidget>
  );
}
