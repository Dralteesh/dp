import type { ReactNode } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { CHALLENGE_LABELS } from "@/lib/alarmChallenge";
import type { AlarmChallenge } from "@/types";

const CARD_BG = "#17140F";
const YELLOW = "#FFB800";
const ORANGE = "#D9480F";
const CREAM = "#F3EBDD";
const RED = "#E32D0B";

type Mission = { key: AlarmChallenge | "walk" | "pushups"; label: string; soon?: boolean };
type ArtKind = Mission["key"];

/** نفس ترتيب تصميم Missions: 6 بطاقات؛ المشي والضغط قريبًا (يحتاجان حسّاسات إضافية) */
const MISSIONS: Mission[] = [
  { key: "math", label: "حساب" },
  { key: "memory", label: "ذاكرة" },
  { key: "phrase", label: "كتابة" },
  { key: "shake", label: "هزّ" },
  { key: "steps", label: "مشي" },
  { key: "qr", label: "باركود" },
  { key: "photo", label: "صورة" },
  { key: "location", label: "موقع" },
  { key: "pushups", label: "ضغط", soon: true },
  { key: "hold", label: CHALLENGE_LABELS.hold.label },
  { key: "none", label: CHALLENGE_LABELS.none.label },
];

const W = 120;
const H = 80;

function Art({ kind }: { kind: ArtKind }) {
  return (
    <Svg width={W} height={H} viewBox="0 0 120 80">
      {kind === "math" && (
        <>
          <Rect x={10} y={34} width={46} height={46} rx={10} fill={YELLOW} rotation={-8} origin="33, 57" />
          <Rect x={22} y={55} width={22} height={4} rx={2} fill={CARD_BG} />
          <Circle cx={33} cy={47} r={2.6} fill={CARD_BG} />
          <Circle cx={33} cy={67} r={2.6} fill={CARD_BG} />
          <Rect x={62} y={8} width={46} height={46} rx={12} fill={ORANGE} rotation={10} origin="85, 31" />
          <Rect x={74} y={29} width={22} height={5} rx={2} fill="#fff" />
          <Rect x={82.5} y={20.5} width={5} height={22} rx={2} fill="#fff" />
        </>
      )}
      {kind === "memory" && (
        <>
          <Rect x={8} y={44} width={12} height={12} rx={3} fill={ORANGE} />
          <Rect x={36} y={16} width={74} height={70} rx={12} fill={YELLOW} />
          {[0, 1, 2].flatMap((r) =>
            [0, 1, 2].map((c) => (
              <Rect key={`${r}${c}`} x={44 + c * 22} y={24 + r * 20} width={16} height={14} rx={4} fill="#C98F00" />
            )),
          )}
        </>
      )}
      {kind === "phrase" && (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <Rect key={`a${i}`} x={14 + i * 20} y={22} width={16} height={16} rx={4} fill={i === 3 ? "#fff" : CREAM} />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <Rect key={`b${i}`} x={22 + i * 20} y={42} width={16} height={16} rx={4} fill={i === 2 ? YELLOW : CREAM} />
          ))}
          <Rect x={92} y={42} width={16} height={16} rx={4} fill={ORANGE} />
          <Rect x={26} y={62} width={68} height={14} rx={4} fill={CREAM} />
        </>
      )}
      {kind === "shake" && (
        <>
          <Rect x={46} y={4} width={34} height={72} rx={9} fill="#fff" rotation={14} origin="63, 40" />
          <Rect x={58} y={12} width={12} height={5} rx={2.5} fill={CARD_BG} rotation={14} origin="63, 40" />
          <Path d="M32 24 Q22 40 32 56" stroke={YELLOW} strokeWidth={4} strokeLinecap="round" fill="none" />
          <Path d="M20 18 Q6 40 20 62" stroke={YELLOW} strokeWidth={4} strokeLinecap="round" fill="none" />
          <Path d="M98 24 Q108 40 98 56" stroke={YELLOW} strokeWidth={4} strokeLinecap="round" fill="none" />
          <Path d="M110 18 Q124 40 110 62" stroke={YELLOW} strokeWidth={4} strokeLinecap="round" fill="none" />
        </>
      )}
      {(kind === "walk" || kind === "steps") && (
        <>
          <Circle cx={60} cy={14} r={8} fill={CREAM} />
          <Path
            d="M60 26 L56 48 M56 48 L46 72 M56 48 L68 60 L66 76 M58 32 L74 40 M58 32 L44 44"
            stroke={CREAM}
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </>
      )}
      {kind === "qr" && (
        <>
          <Rect x={30} y={14} width={26} height={26} rx={5} fill={CREAM} />
          <Rect x={64} y={14} width={26} height={26} rx={5} fill={YELLOW} />
          <Rect x={30} y={48} width={26} height={26} rx={5} fill={ORANGE} />
          <Rect x={66} y={50} width={10} height={10} rx={2} fill={CREAM} />
          <Rect x={80} y={62} width={10} height={10} rx={2} fill={CREAM} />
        </>
      )}
      {kind === "photo" && (
        <>
          <Rect x={18} y={26} width={84} height={48} rx={12} fill={CREAM} />
          <Rect x={42} y={16} width={30} height={14} rx={5} fill={CREAM} />
          <Circle cx={60} cy={50} r={16} fill={ORANGE} />
          <Circle cx={60} cy={50} r={7} fill={YELLOW} />
        </>
      )}
      {kind === "location" && (
        <>
          <Path d="M60 76 C40 52 34 44 34 32 A26 26 0 0 1 86 32 C86 44 80 52 60 76 Z" fill={ORANGE} />
          <Circle cx={60} cy={32} r={10} fill={CREAM} />
          <Circle cx={96} cy={66} r={5} fill={YELLOW} />
        </>
      )}
      {kind === "pushups" && (
        <>
          <Circle cx={20} cy={58} r={9} fill={CREAM} />
          <Path
            d="M30 62 L74 48 L112 40 M52 56 L56 76"
            stroke={CREAM}
            strokeWidth={9}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </>
      )}
      {kind === "hold" && (
        <>
          <Circle cx={60} cy={44} r={34} stroke={YELLOW} strokeWidth={4} fill="none" strokeDasharray="10 8" strokeLinecap="round" />
          <Circle cx={60} cy={44} r={22} stroke={ORANGE} strokeWidth={4} fill="none" />
          <Circle cx={60} cy={44} r={11} fill={CREAM} />
          <Circle cx={60} cy={44} r={4} fill={RED} />
        </>
      )}
      {kind === "none" && (
        <>
          <Circle cx={60} cy={44} r={28} stroke={CREAM} strokeWidth={7} fill="none" />
          <Path d="M40 64 L80 24" stroke={ORANGE} strokeWidth={7} strokeLinecap="round" />
          <Circle cx={16} cy={20} r={5} fill={YELLOW} />
        </>
      )}
    </Svg>
  );
}

