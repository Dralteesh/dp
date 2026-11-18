import { useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import {
  HOLD_SECONDS,
  MATH_ROUNDS,
  makeMathProblem,
  normalizeDigits,
  randomPhrase,
} from "@/lib/alarmChallenge";
import type { AlarmChallenge } from "@/types";

type Props = { kind: Exclude<AlarmChallenge, "none">; onSolved: () => void };

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"];

/** مسائل حسابية متتالية بلوحة أرقام مخصّصة (لا لوحة مفاتيح النظام) */
function MathChallenge({ onSolved }: { onSolved: () => void }) {
  const [problem, setProblem] = useState(makeMathProblem);
  const [input, setInput] = useState("");
  const [round, setRound] = useState(0);
  const [wrong, setWrong] = useState(false);

  const submit = () => {
    if (!input) return;
    if (Number(input) === problem.answer) {
      if (round + 1 >= MATH_ROUNDS) {
        onSolved();
        return;
      }
      setRound(round + 1);
    } else {
      setWrong(true);
      setRound(0); // خطأ = ابدأ من جديد
    }
    setProblem(makeMathProblem());
    setInput("");
  };

  const press = (k: string) => {
    setWrong(false);
    if (k === "⌫") setInput((v) => v.slice(0, -1));
    else if (k === "✓") submit();
    else setInput((v) => (v.length < 5 ? v + k : v));
  };

  return (
    <View className="w-full items-center">
      <Text className="text-red-100 text-sm mb-1">
        المسألة {round + 1} من {MATH_ROUNDS}
        {wrong ? " • إجابة خاطئة، بدأنا من جديد" : ""}
      </Text>
      <Text w="bold" className="text-white text-5xl leading-[64px]" style={{ writingDirection: "ltr" }}>
        {problem.text}
      </Text>
      <View className="rounded-2xl px-8 py-2 my-3 min-w-[160px] items-center" style={{ backgroundColor: "rgba(255,255,255,0.22)" }}>
        <Text w="bold" className="text-white text-4xl leading-[52px]" style={{ fontVariant: ["tabular-nums"] }}>
          {input || "؟"}
        </Text>
      </View>
      <View className="flex-row flex-wrap justify-center" style={{ width: 270, gap: 10, direction: "ltr" }}>
        {KEYS.map((k) => (
          <Pressable
            key={k}
            onPress={() => press(k)}
            style={{
              width: 80,
              height: 52,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: k === "✓" ? "#FFFFFF" : "rgba(255,255,255,0.2)",
            }}
          >
            <Text w="bold" style={{ fontSize: 24, color: k === "✓" ? "#C2410C" : "#FFFFFF" }}>
              {k}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** اضغط باستمرار HOLD_SECONDS ثانية؛ رفع الإصبع يعيد العدّ من الصفر */
function HoldChallenge({ onSolved }: { onSolved: () => void }) {
  const [secs, setSecs] = useState(0);
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const solved = useRef(false);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setHolding(false);
    if (!solved.current) setSecs(0);
  };
  const start = () => {
    if (timer.current) return;
    setHolding(true);
    const t0 = Date.now();
    timer.current = setInterval(() => {
      const s = (Date.now() - t0) / 1000;
      setSecs(s);
      if (s >= HOLD_SECONDS && !solved.current) {
        solved.current = true;
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        onSolved();
      }
    }, 100);
  };
  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const pct = Math.min(1, secs / HOLD_SECONDS);
  return (
    <View className="items-center">
      <Text w="semi" className="text-red-100 mb-4">
        اضغط مطوّلًا على الزر ولا ترفع إصبعك
      </Text>
      <Pressable onPressIn={start} onPressOut={stop}>
        <View
          style={{
            width: 190,
            height: 190,
            borderRadius: 95,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: holding ? "#FFFFFF" : "rgba(255,255,255,0.25)",
            borderWidth: 6,
            borderColor: "rgba(255,255,255,0.5)",
            overflow: "hidden",
          }}
        >
          <View
            style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${pct * 100}%`, backgroundColor: "#FDBA74" }}
          />
          <Text w="bold" style={{ fontSize: 44, color: holding ? "#C2410C" : "#FFFFFF" }}>
            {Math.max(0, Math.ceil(HOLD_SECONDS - secs))}
          </Text>
          <Ionicons name="finger-print" size={30} color={holding ? "#C2410C" : "#FFFFFF"} />
        </View>
      </Pressable>
    </View>
  );
}

/** اكتب الجملة المعروضة كما هي */
function PhraseChallenge({ onSolved }: { onSolved: () => void }) {
  const [phrase] = useState(randomPhrase);
  const [text, setText] = useState("");
  const clean = (s: string) => normalizeDigits(s).replace(/\s+/g, " ").trim();

  return (
    <View className="w-full items-center px-2">
      <Text className="text-red-100 mb-2">اكتب الجملة التالية بالضبط</Text>
      <Text w="bold" className="text-white text-2xl text-center leading-[40px] mb-4">
        {phrase}
      </Text>
      <TextInput
        value={text}
        onChangeText={(v) => {
          setText(v);
          if (clean(v) === clean(phrase)) onSolved();
        }}
        autoFocus
        autoCorrect={false}
        placeholder="اكتب هنا"
        placeholderTextColor="rgba(255,255,255,0.55)"
        style={{
          width: "100%",
          borderRadius: 18,
          paddingHorizontal: 16,
          paddingVertical: 12,
          fontSize: 20,
          color: "#FFFFFF",
          textAlign: "right",
          backgroundColor: "rgba(255,255,255,0.22)",
          fontFamily: "Cairo_600SemiBold",
        }}
      />
    </View>
  );
}

export function ChallengeView({ kind, onSolved }: Props) {
  if (kind === "math") return <MathChallenge onSolved={onSolved} />;
  if (kind === "hold") return <HoldChallenge onSolved={onSolved} />;
  return <PhraseChallenge onSolved={onSolved} />;
}
