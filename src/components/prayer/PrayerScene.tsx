import { memo, useId, type ReactNode } from "react";
import { StyleSheet } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Mask,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { PRAYER_THEMES } from "@/constants/prayerThemes";
import type { PrayerKey } from "@/types";

const cleanId = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "");

/** تدرّج السماء يملأ الحاوية */
export function SkyGradient({ colors }: { colors: [string, string, string] }) {
  const id = cleanId(useId());
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors[0]} />
          <Stop offset="0.55" stopColor={colors[1]} />
          <Stop offset="1" stopColor={colors[2]} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

// نوافذ مقوّسة للمسجد القريب: [x, القاع, العرض, الارتفاع]
const WINDOWS: [number, number, number, number][] = [
  [227, 292, 8, 18],
  [243, 292, 8, 18],
  [259, 292, 8, 18],
  [275, 292, 8, 18],
  [291, 292, 8, 18],
  [326, 215, 5, 12],
  [326, 255, 5, 12],
  [192, 292, 7, 14],
  [10, 292, 6, 10],
  [46, 292, 6, 10],
];
const arch = (x: number, b: number, w: number, h: number) =>
  `M${x} ${b}v${-(h - w / 2)}a${w / 2} ${w / 2} 0 0 1 ${w} 0v${h - w / 2}z`;