type Props = {
  value: AlarmChallenge;
  onSelect: (k: AlarmChallenge) => void;
  /** ضغط مطوّل = تجربة المهمة */
  onPreview: (k: Exclude<AlarmChallenge, "none">) => void;
};

/** شبكة بطاقات المهمات (تصميم Missions) بما فيها «ضغط مطوّل» و«بدون»: اضغط للاختيار، اضغط مطوّلًا للتجربة */
export function MissionCards({ value, onSelect, onPreview }: Props) {
  const { width } = useWindowDimensions();
  const gap = 12;
  const cw = Math.floor((width - 40 - gap) / 2);

  return (
    <View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
        {MISSIONS.map((m) => {
          const on = !m.soon && value === m.key;
          return (
            <Pressable
              key={m.key}
              disabled={m.soon}
              accessibilityLabel={m.label}
              onPress={() => onSelect(m.key as AlarmChallenge)}
              onLongPress={m.key === "none" ? undefined : () => onPreview(m.key as Exclude<AlarmChallenge, "none">)}
              style={{
                width: cw,
                height: 116,
                borderRadius: 26,
                backgroundColor: CARD_BG,
                overflow: "hidden",
                borderWidth: 3,
                borderColor: on ? RED : "transparent",
                opacity: m.soon ? 0.5 : 1,
              }}
            >
              <Text w="bold" style={{ position: "absolute", top: 12, start: 14, color: "#fff", fontSize: 16 }}>
                {m.label}
              </Text>
              {m.soon ? (
                <View style={{ position: "absolute", top: 40, start: 14, backgroundColor: "#3A352B", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text w="semi" style={{ color: CREAM, fontSize: 11 }}>
                    قريبًا
                  </Text>
                </View>
              ) : null}
              {on ? (
                <View style={{ position: "absolute", top: 10, end: 12 }}>
                  <Ionicons name="checkmark-circle" size={22} color={RED} />
                </View>
              ) : null}
              <View style={{ position: "absolute", bottom: 0, end: 0, direction: "ltr" }}>
                <Art kind={m.key} />
              </View>
            </Pressable>
          );
        })}
      </View>

    </View>
  );
}

/* ───────── بطاقات الغفوة (مدة + عدد) بنفس أسلوب التصميم ───────── */

function pie(cx: number, cy: number, r: number, frac: number) {
  if (frac >= 1) return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
  const a = frac * Math.PI * 2;
  const x = cx + r * Math.sin(a);
  const y = cy - r * Math.cos(a);
  return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${x} ${y} Z`;
}

/** يصغّر الخط تلقائيًا حتى لا تُقتطع الكلمة داخل البطاقة الصغيرة (مثل «ممنوعة») */
const fitFont = (text: string, room: number, base: number) =>
  Math.max(11, Math.min(base, Math.floor(room / Math.max(1, text.length * 0.55))));

function SmallCard({
  w,
  label,
  sub,
  on,
  onPress,
  children,
}: {
  w: number;
  label: string;
  sub?: string;
  on: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  // عرض النص المتاح = عرض البطاقة − هامشين (والحرف الصغير «د» إن وُجد)
  const room = w - 20 - (sub ? 14 : 0);
  const fs = fitFont(label, room, 20);
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={sub ? `${label} ${sub}` : label}
      style={{ width: w, height: 96, borderRadius: 22, backgroundColor: CARD_BG, overflow: "hidden", borderWidth: 3, borderColor: on ? RED : "transparent" }}
    >
      <View style={{ position: "absolute", top: 8, start: 10, end: 10, flexDirection: "row", alignItems: "baseline", gap: 3 }}>
        <Text
          w="bold"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={{ color: "#fff", fontSize: fs, lineHeight: Math.round(fs * 1.5), flexShrink: 1, includeFontPadding: false }}
        >
          {label}
        </Text>
        {sub ? (
          <Text w="semi" style={{ color: CREAM, fontSize: 12 }}>
            {sub}
          </Text>
        ) : null}
      </View>
      {/* علامة الاختيار أسفل البطاقة كي لا تزاحم الكلمة في الأعلى */}
      {on ? (
        <View style={{ position: "absolute", bottom: 6, start: 6 }}>
          <Ionicons name="checkmark-circle" size={16} color={RED} />
        </View>
      ) : null}
      <View style={{ position: "absolute", bottom: 6, end: 8, direction: "ltr" }}>{children}</View>
    </Pressable>
  );
}

/** عدد الغفوات: نقاط بعدد الغفوات، و«ممنوعة» بدائرة مشطوبة */
export function SnoozeCountCards({ options, value, onSelect }: { options: number[]; value: number; onSelect: (v: number) => void }) {
  const { width } = useWindowDimensions();
  const gap = 10;
  const cw = Math.floor((width - 40 - gap * (options.length - 1)) / options.length);
  return (
    <View style={{ flexDirection: "row", gap }}>
      {options.map((v) => (
        <SmallCard key={v} w={cw} label={v === 0 ? "ممنوعة" : String(v)} on={value === v} onPress={() => onSelect(v)}>
          <Svg width={44} height={44} viewBox="0 0 44 44">
            {v === 0 ? (
              <>
                <Circle cx={22} cy={22} r={15} stroke={CREAM} strokeWidth={5} fill="none" />
                <Path d="M12 32 L32 12" stroke={ORANGE} strokeWidth={5} strokeLinecap="round" />
              </>
            ) : (
              Array.from({ length: Math.min(v, 6) }, (_, i) => (
                <Circle key={i} cx={10 + (i % 3) * 12} cy={v > 3 ? (i < 3 ? 14 : 30) : 22} r={5} fill={i % 2 === 0 ? YELLOW : ORANGE} />
              ))
            )}
          </Svg>
        </SmallCard>
      ))}
    </View>
  );
}
