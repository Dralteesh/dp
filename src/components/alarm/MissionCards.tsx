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

/** نفس ترتيب تصميم Missions: 6 بطاقات؛ المشي والضغط قريبًا (يحتاجان حسّاسات إضافية) */
const MISSIONS: Mission[] = [
  { key: "math", label: "حساب" },
  { key: "memory", label: "ذاكرة" },
  { key: "phrase", label: "كتابة" },
  { key: "shake", label: "هزّ" },
  { key: "walk", label: "مشي", soon: true },
  { key: "pushups", label: "ضغط", soon: true },
];

const W = 120;
const H = 80;

function Art({ kind }: { kind: Mission["key"] }) {
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
      {kind === "walk" && (
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
    </Svg>
  );
}

type Props = {
  value: AlarmChallenge;
  onSelect: (k: AlarmChallenge) => void;
  /** ضغط مطوّل = تجربة المهمة */
  onPreview: (k: Exclude<AlarmChallenge, "none">) => void;
};

/** شبكة بطاقات المهمات (تصميم Missions): اضغط للاختيار، اضغط مطوّلًا للتجربة */
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
              onLongPress={() => onPreview(m.key as Exclude<AlarmChallenge, "none">)}
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

      {/* خيارات إضافية خارج التصميم الأصلي: ضغط مطوّل وبدون مهمة */}
      <View style={{ flexDirection: "row", gap, marginTop: gap }}>
        {(["hold", "none"] as const).map((k) => {
          const on = value === k;
          const m = CHALLENGE_LABELS[k];
          return (
            <Pressable
              key={k}
              onPress={() => onSelect(k)}
              onLongPress={k === "none" ? undefined : () => onPreview(k)}
              style={{
                width: cw,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 14,
                paddingVertical: 14,
                borderRadius: 20,
                backgroundColor: "#fff",
                borderWidth: 3,
                borderColor: on ? RED : "#E7E5DE",
              }}
            >
              <Ionicons name={m.icon as never} size={22} color={on ? RED : "#64748B"} />
              <Text w="bold" style={{ flex: 1 }}>
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