/** أبنية بعيدة (تُرسم مرتين بحجمين وشفافيتين لعمق المشهد) */
function Far({ fill, opacity, transform }: { fill: string; opacity: number; transform: string }) {
  return (
    <G fill={fill} opacity={opacity} transform={transform}>
      <Path d="M10 300v-80a30 30 0 0 1 60 0v80z" />
      <Rect x={95} y={170} width={9} height={130} />
      <Path d="M93 170l6.5-20 6.5 20z" />
      <Path d="M120 300v-60a22 22 0 0 1 44 0v60z" />
      <Path d="M165 300v-95a38 38 0 0 1 76 0v95z" />
      <Rect x={201} y={140} width={3} height={27} />
      <Rect x={255} y={190} width={9} height={110} />
      <Path d="M253 190l6.5-20 6.5 20z" />
      <Path d="M280 300v-70a26 26 0 0 1 52 0v70z" />
      <Rect x={340} y={200} width={9} height={100} />
      <Path d="M338 200l6.5-18 6.5 18z" />
    </G>
  );
}

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`} fill="#FFFFFF" opacity={0.26}>
      <Ellipse rx={34} ry={9} />
      <Ellipse cx={-14} cy={-8} rx={18} ry={10} />
      <Ellipse cx={12} cy={-10} rx={22} ry={12} />
    </G>
  );
}

type Props = {
  sky: PrayerKey;
  /** تقدّم الوقت نحو الصلاة القادمة (0..1): يُرسم كمدار حول الشمس أو القمر */
  progress?: number;
  /** screen: المشهد الكامل. card: نسخة مصغّرة لبطاقة اليوم */
  variant?: "screen" | "card";
};

/** مشهد الصلاة: سماء + شمس/قمر + مدار تقدّم + طبقات مباني + نوافذ مضيئة (قبة ومئذنة) */
export function PrayerScene({ sky, progress = 0, variant = "screen" }: Props) {
  const id = cleanId(useId());
  const t = PRAYER_THEMES[sky];
  const small = variant === "card";
  const warm = !t.night;
  const cx = small ? 110 : 150;
  const cy = small ? 64 : t.discY;
  const last = t.sky[2];
  const p = Math.min(1, Math.max(0, progress));

  const R = 98;
  const C = 2 * Math.PI * R;
  const ang = (-90 + p * 360) * (Math.PI / 180);

  const rays: string[] = [];
  if (t.rays && !small) {
    for (let i = -4; i <= 4; i++) {
      const a = (-90 + i * 13) * (Math.PI / 180);
      const d = 0.075;
      const L = 320;
      rays.push(
        `M${cx} ${cy}L${(cx + Math.cos(a - d) * L).toFixed(0)} ${(cy + Math.sin(a - d) * L).toFixed(0)}L${(
          cx +
          Math.cos(a + d) * L
        ).toFixed(0)} ${(cy + Math.sin(a + d) * L).toFixed(0)}z`,
      );
    }
  }

  return (
    <Svg width="100%" height="100%" viewBox="0 0 360 300" preserveAspectRatio="xMidYMax meet">
      <Defs>
        <RadialGradient id={`${id}g`} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={small ? 90 : 150}>
          <Stop offset="0" stopColor={warm ? "#fff3b0" : "#cfd6ff"} stopOpacity={0.75} />
          <Stop offset="1" stopColor={warm ? "#ffd36b" : "#8c8cff"} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${id}d`} gradientUnits="userSpaceOnUse" cx={cx - 8} cy={cy - 8} r={42}>
          <Stop offset="0" stopColor={warm ? "#fffbe0" : "#ffffff"} />
          <Stop offset="1" stopColor={warm ? "#ffc94d" : "#d7dcff"} />
        </RadialGradient>
        <LinearGradient id={`${id}h`} gradientUnits="userSpaceOnUse" x1="0" y1="170" x2="0" y2="300">
          <Stop offset="0" stopColor={last} stopOpacity={0} />
          <Stop offset="1" stopColor={last} stopOpacity={0.75} />
        </LinearGradient>
        <Mask id={`${id}m`} maskUnits="userSpaceOnUse" x="0" y="0" width="360" height="300">
          <Rect width="360" height="300" fill="#000000" />
          <Circle cx={cx} cy={cy} r={30} fill="#FFFFFF" />
          <Circle cx={cx + 14} cy={cy - 7} r={26} fill="#000000" />
        </Mask>
      </Defs>

      {/* توهّج */}
      <Circle cx={cx} cy={cy} r={small ? 90 : 150} fill={`url(#${id}g)`} opacity={warm ? 0.8 : 0.45} />

      {/* أشعة (الشروق والمغرب) */}
      {rays.map((d, i) => (
        <Path key={i} d={d} fill="#FFFFFF" opacity={0.07} />
      ))}

      {/* مدار التقدّم */}
      {!small ? (
        <>
          <Circle cx={cx} cy={cy} r={R} fill="none" stroke="#FFFFFF" strokeOpacity={0.2} strokeWidth={1.5} />
          <Circle
            cx={cx}
            cy={cy}
            r={R}
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity={0.75}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={`${(C * p).toFixed(1)} ${C.toFixed(1)}`}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          <Circle cx={cx + Math.cos(ang) * R} cy={cy + Math.sin(ang) * R} r={4.5} fill="#FFFFFF" />
        </>
      ) : null}

      <Circle cx={cx} cy={cy} r={62} fill="#FFFFFF" opacity={0.1} />

      {/* شمس أو هلال */}
      {warm ? (
        <Circle cx={cx} cy={cy} r={sky === "maghrib" ? 42 : 30} fill={`url(#${id}d)`} />
      ) : (
        <Rect width="360" height="300" fill={`url(#${id}d)`} mask={`url(#${id}m)`} />
      )}

      {/* سحب وطيور */}
      {t.clouds && !small ? (
        <>
          <Cloud x={70} y={cy + 14} s={1} />
          <Cloud x={262} y={cy - 34} s={0.8} />
          <Cloud x={310} y={cy + 46} s={1.1} />
        </>
      ) : null}
      {t.birds && !small ? (
        <G fill="none" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" opacity={0.7}>
          <Path d="M240 70q4-5 8 0q4-5 8 0" />
          <Path d="M262 58q3-4 6 0q3-4 6 0" />
          <Path d="M222 88q3-4 6 0q3-4 6 0" />
        </G>
      ) : null}

      {/* طبقات العمق + ضباب الأفق */}
      <Far fill={t.solid} opacity={0.2} transform="translate(-10 75) scale(.75)" />
      <Far fill={t.solid} opacity={0.4} transform="translate(60 36) scale(.88)" />
      <Rect y={170} width="360" height="130" fill={`url(#${id}h)`} />

      {/* المسجد القريب: قبة كبيرة + مئذنة + قبة صغيرة + أسطح منخفضة */}
      <G fill={t.solid} opacity={0.93}>
        <Path d="M215 300v-70a45 45 0 0 1 90 0v70z" />
        <Rect x={259} y={172} width={2} height={14} />
        <Circle cx={260} cy={168} r={4} />
        <Rect x={322} y={190} width={14} height={110} />
        <Path d="M319 190l10-26 10 26z" />
        <Path d="M175 300v-42a25 25 0 0 1 50 0v42z" />
        <Rect x={198} y={226} width={2} height={8} />
        <Path d="M0 300v-34h22v-20h14v20h26v-28a18 18 0 0 1 36 0v28h30v34z" />
      </G>
      <G fill={t.win} fillOpacity={t.winOpacity}>
        {WINDOWS.map((w, i) => (
          <Path key={i} d={arch(...w)} />
        ))}
      </G>
    </Svg>
  );
}


