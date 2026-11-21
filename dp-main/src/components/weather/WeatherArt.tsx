import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import { kindOf, type Theme } from "@/lib/weather";

/** رسمة الحالة الكبيرة خلف الرقم (شمس/قمر/سحابة/مطر/ثلج/برق) بأشكال هندسية مسطّحة */
export function WeatherArt({ code, isDay, theme, size = 300 }: { code: number; isDay: boolean; theme: Theme; size?: number }) {
  const k = kindOf(code);
  const H = (size * 240) / 300;
  const cloud = (x: number, y: number, w: number, fill: string, o = 1) => (
    <G opacity={o}>
      <Rect x={x} y={y + w * 0.18} width={w} height={w * 0.42} rx={w * 0.21} fill={fill} />
      <Circle cx={x + w * 0.36} cy={y + w * 0.2} r={w * 0.2} fill={fill} />
      <Circle cx={x + w * 0.62} cy={y + w * 0.26} r={w * 0.15} fill={fill} />
    </G>
  );
  return (
    <Svg width={size} height={H} viewBox="0 0 300 240">
      {k === "clear" && isDay && (
        <>
          <Circle cx={190} cy={110} r={112} fill={theme.shape2} opacity={0.55} />
          <Circle cx={190} cy={110} r={92} fill={theme.shape} />
        </>
      )}
      {k === "clear" && !isDay && (
        <>
          <Circle cx={190} cy={110} r={90} fill={theme.shape} />
          <Circle cx={226} cy={86} r={80} fill={theme.bg} />
          {[[70, 40], [110, 150], [40, 120], [250, 200], [150, 20]].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={i % 2 ? 3 : 4.5} fill={theme.ink} opacity={0.8} />
          ))}
        </>
      )}
      {k === "partly" && (
        <>
          {isDay ? <Circle cx={205} cy={90} r={78} fill={theme.shape} /> : <Circle cx={205} cy={90} r={70} fill={theme.shape} />}
          {!isDay && <Circle cx={236} cy={70} r={62} fill={theme.bg} />}
          {cloud(40, 110, 200, theme.shape2)}
        </>
      )}
      {k === "cloudy" && (
        <>
          {cloud(120, 30, 170, theme.shape2, 0.9)}
          {cloud(20, 90, 230, theme.shape)}
        </>
      )}
      {k === "fog" && (
        <>
          {cloud(70, 20, 190, theme.shape2)}
          {[110, 140, 170].map((y, i) => (
            <Rect key={y} x={30 + i * 22} y={y} width={220 - i * 30} height={14} rx={7} fill={theme.shape} />
          ))}
        </>
      )}
      {(k === "rain" || k === "drizzle") && (
        <>
          {cloud(40, 20, 230, theme.shape)}
          {[70, 115, 160, 205].map((x, i) => (
            <Rect
              key={x}
              x={x}
              y={k === "rain" ? 140 + (i % 2) * 22 : 150 + (i % 2) * 18}
              width={12}
              height={k === "rain" ? 44 : 26}
              rx={6}
              fill={theme.shape2}
              transform={`rotate(18 ${x + 6} 160)`}
            />
          ))}
        </>
      )}
      {k === "snow" && (
        <>
          {cloud(40, 20, 230, theme.shape)}
          {[[80, 150], [130, 185], [180, 150], [230, 185], [105, 215], [205, 215]].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={9} fill={theme.shape2} />
          ))}
        </>
      )}
      {k === "storm" && (
        <>
          {cloud(30, 10, 250, theme.shape)}
          <Path d="M170 90 L100 190 L148 190 L122 240 L205 135 L158 135 Z" fill={theme.shape2} />
        </>
      )}
    </Svg>
  );
}
