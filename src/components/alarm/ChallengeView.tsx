import { useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Accelerometer } from "expo-sensors";
import * as Location from "expo-location";
import { Text } from "@/components/ui/Text";
import {
  HOLD_SECONDS,
  LOCATION_RADIUS_DEFAULT,
  STEPS_DEFAULT,
  distanceM,
  MATH_ROUNDS,
  MEMORY_ROUNDS,
  MEMORY_START,
  SHAKE_TARGET,
  makeMathProblem,
  makeMemorySequence,
  normalizeDigits,
  randomPhrase,
} from "@/lib/alarmChallenge";
import type { AlarmChallenge, AlarmChallengeData } from "@/types";

type Props = { kind: Exclude<AlarmChallenge, "none">; onSolved: () => void; data?: AlarmChallengeData };

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


/** تذكّر ترتيب المربعات التي أضاءت ثم أعده (3 جولات بطول 3 ثم 4 ثم 5). الخطأ يعيد من الجولة الأولى */
function MemoryChallenge({ onSolved }: { onSolved: () => void }) {
  const [round, setRound] = useState(0);
  const [seq, setSeq] = useState(() => makeMemorySequence(MEMORY_START));
  const [phase, setPhase] = useState<"show" | "input">("show");
  const [step, setStep] = useState(0);
  const [lit, setLit] = useState<number | null>(null);
  const [wrong, setWrong] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  useEffect(() => {
    setPhase("show");
    setStep(0);
    seq.forEach((cell, i) => {
      later(() => setLit(cell), 700 + i * 750);
      later(() => setLit(null), 700 + i * 750 + 500);
    });
    later(() => setPhase("input"), 700 + seq.length * 750);
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [seq]);

  const press = (i: number) => {
    if (phase !== "input") return;
    setWrong(false);
    setLit(i);
    later(() => setLit(null), 160);
    if (seq[step] === i) {
      if (step + 1 < seq.length) {
        setStep(step + 1);
      } else if (round + 1 >= MEMORY_ROUNDS) {
        onSolved();
      } else {
        setRound(round + 1);
        setSeq(makeMemorySequence(MEMORY_START + round + 1));
      }
    } else {
      setWrong(true);
      setRound(0);
      setSeq(makeMemorySequence(MEMORY_START));
    }
  };

  return (
    <View className="items-center">
      <Text className="text-red-100 text-sm mb-1">
        الجولة {round + 1} من {MEMORY_ROUNDS}
        {wrong ? " • خطأ، بدأنا من جديد" : ""}
      </Text>
      <Text w="semi" className="text-white text-lg mb-4">
        {phase === "show" ? "راقب الترتيب…" : "دورك: أعد الترتيب"}
      </Text>
      <View style={{ width: 270, flexDirection: "row", flexWrap: "wrap", gap: 10, direction: "ltr" }}>
        {Array.from({ length: 9 }, (_, i) => (
          <Pressable
            key={i}
            onPress={() => press(i)}
            style={{
              width: 83,
              height: 83,
              borderRadius: 20,
              backgroundColor: lit === i ? "#FFFFFF" : "rgba(255,255,255,0.22)",
            }}
          />
        ))}
      </View>
    </View>
  );
}

/** هزّ الهاتف SHAKE_TARGET مرة. إن لم يتوفر الحسّاس يُستبدل بالنقر حتى لا يبقى المنبّه بلا مخرج */
function ShakeChallenge({ onSolved }: { onSolved: () => void }) {
  const [count, setCount] = useState(0);
  const [sensor, setSensor] = useState(true);
  const n = useRef(0);
  const last = useRef(0);

  const bump = () => {
    n.current += 1;
    setCount(n.current);
    if (n.current === SHAKE_TARGET) onSolved();
  };

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let alive = true;
    (async () => {
      try {
        if (!(await Accelerometer.isAvailableAsync())) throw new Error("no sensor");
        Accelerometer.setUpdateInterval(80);
        sub = Accelerometer.addListener(({ x, y, z }) => {
          const g = Math.sqrt(x * x + y * y + z * z);
          const t = Date.now();
          if (alive && g > 1.9 && t - last.current > 250 && n.current < SHAKE_TARGET) {
            last.current = t;
            bump();
          }
        });
      } catch {
        if (alive) setSensor(false);
      }
    })();
    return () => {
      alive = false;
      sub?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = Math.min(1, count / SHAKE_TARGET);
  return (
    <View className="items-center">
      <Text w="semi" className="text-red-100 mb-4">
        {sensor ? "هزّ الهاتف بقوة" : "الحسّاس غير متوفر: اضغط الزر بسرعة"}
      </Text>
      <Pressable disabled={sensor} onPress={bump}>
        <View
          style={{
            width: 190,
            height: 190,
            borderRadius: 95,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.25)",
            borderWidth: 6,
            borderColor: "rgba(255,255,255,0.5)",
            overflow: "hidden",
          }}
        >
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${pct * 100}%`, backgroundColor: "#FDBA74" }} />
          <Text w="bold" style={{ fontSize: 44, color: "#FFFFFF" }}>
            {Math.max(0, SHAKE_TARGET - count)}
          </Text>
          <Ionicons name="phone-portrait-outline" size={30} color="#FFFFFF" />
        </View>
      </Pressable>
    </View>
  );
}

/** امشِ عدد الخطوات المطلوب: عدّ الخطوات من مقياس التسارع (بلا إذن إضافي). يُستبدل بالنقر إن غاب الحسّاس */
function StepsChallenge({ target, onSolved }: { target: number; onSolved: () => void }) {
  const [count, setCount] = useState(0);
  const [sensor, setSensor] = useState(true);
  const n = useRef(0);
  const last = useRef(0);
  const above = useRef(false);

  const bump = () => {
    if (n.current >= target) return;
    n.current += 1;
    setCount(n.current);
    if (n.current === target) onSolved();
  };

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let alive = true;
    (async () => {
      try {
        if (!(await Accelerometer.isAvailableAsync())) throw new Error("no sensor");
        Accelerometer.setUpdateInterval(50);
        sub = Accelerometer.addListener(({ x, y, z }) => {
          const g = Math.sqrt(x * x + y * y + z * z);
          const isAbove = g > 1.18;
          const t = Date.now();
          if (alive && isAbove && !above.current && t - last.current > 350) {
            last.current = t;
            bump();
          }
          above.current = isAbove;
        });
      } catch {
        if (alive) setSensor(false);
      }
    })();
    return () => {
      alive = false;
      sub?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = Math.min(1, count / target);
  return (
    <View className="items-center">
      <Text w="semi" className="text-red-100 mb-4">
        {sensor ? "امشِ وهاتفك معك" : "الحسّاس غير متوفر: اضغط الزر عند كل خطوة"}
      </Text>
      <Pressable disabled={sensor} onPress={bump}>
        <View
          style={{
            width: 190,
            height: 190,
            borderRadius: 95,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.25)",
            borderWidth: 6,
            borderColor: "rgba(255,255,255,0.5)",
            overflow: "hidden",
          }}
        >
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${pct * 100}%`, backgroundColor: "#FDBA74" }} />
          <Text w="bold" style={{ fontSize: 44, color: "#FFFFFF" }}>
            {Math.max(0, target - count)}
          </Text>
          <Ionicons name="walk" size={30} color="#FFFFFF" />
        </View>
      </Pressable>
    </View>
  );
}