// ======================================================================
// نسخة الشاشة المقسّمة إلى طبقات: تتيح وضع غيوم الطقس بين الشمس/القمر وأفق المباني،
// وتخفيت التوهّج بسلاسة دون المساس بمدار التقدّم. كلها تشترك في نفس الصندوق والمقياس.
// ======================================================================

/** صندوق SVG مطابق لمقاس PrayerScene يملأ الحاوية، لتتراكب الطبقات بالتطابق التام */
function LayerBox({ children }: { children: ReactNode }) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 360 300" preserveAspectRatio="xMidYMax meet">
      {children}
    </Svg>
  );
}

/** توهّج الشمس/القمر + الأشعة + الهالة (الطبقة الأبعد: تُخفَّت عند الغيوم) */
export const SceneGlow = memo(function SceneGlow({ sky }: { sky: PrayerKey }) {
  const id = cleanId(useId());
  const t = PRAYER_THEMES[sky];
  const warm = !t.night;
  const cx = 150;
  const cy = t.discY;

  const rays: string[] = [];
  if (t.rays) {
    for (let i = -4; i <= 4; i++) {
      const a = (-90 + i * 13) * (Math.PI / 180);
      const d = 0.075;
      const L = 320;
      rays.push(
        `M${cx} ${cy}L${(cx + Math.cos(a - d) * L).toFixed(0)} ${(cy + Math.sin(a - d) * L).toFixed(0)}L${(
          cx +
          Math.cos(a + d) * L
        ).toFixed(0)} ${(cy + Math.sin(a + d) * L).toFixed(0)}z`,
      );
    }
  }

  return (
    <LayerBox>
      <Defs>
        <RadialGradient id={`${id}g`} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={150}>
          <Stop offset="0" stopColor={warm ? "#fff3b0" : "#cfd6ff"} stopOpacity={0.75} />
          <Stop offset="1" stopColor={warm ? "#ffd36b" : "#8c8cff"} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={cx} cy={cy} r={150} fill={`url(#${id}g)`} opacity={warm ? 0.8 : 0.45} />
      {rays.map((d, i) => (
        <Path key={i} d={d} fill="#FFFFFF" opacity={0.07} />
      ))}
      <Circle cx={cx} cy={cy} r={62} fill="#FFFFFF" opacity={0.1} />
    </LayerBox>
  );
});

