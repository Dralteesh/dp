import Svg, { Circle, Ellipse, Path } from "react-native-svg";

const INK = "#111111";

/** بيضة مرسومة بـ SVG، مع وجه مبتسم اختياريًا (من تصميم Clucky) */
export function Egg({
  width: w,
  height: h,
  color,
  face,
  outlined = false,
}: {
  width: number;
  height: number;
  color: string;
  face: boolean;
  outlined?: boolean;
}) {
  const eyeR = w * 0.055;
  const eyeY = h * 0.52;
  const cx = w * 0.5;
  const cy = h * 0.62;
  const rx = w * 0.1;
  const ry = h * 0.07;
  const k = Math.cos((20 * Math.PI) / 180);
  const sn = Math.sin((20 * Math.PI) / 180);
  const smile = `M ${cx + rx * k} ${cy + ry * sn} A ${rx} ${ry} 0 0 1 ${cx - rx * k} ${cy + ry * sn}`;
  return (
    <Svg width={w} height={h}>
      <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={color} />
      {outlined && (
        <Ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 1} ry={h / 2 - 1} fill="none" stroke="#E2E2E2" strokeWidth={2} />
      )}
      {face && (
        <>
          <Circle cx={w * 0.34} cy={eyeY} r={eyeR} fill={INK} />
          <Circle cx={w * 0.66} cy={eyeY} r={eyeR} fill={INK} />
          <Path d={smile} stroke={INK} strokeWidth={1.6} fill="none" strokeLinecap="butt" />
        </>
      )}
    </Svg>
  );
}
