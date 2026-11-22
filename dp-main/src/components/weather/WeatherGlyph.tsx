import { useId } from "react";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { kindOf } from "@/lib/weather";

/** أيقونة طقس لامعة (سحابة بيضاء بتدرّج + شمس/قمر/مطر/برق/ثلج) بأسلوب ثلاثي الأبعاد مبسّط */
export function WeatherGlyph({ code, isDay = true, size = 120 }: { code: number; isDay?: boolean; size?: number }) {
  const k = kindOf(code);
  const id = "w" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const cloudFill = k === "storm" ? `url(#${id}cs)` : `url(#${id}c)`;

  /** سحابة بإحداثيات مضبوطة يدويًا (إزاحة dx/dy وقياس s) دون الاعتماد على transform */
  const cloud = (dx = 0, dy = 0, s = 1, fill = cloudFill, o = 1) => (
    <G opacity={o}>
      <Rect x={dx + 14 * s} y={dy + 48 * s} width={72 * s} height={28 * s} rx={14 * s} fill={fill} />
      <Circle cx={dx + 36 * s} cy={dy + 48 * s} r={16 * s} fill={fill} />
      <Circle cx={dx + 58 * s} cy={dy + 42 * s} r={20 * s} fill={fill} />
      <Ellipse cx={dx + 50 * s} cy={dy + 40 * s} rx={22 * s} ry={8 * s} fill="#FFFFFF" opacity={0.35} />
    </G>
  );

  const sun = (cx: number, cy: number, r: number) => (
    <G>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const rad = (a * Math.PI) / 180;
        return (
          <Path
            key={a}
            d={`M ${cx + Math.cos(rad) * (r + 5)} ${cy + Math.sin(rad) * (r + 5)} L ${cx + Math.cos(rad) * (r + 12)} ${cy + Math.sin(rad) * (r + 12)}`}
            stroke="#FFC933"
            strokeWidth={4}
            strokeLinecap="round"
          />
        );
      })}
      <Circle cx={cx} cy={cy} r={r} fill={`url(#${id}s)`} />
    </G>
  );

  const moon = (cx: number, cy: number, r: number) => (
    <G>
      <Circle cx={cx} cy={cy} r={r} fill={`url(#${id}m)`} />
      <Circle cx={cx - r * 0.3} cy={cy - r * 0.2} r={r * 0.18} fill="#E6D48A" opacity={0.8} />
      <Circle cx={cx + r * 0.35} cy={cy + r * 0.3} r={r * 0.12} fill="#E6D48A" opacity={0.8} />
    </G>
  );

  const drops = (n: number, long: boolean) =>
    Array.from({ length: n }, (_, i) => {
      const x = 34 + i * (32 / Math.max(n - 1, 1)) * (n > 1 ? 1 : 0) + (n === 1 ? 16 : 0);
      return <Path key={i} d={`M ${x} 80 L ${x - 5} ${long ? 94 : 90}`} stroke="#7DD3FC" strokeWidth={4.5} strokeLinecap="round" />;
    });

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`${id}c`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#CFDDF5" />
        </LinearGradient>
        <LinearGradient id={`${id}cs`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F3F4FA" />
          <Stop offset="1" stopColor="#B7BCD6" />
        </LinearGradient>
        <RadialGradient id={`${id}s`} cx="40%" cy="35%" r="70%">
          <Stop offset="0" stopColor="#FFF1A8" />
          <Stop offset="1" stopColor="#FFB300" />
        </RadialGradient>
        <RadialGradient id={`${id}m`} cx="40%" cy="35%" r="70%">
          <Stop offset="0" stopColor="#FFF7D1" />
          <Stop offset="1" stopColor="#F3D977" />
        </RadialGradient>
        <LinearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFF27A" />
          <Stop offset="1" stopColor="#FFB800" />
        </LinearGradient>
      </Defs>

      {k === "clear" && (isDay ? sun(50, 50, 22) : (
        <>
          {moon(50, 50, 26)}
          {[[20, 24], [82, 30], [76, 78], [24, 74]].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={i % 2 ? 2 : 3} fill="#FFFFFF" opacity={0.85} />
          ))}
        </>
      ))}

      {k === "partly" && (
        <>
          {isDay ? sun(36, 36, 18) : moon(34, 34, 18)}
          {cloud(6, 6, 0.95)}
        </>
      )}

      {k === "cloudy" && (
        <>
          {cloud(-10, -14, 0.8, `url(#${id}cs)`, 0.9)}
          {cloud(8, 8, 0.95)}
        </>
      )}

      {k === "fog" && (
        <>
          {cloud(0, -8, 0.95)}
          {[72, 82, 92].map((y, i) => (
            <Path key={y} d={`M ${22 + i * 4} ${y} L ${78 - i * 6} ${y}`} stroke="#CFDDF5" strokeWidth={4.5} strokeLinecap="round" />
          ))}
        </>
      )}

      {(k === "drizzle" || k === "rain") && (
        <>
          {cloud(0, -12, 0.95)}
          {drops(k === "rain" ? 4 : 3, k === "rain")}
        </>
      )}

      {k === "snow" && (
        <>
          {cloud(0, -12, 0.95)}
          {[30, 50, 70].map((x, i) => (
            <Circle key={x} cx={x} cy={i % 2 ? 90 : 84} r={3.6} fill="#FFFFFF" />
          ))}
        </>
      )}

      {k === "storm" && (
        <>
          {cloud(0, -14, 0.95)}
          <Path d="M 54 58 L 40 80 L 50 80 L 44 98 L 66 72 L 55 72 L 62 58 Z" fill={`url(#${id}b)`} />
        </>
      )}
    </Svg>
  );
}
