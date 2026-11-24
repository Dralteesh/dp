import { FlexWidget, TextWidget } from "react-native-android-widget";
import type { TasksWidgetData } from "@/widgets/widgetData";

const DOT = { high: "#E32D0B", normal: "#6366F1", low: "#9A9A9A" } as const;

/** ودجت المهام المفتوحة: الأهم أولًا، نقطة لون للأولوية */
export function TasksWidget({ data }: { data: TasksWidgetData }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: "match_parent", width: "match_parent", flexDirection: "column", backgroundColor: "#FFFFFF", borderRadius: 28, padding: 14 }}
    >
      <FlexWidget style={{ width: "match_parent", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <TextWidget text="المهام" style={{ fontSize: 16, fontWeight: "700", color: "#111111" }} />
        <TextWidget text={`${data.open} مفتوحة`} style={{ fontSize: 12, fontWeight: "600", color: "#6366F1" }} />
      </FlexWidget>
      {data.items.length === 0 ? (
        <FlexWidget style={{ width: "match_parent", flex: 1, justifyContent: "center", alignItems: "center" }}>
          <TextWidget text="لا مهام معلّقة 🎉" style={{ fontSize: 13, color: "#9A9A9A" }} />
        </FlexWidget>
      ) : (
        data.items.map((t, i) => (
          <FlexWidget
            key={i}
            style={{ width: "match_parent", flexDirection: "row", alignItems: "center", backgroundColor: "#F4F4F4", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 4 }}
          >
            <FlexWidget style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: DOT[t.priority], marginHorizontal: 4 }} />
            <TextWidget text={t.title} truncate="END" maxLines={1} style={{ fontSize: 13, color: "#111111", flex: 1 }} />
            {t.due ? <TextWidget text={t.due} style={{ fontSize: 11, color: "#9A9A9A", marginHorizontal: 4 }} /> : null}
          </FlexWidget>
        ))
      )}
    </FlexWidget>
  );
}
