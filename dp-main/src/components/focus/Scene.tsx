import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { SkyGradient } from "@/components/prayer/PrayerScene";
import { StarField } from "@/components/prayer/StarField";

export type Sky = { colors: [string, string, string]; night: boolean };

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
export function lerpHex(a: string, b: string, t: number): string {
  const x = hex(a);
  const y = hex(b);
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
export function lerpSky(a: Sky, b: Sky, t: number): Sky {
  return {
    colors: [lerpHex(a.colors[0], b.colors[0], t), lerpHex(a.colors[1], b.colors[1], t), lerpHex(a.colors[2], b.colors[2], t)],
    night: t < 0.5 ? a.night : b.night,
  };
}

/** صندوق مشهد: سماء متدرّجة + نجوم ليلًا + تلّة خضراء في القاع */
export function SceneBox({
  sky,
  height,
  radius = 32,
  ground = true,
  children,
}: {
  sky: Sky;
  height?: number | string;
  radius?: number;
  ground?: boolean;
  children?: ReactNode;
}) {
  return (
    <View style={{ borderRadius: radius, overflow: "hidden", height: height as number | undefined }}>
      <SkyGradient colors={sky.colors} />
      {sky.night ? <StarField /> : null}
      {ground ? (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 90 }}>
          <Svg width="100%" height="100%" viewBox="0 0 400 90" preserveAspectRatio="none">
            <Path d="M0 38 Q100 8 210 30 T400 22 V90 H0Z" fill={sky.night ? "#1E4D36" : "#5FAE6A"} />
            <Path d="M0 58 Q130 34 250 54 T400 48 V90 H0Z" fill={sky.night ? "#163C2A" : "#3E8F52"} />
          </Svg>
        </View>
      ) : null}
      {children}
    </View>
  );
}
