import { FlexWidget, TextWidget } from "react-native-android-widget";
import { TYPE_META } from "@/constants/shiftTypes";
import type { WidgetData } from "@/widgets/widgetData";

/** ودجت "جدول اليوم": يعرض أقرب 4 عناصر بألوان الأنواع + الصلاة القادمة */
export function TodayWidget({ data }: { data: WidgetData }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 12,
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
        <TextWidget
          text={data.dateLabel}
          style={{ fontSize: 15, fontWeight: "700", color: "#0F172A" }}
        />
        <TextWidget
          text={`${data.prayer.label} ${data.prayer.time}`}
          style={{ fontSize: 12, color: TYPE_META.private.hex as `#${string}`, fontWeight: "600" }}
        />
      </FlexWidget>

      {data.items.length === 0 ? (
        <FlexWidget
          style={{ width: "match_parent", flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <TextWidget text="لا مواعيد متبقية اليوم" style={{ fontSize: 13, color: "#64748B" }} />
        </FlexWidget>
      ) : (
        data.items.map((it) => {
          const m = TYPE_META[it.type];
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
                style={{ fontSize: 12, fontWeight: "700", color: m.inkHex as `#${string}`, marginHorizontal: 4 }}
              />
              <TextWidget
                text={it.title}
                truncate="END"
                maxLines={1}
                style={{ fontSize: 13, color: "#0F172A" }}
              />
            </FlexWidget>
          );
        })
      )}

      {data.moreCount > 0 ? (
        <TextWidget text={`+${data.moreCount} أخرى`} style={{ fontSize: 11, color: "#64748B" }} />
      ) : null}
    </FlexWidget>
  );
}
