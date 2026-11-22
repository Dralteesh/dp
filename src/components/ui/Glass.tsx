import { useId, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
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
  return (
    <View
      style={[
        { borderRadius: radius, overflow: "hidden" },
        colors ? null : { backgroundColor: DS.glass, borderWidth: 1, borderColor: DS.glassBorder },
        style,
      ]}
    >
      {colors ? (
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors[0]} />
              <Stop offset="1" stopColor={colors[1]} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gid})`} />
        </Svg>
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
