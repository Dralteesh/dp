import { StyleSheet } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { SKIN } from "@/constants/skin";

/** خلفية الشاشات: تدرّج سماوي ناعم مع دائرتين شفافتين (بدون مكتبات جديدة) */
export function SkyBackground() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none" preserveAspectRatio="none" viewBox="0 0 100 200">
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={SKIN.bgTop} />
          <Stop offset="0.45" stopColor={SKIN.bg} />
          <Stop offset="1" stopColor="#F8FCFF" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="200" fill="url(#sky)" />
      <Circle cx="92" cy="14" r="26" fill="#CFE8F7" opacity={0.35} />
      <Circle cx="6" cy="190" r="30" fill="#CFE8F7" opacity={0.3} />
    </Svg>
  );
}
