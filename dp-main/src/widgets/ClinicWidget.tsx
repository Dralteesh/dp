import { FlexWidget, TextWidget } from "react-native-android-widget";
import { DEFAULT_SIZE, fitText, textW, type WSize } from "@/widgets/fit";
import type { ClinicWidgetData } from "@/widgets/widgetData";

const PAD = 16;
const GAP = 10;

/** ودجت العيادة: عدد مواعيد اليوم والمنجَز والموعد التالي (عرض عمود النص محسوب فلا يُقصّ اسم المريض) */
export function ClinicWidget({ data, size = DEFAULT_SIZE }: { data: ClinicWidgetData; size?: WSize }) {
  const totalStr = String(data.total);
  const doneStr = `${data.done} منجَز`;
  // صندوق الإحصاء: أعرض نص فيه + حشوة أفقية 14×2
  const boxInner = Math.max(textW(totalStr, 34), textW("موعد", 11), textW(doneStr, 11));
  const boxW = boxInner + 28;
  const room = Math.max(60, size.w - PAD * 2 - boxW - GAP);

  const title = fitText("العيادة اليوم", room, 13, 10);
  const nextT = data.next ? fitText(`التالي ${data.next.time}`, room, 12, 9) : null;
  const patient = data.next ? fitText(data.next.patient, room, 17, 12) : null;
  const proc = data.next ? fitText(data.next.procedure, room, 12, 9) : null;
  const emptyT = !data.next ? fitText(data.total === 0 ? "لا مواعيد اليوم" : "انتهت مواعيد اليوم", room, 16, 11) : null;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 28,
        padding: PAD,
        backgroundGradient: { from: "#14B8A6", to: "#0E6FA5", orientation: "TOP_BOTTOM" },
      }}
    >
      <FlexWidget style={{ width: room, height: "match_parent", flexDirection: "column", justifyContent: "space-between" }}>
        <TextWidget text={title.text} maxLines={1} truncate="END" style={{ fontSize: title.size, fontWeight: "600", color: "#FFFFFFCC" }} />
        {data.next && nextT && patient && proc ? (
          <FlexWidget style={{ flexDirection: "column" }}>
            <TextWidget text={nextT.text} maxLines={1} truncate="END" style={{ fontSize: nextT.size, color: "#FFFFFFCC" }} />
            <TextWidget text={patient.text} maxLines={1} truncate="END" style={{ fontSize: patient.size, fontWeight: "700", color: "#FFFFFF" }} />
            <TextWidget text={proc.text} maxLines={1} truncate="END" style={{ fontSize: proc.size, color: "#FFFFFFCC" }} />
          </FlexWidget>
        ) : emptyT ? (
          <TextWidget text={emptyT.text} maxLines={1} truncate="END" style={{ fontSize: emptyT.size, fontWeight: "700", color: "#FFFFFF" }} />
        ) : null}
      </FlexWidget>
      <FlexWidget
        style={{
          width: boxW,
          marginStart: GAP,
          flexDirection: "column",
          alignItems: "center",
          backgroundColor: "#FFFFFF2E",
          borderRadius: 22,
          paddingVertical: 10,
        }}
      >
        <TextWidget text={totalStr} style={{ fontSize: 34, fontWeight: "700", color: "#FFFFFF" }} />
        <TextWidget text="موعد" style={{ fontSize: 11, color: "#FFFFFFCC" }} />
        <TextWidget text={doneStr} style={{ fontSize: 11, color: "#FFFFFFCC" }} />
      </FlexWidget>
    </FlexWidget>
  );
}
