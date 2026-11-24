import { FlexWidget, TextWidget } from "react-native-android-widget";
import { TYPE_META } from "@/constants/shiftTypes";
import { DEFAULT_SIZE, fitText, textW, type WSize } from "@/widgets/fit";
import type { WidgetData } from "@/widgets/widgetData";

const PAD = 12;
/** ارتفاع الصف الواحد مع هامشه (حشوة 5×2 + شريط 22 + هامش 4) */
const ROW_H = 36;

/** ودجت "جدول اليوم": أقرب العناصر بألوان الأنواع + الصلاة القادمة. الصفوف تُحدَّد بحسب الارتفاع والعناوين بحسب العرض */
export function TodayWidget({ data, size = DEFAULT_SIZE }: { data: WidgetData; size?: WSize }) {
  const room = size.w - PAD * 2;
  const date = fitText(data.dateLabel, room * 0.52, 15, 11);
  const pr = fitText(`${data.prayer.label} ${data.prayer.time}`, room * 0.44, 12, 9);

  // كم صفًّا يتّسع: الارتفاع − حشوتان − الترويسة (~26) − سطر «أخرى» (~16)
  const avail = size.h - PAD * 2 - 26 - 16;
  const rows = Math.max(1, Math.min(data.items.length, Math.floor(avail / ROW_H)));
  const shown = data.items.slice(0, rows);
  const more = data.moreCount + (data.items.length - shown.length);

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: PAD,
      }}
    >
      <FlexWidget
        style={{
          width: "match_parent",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <TextWidget text={date.text} maxLines={1} truncate="END" style={{ fontSize: date.size, fontWeight: "700", color: "#0F172A" }} />
        <TextWidget
          text={pr.text}
          maxLines={1}
          truncate="END"
          style={{ fontSize: pr.size, color: TYPE_META.private.hex as `#${string}`, fontWeight: "600" }}
        />
      </FlexWidget>

      {data.items.length === 0 ? (
        <FlexWidget style={{ width: "match_parent", flex: 1, justifyContent: "center", alignItems: "center" }}>
          <TextWidget text="لا مواعيد متبقية اليوم" style={{ fontSize: 13, color: "#64748B" }} />
        </FlexWidget>
      ) : (
        shown.map((it) => {
          const m = TYPE_META[it.type];
          const timeW = textW(it.timeLabel, 12) + 8;
          // عرض الصف الداخلي: الودجت − حشوة الودجت − حشوة الصف (8×2) − الشريط وهوامشه (14) − الوقت
          const titleRoom = Math.max(40, size.w - PAD * 2 - 16 - 14 - timeW - 8);
          const title = fitText(it.title, titleRoom, 13, 11);
          return (
            <FlexWidget
              key={it.key}
              style={{
                width: "match_parent",
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: m.soft as `#${string}`,
                borderRadius: 12,
                paddingHorizontal: 8,
                paddingVertical: 5,
                marginBottom: 4,
              }}
            >
              <FlexWidget
                style={{
                  width: 6,
                  height: 22,
                  borderRadius: 3,
                  backgroundColor: m.hex as `#${string}`,
                  marginHorizontal: 4,
                }}
              />
              <TextWidget
                text={it.timeLabel}
                maxLines={1}
                style={{ fontSize: 12, fontWeight: "700", color: m.inkHex as `#${string}`, marginHorizontal: 4 }}
              />
              <TextWidget text={title.text} truncate="END" maxLines={1} style={{ fontSize: title.size, color: "#0F172A" }} />
            </FlexWidget>
          );
        })
      )}

      {more > 0 ? <TextWidget text={`+${more} أخرى`} style={{ fontSize: 11, color: "#64748B" }} /> : null}
    </FlexWidget>
  );
}
