import { FlexWidget, TextWidget } from "react-native-android-widget";
import { DEFAULT_SIZE, fitText, type WSize } from "@/widgets/fit";
import type { QuranWidgetData } from "@/widgets/widgetData";

const PAD = 16;

/** ودجت «تابع القراءة»: آخر سورة وصفحة، بلون ورق المصحف (اسم السورة يصغّر خطه ليتّسع كاملًا) */
export function QuranWidget({ data, size = DEFAULT_SIZE }: { data: QuranWidgetData; size?: WSize }) {
  const room = size.w - PAD * 2;
  const title = fitText("تابع القراءة", room, 13, 10);
  const surah = fitText(`سورة ${data.surah}`, room, 22, 14);
  const page = fitText(`الصفحة ${data.page} من 604`, room, 13, 10);
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
        backgroundGradient: { from: "#F6EBD3", to: "#E8D5A8", orientation: "TOP_BOTTOM" },
      }}
    >
      <TextWidget text={title.text} maxLines={1} truncate="END" style={{ fontSize: title.size, fontWeight: "600", color: "#7A6A4F" }} />
      <FlexWidget style={{ flexDirection: "column" }}>
        <TextWidget text={surah.text} maxLines={1} truncate="END" style={{ fontSize: surah.size, fontWeight: "700", color: "#2B1D0E" }} />
        <TextWidget text={page.text} maxLines={1} truncate="END" style={{ fontSize: page.size, color: "#B8860B", fontWeight: "600" }} />
      </FlexWidget>
    </FlexWidget>
  );
}
