import { FlexWidget, TextWidget } from "react-native-android-widget";
import { DEFAULT_SIZE, fitText, textW, type WSize } from "@/widgets/fit";
import type { TasksWidgetData } from "@/widgets/widgetData";

const DOT = { high: "#E32D0B", normal: "#6366F1", low: "#9A9A9A" } as const;
const PAD = 14;
/** ارتفاع الصف مع هامشه (حشوة 6×2 + نص ~18 + هامش 4) */
const ROW_H = 34;

/** ودجت المهام المفتوحة: الأهم أولًا، نقطة لون للأولوية. عنوان المهمة يُقاس مقابل المساحة المتبقية بعد موعدها */
export function TasksWidget({ data, size = DEFAULT_SIZE }: { data: TasksWidgetData; size?: WSize }) {
  const room = size.w - PAD * 2;
  const title = fitText("المهام", room * 0.5, 16, 12);
  const open = fitText(`${data.open} مفتوحة`, room * 0.44, 12, 9);
  // الصفوف المتّسعة: الارتفاع − حشوتان − الترويسة (~28)
  const rows = Math.max(1, Math.floor((size.h - PAD * 2 - 28) / ROW_H));
  const shown = data.items.slice(0, rows);

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: "match_parent", width: "match_parent", flexDirection: "column", backgroundColor: "#FFFFFF", borderRadius: 28, padding: PAD }}
    >
      <FlexWidget style={{ width: "match_parent", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <TextWidget text={title.text} maxLines={1} truncate="END" style={{ fontSize: title.size, fontWeight: "700", color: "#111111" }} />
        <TextWidget text={open.text} maxLines={1} truncate="END" style={{ fontSize: open.size, fontWeight: "600", color: "#6366F1" }} />
      </FlexWidget>
      {data.items.length === 0 ? (
        <FlexWidget style={{ width: "match_parent", flex: 1, justifyContent: "center", alignItems: "center" }}>
          <TextWidget text="لا مهام معلّقة 🎉" style={{ fontSize: 13, color: "#9A9A9A" }} />
        </FlexWidget>
      ) : (
        shown.map((t, i) => {
          const dueW = t.due ? textW(t.due, 11) + 8 : 0;
          // الصف الداخلي: الودجت − حشوته − حشوة الصف (10×2) − النقطة وهوامشها (16) − الموعد
          const titleRoom = Math.max(40, size.w - PAD * 2 - 20 - 16 - dueW - 8);
          const tt = fitText(t.title, titleRoom, 13, 11);
          return (
            <FlexWidget
              key={i}
              style={{ width: "match_parent", flexDirection: "row", alignItems: "center", backgroundColor: "#F4F4F4", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 4 }}
            >
              <FlexWidget style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: DOT[t.priority], marginHorizontal: 4 }} />
              <TextWidget text={tt.text} truncate="END" maxLines={1} style={{ fontSize: tt.size, color: "#111111", flex: 1 }} />
              {t.due ? <TextWidget text={t.due} maxLines={1} style={{ fontSize: 11, color: "#9A9A9A", marginHorizontal: 4 }} /> : null}
            </FlexWidget>
          );
        })
      )}
    </FlexWidget>
  );
}
