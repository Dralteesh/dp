import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { gradientColors } from "@/lib/countdown/presets";
import type { Countdown } from "@/types/countdown";

type Props = {
  cd: Countdown;
  /** true: يشغّل الفيديو (شاشة التفاصيل فقط). في البطاقات يُعرض تدرّج بدلًا منه */
  animate?: boolean;
};

/** خلفية العدّادات: لون، تدرّج (SVG)، صورة، أو فيديو، مع تعتيم لقراءة النص */
export function CountdownBackground({ cd, animate }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const { kind, uri, dim = 0.35 } = cd.bg;
  const overlay = <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#000", opacity: dim }]} />;

  if (kind === "image" && uri && !imgFailed) {
    return (
      <>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setImgFailed(true)} />
        {overlay}
      </>
    );
  }
  if (kind === "video" && uri && animate) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { VideoBg } = require("./VideoBg");
    return (
      <>
        <VideoBg uri={uri} />
        {overlay}
      </>
    );
  }
  if (kind === "color") return <View style={[StyleSheet.absoluteFill, { backgroundColor: cd.color }]} />;

  const [c1, c2] = gradientColors(cd);
  const gid = `g${cd.id}`;
  return (
    <>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c1} />
            <Stop offset="1" stopColor={c2} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gid})`} />
      </Svg>
      {(kind === "image" || kind === "video") && overlay}
    </>
  );
}