/** قرص الشمس أو هلال القمر */
export const SceneDisc = memo(function SceneDisc({ sky }: { sky: PrayerKey }) {
  const id = cleanId(useId());
  const t = PRAYER_THEMES[sky];
  const warm = !t.night;
  const cx = 150;
  const cy = t.discY;
  return (
    <LayerBox>
      <Defs>
        <RadialGradient id={`${id}d`} gradientUnits="userSpaceOnUse" cx={cx - 8} cy={cy - 8} r={42}>
          <Stop offset="0" stopColor={warm ? "#fffbe0" : "#ffffff"} />
          <Stop offset="1" stopColor={warm ? "#ffc94d" : "#d7dcff"} />
        </RadialGradient>
        <Mask id={`${id}m`} maskUnits="userSpaceOnUse" x="0" y="0" width="360" height="300">
          <Rect width="360" height="300" fill="#000000" />
          <Circle cx={cx} cy={cy} r={30} fill="#FFFFFF" />
          <Circle cx={cx + 14} cy={cy - 7} r={26} fill="#000000" />
        </Mask>
      </Defs>
      {warm ? (
        <Circle cx={cx} cy={cy} r={sky === "maghrib" ? 42 : 30} fill={`url(#${id}d)`} />
      ) : (
        <Rect width="360" height="300" fill={`url(#${id}d)`} mask={`url(#${id}m)`} />
      )}
    </LayerBox>
  );
});

/** مدار التقدّم نحو الصلاة القادمة (يبقى ظاهرًا فوق الغيوم لأنه قراءة مهمة) */
export function SceneRing({ sky, progress = 0 }: { sky: PrayerKey; progress?: number }) {
  const t = PRAYER_THEMES[sky];
  const cx = 150;
  const cy = t.discY;
  const p = Math.min(1, Math.max(0, progress));
  const R = 98;
  const C = 2 * Math.PI * R;
  const ang = (-90 + p * 360) * (Math.PI / 180);
  return (
    <LayerBox>
      <Circle cx={cx} cy={cy} r={R} fill="none" stroke="#FFFFFF" strokeOpacity={0.2} strokeWidth={1.5} />
      <Circle
        cx={cx}
        cy={cy}
        r={R}
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity={0.75}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={`${(C * p).toFixed(1)} ${C.toFixed(1)}`}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <Circle cx={cx + Math.cos(ang) * R} cy={cy + Math.sin(ang) * R} r={4.5} fill="#FFFFFF" />
    </LayerBox>
  );
}

/** الأفق: طبقات المباني البعيدة + ضباب الأفق + المسجد القريب بنوافذه المضيئة */
export const SceneFront = memo(function SceneFront({ sky }: { sky: PrayerKey }) {
  const id = cleanId(useId());
  const t = PRAYER_THEMES[sky];
  const last = t.sky[2];
  return (
    <LayerBox>
      <Defs>
        <LinearGradient id={`${id}h`} gradientUnits="userSpaceOnUse" x1="0" y1="170" x2="0" y2="300">
          <Stop offset="0" stopColor={last} stopOpacity={0} />
          <Stop offset="1" stopColor={last} stopOpacity={0.75} />
        </LinearGradient>
      </Defs>
      <Far fill={t.solid} opacity={0.2} transform="translate(-10 75) scale(.75)" />
      <Far fill={t.solid} opacity={0.4} transform="translate(60 36) scale(.88)" />
      <Rect y={170} width="360" height="130" fill={`url(#${id}h)`} />
      <G fill={t.solid} opacity={0.93}>
        <Path d="M215 300v-70a45 45 0 0 1 90 0v70z" />
        <Rect x={259} y={172} width={2} height={14} />
        <Circle cx={260} cy={168} r={4} />
        <Rect x={322} y={190} width={14} height={110} />
        <Path d="M319 190l10-26 10 26z" />
        <Path d="M175 300v-42a25 25 0 0 1 50 0v42z" />
        <Rect x={198} y={226} width={2} height={8} />
        <Path d="M0 300v-34h22v-20h14v20h26v-28a18 18 0 0 1 36 0v28h30v34z" />
      </G>
      <G fill={t.win} fillOpacity={t.winOpacity}>
        {WINDOWS.map((w, i) => (
          <Path key={i} d={arch(...w)} />
        ))}
      </G>
    </LayerBox>
  );
});
