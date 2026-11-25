import { FlexWidget, TextWidget } from "react-native-android-widget";
import { DEFAULT_SIZE, fitFont, fitText, type WSize } from "@/widgets/fit";
import type { CountdownWidgetData } from "@/widgets/widgetData";

const PAD = 12;
const open = (id?: string) => ({
  clickAction: "OPEN_URI" as const,
  clickActionData: { uri: id ? `doctorplanner://countdowns/${id}` : "doctorplanner://countdowns" },
});

/** ودجت لحظتي القادمة: رقم كبير بلون اللحظة. النصوص تُقاس مقابل مقاس الودجت كي لا تُقصّ */
export function CountdownWidget({ data, size = DEFAULT_SIZE }: { data: CountdownWidgetData; size?: WSize }) {
  const it = data.items[0];
  const room = size.w - PAD * 2;
  if (!it) {
    return (
      <FlexWidget {...open()} style={{ height: "match_parent", width: "match_parent", backgroundColor: "#312E81", borderRadius: 28, justifyContent: "center", alignItems: "center", padding: PAD }}>
        <TextWidget text="لا لحظات قادمة" style={{ fontSize: 14, color: "#FFFFFF" }} />
        <TextWidget text="اضغط لإضافة لحظة" style={{ fontSize: 11, color: "#C7D2FE" }} />
      </FlexWidget>
    );
  }
  const title = fitText(`${it.emoji} ${it.title}`, room, 14, 10);
  const valueSize = fitFont(it.value, room, Math.max(24, Math.min(46, size.h * 0.4)), 18);
  const sub = fitText(`${it.unit} ${it.caption}`.trim(), room, 12, 9);
  return (
    <FlexWidget {...open(it.id)} style={{ height: "match_parent", width: "match_parent", backgroundColor: it.color, borderRadius: 28, padding: PAD, flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
      <TextWidget text={title.text} maxLines={1} truncate="END" style={{ fontSize: title.size, fontWeight: "700", color: it.ink }} />
      <TextWidget text={it.value} maxLines={1} style={{ fontSize: valueSize, fontWeight: "700", color: it.ink }} />
      <TextWidget text={sub.text} maxLines={1} truncate="END" style={{ fontSize: sub.size, color: it.ink }} />
    </FlexWidget>
  );
}
