import { FlexWidget, TextWidget } from "react-native-android-widget";
import { DEFAULT_SIZE, fitText, textW, type WSize } from "@/widgets/fit";
import type { CountdownWidgetData } from "@/widgets/widgetData";

const PAD = 14;
const ROW_H = 34;

/** ودجت قائمة لحظاتي: عدد الصفوف يتبع ارتفاع الودجت، وعنوان كل لحظة يُقاس بعد حجز مكان رقمها */
export function CountdownListWidget({ data, size = DEFAULT_SIZE }: { data: CountdownWidgetData; size?: WSize }) {
  const room = size.w - PAD * 2;
  const head = fitText("لحظاتي", room * 0.5, 16, 12);
  const count = fitText(data.total > 0 ? `${data.total} قادمة` : "", room * 0.4, 12, 9);
  const rows = Math.max(1, Math.floor((size.h - PAD * 2 - 28) / ROW_H));
  const shown = data.items.slice(0, rows);
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: "doctorplanner://countdowns" }}
      style={{ height: "match_parent", width: "match_parent", flexDirection: "column", backgroundColor: "#0F1B3D", borderRadius: 28, padding: PAD }}
    >
      <FlexWidget style={{ width: "match_parent", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <TextWidget text={head.text} maxLines={1} style={{ fontSize: head.size, fontWeight: "700", color: "#FFFFFF" }} />
        <TextWidget text={count.text} maxLines={1} style={{ fontSize: count.size, color: "#A5B4FC" }} />
      </FlexWidget>
      {shown.length === 0 ? (
        <FlexWidget style={{ width: "match_parent", flex: 1, justifyContent: "center", alignItems: "center" }}>
          <TextWidget text="لا لحظات قادمة" style={{ fontSize: 13, color: "#A5B4FC" }} />
        </FlexWidget>
      ) : (
        shown.map((it) => {
          const val = `${it.value} ${it.unit}`.trim();
          const valW = textW(val, 13) + 8;
          // عرض الصف − حشوته (10×2) − الإيموجي وهوامشه (30) − مكان الرقم
          const titleRoom = Math.max(40, size.w - PAD * 2 - 20 - 30 - valW - 8);
          const t = fitText(it.title, titleRoom, 13, 10);
          return (
            <FlexWidget
              key={it.id}
              clickAction="OPEN_URI"
              clickActionData={{ uri: `doctorplanner://countdowns/${it.id}` }}
              style={{ width: "match_parent", flexDirection: "row", alignItems: "center", backgroundColor: it.color, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 4 }}
            >
              <TextWidget text={it.emoji} style={{ fontSize: 16, marginHorizontal: 4 }} />
              <TextWidget text={t.text} maxLines={1} truncate="END" style={{ fontSize: t.size, fontWeight: "600", color: it.ink, flex: 1 }} />
              <TextWidget text={val} maxLines={1} style={{ fontSize: 13, fontWeight: "700", color: it.ink, marginHorizontal: 4 }} />
            </FlexWidget>
          );
        })
      )}
    </FlexWidget>
  );
}
