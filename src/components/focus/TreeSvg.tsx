import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from "react-native-svg";
import { SPECIES, type Species } from "@/store/useFocus";

type Props = {
  species: Species;
  /** 0 بذرة، 1 نبتة، 2 فسيلة، 3 شجرة كاملة */
  stage: 0 | 1 | 2 | 3;
  withered?: boolean;
  size?: number;
};

/** شجرة بالمتجهات: تنمو عبر 4 مراحل، وتذبل بلون بنّي رمادي */
export function TreeSvg({ species, stage, withered, size = 120 }: Props) {
  const sp = SPECIES[species];
  const leaf = withered ? "#A39A8A" : sp.leaf;
  const leaf2 = withered ? "#B7AE9E" : sp.leaf2;
  const trunk = withered ? "#6E6256" : sp.trunk;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* التربة */}
      <Ellipse cx={50} cy={90} rx={30} ry={7} fill="#B58B5A" opacity={0.55} />
      <Ellipse cx={50} cy={88} rx={20} ry={5} fill="#8E6A41" />

      {stage === 0 ? <Ellipse cx={50} cy={82} rx={5} ry={3.5} fill="#5B3F22" /> : null}

      {stage === 1 ? (
        <G>
          <Rect x={49} y={66} width={2.5} height={20} rx={1} fill={trunk} />
          <Ellipse cx={44} cy={66} rx={7} ry={4} fill={leaf} transform="rotate(-25 44 66)" />
          <Ellipse cx={57} cy={63} rx={7} ry={4} fill={leaf2} transform="rotate(25 57 63)" />
        </G>
      ) : null}

      {stage === 2 ? (
        <G>
          <Rect x={47.5} y={50} width={5} height={37} rx={2} fill={trunk} />
          <Circle cx={50} cy={46} r={15} fill={leaf} />
          <Circle cx={40} cy={52} r={9} fill={leaf2} />
          <Circle cx={60} cy={52} r={9} fill={leaf2} />
        </G>
      ) : null}

      {stage === 3 ? (
        <G>
          <Rect x={46} y={46} width={8} height={42} rx={3} fill={trunk} />
          {species === "pine" ? (
            <G>
              <Polygon points="50,6 72,38 28,38" fill={leaf} />
              <Polygon points="50,20 78,56 22,56" fill={leaf2} />
              <Polygon points="50,34 82,72 18,72" fill={leaf} />
            </G>
          ) : species === "tooth" ? (
            <G>
              <Path
                d="M30 30 C30 12 70 12 70 30 C70 44 62 48 60 62 C58 74 54 74 52 62 C50 56 50 56 48 62 C46 74 42 74 40 62 C38 48 30 44 30 30 Z"
                fill={leaf2}
                stroke={withered ? "#8C8272" : "#9FB6C6"}
                strokeWidth={2.5}
              />
              <Path d="M40 28 C42 22 48 21 50 23" stroke="#9FB6C6" strokeWidth={2} fill="none" strokeLinecap="round" />
            </G>
          ) : (
            <G>
              <Circle cx={50} cy={34} r={22} fill={leaf} />
              <Circle cx={32} cy={46} r={15} fill={leaf2} />
              <Circle cx={68} cy={46} r={15} fill={leaf2} />
              <Circle cx={50} cy={22} r={13} fill={leaf2} />
              {species === "olive"
                ? [[38, 40], [60, 30], [54, 50], [44, 24]].map(([x, y], i) => <Ellipse key={i} cx={x} cy={y} rx={2.4} ry={3.4} fill={withered ? "#6E6256" : "#4A5B1F"} />)
                : null}
              {species === "cherry"
                ? [[36, 36], [62, 28], [58, 50], [44, 22], [70, 44]].map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={3} fill={withered ? "#8C8272" : "#E04F7C"} />)
                : null}
            </G>
          )}
        </G>
      ) : null}
    </Svg>
  );
}

export const stageOf = (progress: number): 0 | 1 | 2 | 3 => (progress < 0.12 ? 0 : progress < 0.4 ? 1 : progress < 0.75 ? 2 : 3);
