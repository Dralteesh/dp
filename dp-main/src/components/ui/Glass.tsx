import { useId, useState, type ReactNode } from "react";
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { DS } from "@/design/tokens";

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** تدرّج رأسي (أعلى، أسفل). بدونه تظهر بطاقة زجاجية شفافة */
  colors?: [string, string];
  radius?: number;
};

/** بطاقة بلغة التصميم الموحّدة: زجاجية على الخلفية الكحلية أو بتدرّج لوني */
export function Glass({ children, style, colors, radius = DS.rCard }: Props) {
  const gid = "g" + useId().replace(/[^a-zA-Z0-9]/g, "");
  // أبعاد البطاقة الفعلية: نرسم التدرّج بأرقام صريحة بدل "100%" لأن النسب كانت تُقاس خطأً
  // (مع RTL + المعمارية الجديدة) فيظهر التدرّج أصغر من البطاقة ومزاحًا عنها.
  const [box, setBox] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((b) => (Math.abs(b.w - width) < 0.5 && Math.abs(b.h - height) < 0.5 ? b : { w: width, h: height }));
  };
  return (
    <View
      onLayout={colors ? onLayout : undefined}
      style={[
        { borderRadius: radius, overflow: "hidden" },
        // لون احتياطي يملأ البطاقة كاملة حتى لو تأخّر رسم التدرّج
        colors ? { backgroundColor: colors[1] } : { backgroundColor: DS.glass, borderWidth: 1, borderColor: DS.glassBorder },
        style,
      ]}
    >
      {colors && box.w > 0 && box.h > 0 ? (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: box.w, height: box.h, direction: "ltr" }}>
          <Svg width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`}>
            <Defs>
              <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors[0]} />
                <Stop offset="1" stopColor={colors[1]} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width={box.w} height={box.h} fill={`url(#${gid})`} />
          </Svg>
        </View>
      ) : null}
      {colors ? (
        <View
          pointerEvents="none"
          style={{ position: "absolute", top: -radius, start: -radius, width: radius * 5, height: radius * 3, borderRadius: radius * 3, backgroundColor: "#FFFFFF", opacity: 0.07 }}
        />
      ) : null}
      {children}
    </View>
  );
}