/** اذهب إلى الموقع المحدّد. إن تعذّر تحديد الموقع يُستبدل بالمسائل الحسابية حتى لا يبقى المنبّه بلا مخرج */
function LocationChallenge({ data, onSolved }: { data?: AlarmChallengeData; onSolved: () => void }) {
  const [dist, setDist] = useState<number | null>(null);
  const [fallback, setFallback] = useState(false);
  const radius = data?.radius ?? LOCATION_RADIUS_DEFAULT;
  const hasTarget = typeof data?.lat === "number" && typeof data?.lng === "number";

  useEffect(() => {
    if (!hasTarget) {
      setFallback(true);
      return;
    }
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      try {
        const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!alive) return;
        const d = distanceM(p.coords.latitude, p.coords.longitude, data!.lat as number, data!.lng as number);
        setDist(d);
        if (d <= radius) {
          onSolved();
          return;
        }
      } catch {
        if (alive) {
          setFallback(true);
          return;
        }
      }
      if (alive) timer = setTimeout(tick, 4000);
    };
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) throw new Error("denied");
        await tick();
      } catch {
        if (alive) setFallback(true);
      }
    })();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (fallback) {
    return (
      <View className="items-center">
        <Text className="text-red-100 text-sm mb-2">تعذّر تحديد الموقع، حُلّ المسائل بدلًا منه</Text>
        <MathChallenge onSolved={onSolved} />
      </View>
    );
  }
  return (
    <View className="items-center">
      <Ionicons name="location" size={64} color="#FFFFFF" />
      <Text w="semi" className="text-white text-lg mt-3">
        اذهب إلى الموقع المحدّد
      </Text>
      <Text w="bold" className="text-white text-4xl mt-2" style={{ fontVariant: ["tabular-nums"] }}>
        {dist == null ? "…" : dist >= 1000 ? `${(dist / 1000).toFixed(1)} كم` : `${Math.round(dist)} م`}
      </Text>
      <Text className="text-red-100 text-sm mt-1">يُوقَف المنبّه عند الوصول (ضمن {radius} م)</Text>
    </View>
  );
}

/** مهام الكاميرا تُحمَّل عند الحاجة، فلا ينهار التطبيق إن غابت الوحدة الأصلية */
function CameraKind({ kind, data, onSolved }: { kind: "qr" | "photo"; data?: AlarmChallengeData; onSolved: () => void }) {
  let mod: typeof import("./CameraChallenges") | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require("./CameraChallenges");
  } catch {
    mod = null;
  }
  if (!mod || (kind === "qr" && !data?.qr)) {
    return (
      <View className="items-center">
        <Text className="text-red-100 text-sm mb-2">{mod ? "لم يُسجَّل كود لهذا المنبّه، حُلّ المسائل" : "الكاميرا غير متاحة، حُلّ المسائل"}</Text>
        <MathChallenge onSolved={onSolved} />
      </View>
    );
  }
  if (kind === "qr") return <mod.QrChallenge expected={data?.qr as string} onSolved={onSolved} />;
  return <mod.PhotoChallenge onSolved={onSolved} />;
}

export function ChallengeView({ kind, onSolved, data }: Props) {
  if (kind === "math") return <MathChallenge onSolved={onSolved} />;
  if (kind === "hold") return <HoldChallenge onSolved={onSolved} />;
  if (kind === "memory") return <MemoryChallenge onSolved={onSolved} />;
  if (kind === "shake") return <ShakeChallenge onSolved={onSolved} />;
  if (kind === "steps") return <StepsChallenge target={data?.steps ?? STEPS_DEFAULT} onSolved={onSolved} />;
  if (kind === "location") return <LocationChallenge data={data} onSolved={onSolved} />;
  if (kind === "qr" || kind === "photo") return <CameraKind kind={kind} data={data} onSolved={onSolved} />;
  return <PhraseChallenge onSolved={onSolved} />;
}
