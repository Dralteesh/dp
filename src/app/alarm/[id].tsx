import { useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { WheelTimePicker } from "@/components/alarm/WheelTimePicker";
import { Chip } from "@/components/ui/Chip";
import { Field, FieldRow } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { DAYS, WEEK_ORDER } from "@/constants/arabic";
import { CHALLENGE_LABELS, MAX_SNOOZES_DEFAULT } from "@/lib/alarmChallenge";
import { addDays, combine, toISO } from "@/lib/dates";
import { useAlarms } from "@/store/useAlarms";
import type { AlarmChallenge } from "@/types";

const BG = "#F4F4F4";
const RED = "#E32D0B";
const INK = "#111111";
const RING_GREY = "#ECECEC";
const SNOOZES = [5, 10, 15];
const SNOOZE_LIMITS = [0, 1, 2, 3];
const CHALLENGES: AlarmChallenge[] = ["math", "hold", "phrase", "none"];

function nextOnceDate(time: string): string {
  const today = toISO(new Date());
  return combine(today, time).getTime() > Date.now() ? today : addDays(today, 1);
}

const describeDays = (days: number[]) =>
  days.length === 0 ? "مرة واحدة" : days.length === 7 ? "كل يوم" : `${days.length} أيام`;

/** إنشاء/تعديل منبّه بتصميم Clucky: دولابا الوقت + زر إضافة، والخيارات في نافذتين سفليتين */
export default function AlarmEditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const alarms = useAlarms((s) => s.alarms);
  const addAlarm = useAlarms((s) => s.addAlarm);
  const updateAlarm = useAlarms((s) => s.updateAlarm);
  const removeAlarm = useAlarms((s) => s.removeAlarm);

  const existing = id === "new" ? undefined : alarms.find((a) => a.id === id);

  const [time, setTime] = useState(existing?.time ?? "07:00");
  const [label, setLabel] = useState(existing?.label ?? "");
  const [days, setDays] = useState<number[]>(existing?.days ?? []);
  const [snooze, setSnooze] = useState(existing?.snoozeMinutes ?? 5);
  const [maxSnoozes, setMaxSnoozes] = useState(existing?.maxSnoozes ?? MAX_SNOOZES_DEFAULT);
  const [challenge, setChallenge] = useState<AlarmChallenge>(existing?.challenge ?? "math");
  const [sheet, setSheet] = useState<null | "stop" | "repeat">(null);

  const save = () => {
    const base = {
      label: label.trim() || "منبّه",
      time,
      days,
      snoozeMinutes: snooze,
      maxSnoozes,
      challenge,
      onceDate: days.length === 0 ? nextOnceDate(time) : undefined,
      enabled: true,
    };
    if (existing) updateAlarm(existing.id, base);
    else addAlarm(base);
    router.back();
  };

  // دائرتان كبيرتان باهتتان خلف الدولابين
  const r = width * 0.52;
  const cy = height * 0.46;
  const ch = CHALLENGE_LABELS[challenge];

  return (
    <View style={s.root}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Circle cx={-width * 0.02} cy={cy} r={r} fill={RING_GREY} />
        <Circle cx={width * 1.02} cy={cy} r={r} fill={RING_GREY} />
        <Circle cx={-width * 0.02} cy={cy} r={r * 0.72} fill={BG} />
        <Circle cx={width * 1.02} cy={cy} r={r * 0.72} fill={BG} />
      </Svg>

      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        {/* أعلى: إغلاق + عنوان + حذف */}
        <View style={s.top}>
          <Pill onPress={() => router.back()} label="إغلاق" style={{ width: 72, height: 88 }}>
            <Ionicons name="chevron-up" size={32} color="#fff" />
          </Pill>
          <Text w="bold" style={{ fontSize: 16, color: INK, flex: 1, textAlign: "center" }}>
            {existing ? "تعديل المنبّه" : "منبّه جديد"}
          </Text>
          {existing ? (
            <Pressable
              accessibilityLabel="حذف المنبّه"
              hitSlop={10}
              style={s.trash}
              onPress={() => {
                removeAlarm(existing.id);
                router.back();
              }}
            >
              <Ionicons name="trash-outline" size={22} color="#DC2626" />
            </Pressable>
          ) : (
            <View style={{ width: 72 }} />
          )}
        </View>

        <View style={{ flex: 1 }} />

        {/* المنتقي خارج أي ScrollView حتى لا يتعارض التمرير */}
        <WheelTimePicker value={time} onChange={setTime} />

        <View style={{ flex: 0.5 }} />

        {/* أسفل: [طريقة الإيقاف] [إضافة/حفظ] [التكرار] — ثابتة اليسار/اليمين مهما كان اتجاه الجهاز */}
        <View style={s.bottomRow}>
          <Side label={ch.label} onPress={() => setSheet("stop")}>
            <Ionicons name={ch.icon as never} size={24} color={RED} />
          </Side>
          <Pill onPress={save} label={existing ? "حفظ" : "إضافة"} style={{ width: 110, height: 160 }}>
            <View style={{ alignItems: "center" }}>
              <Ionicons name={existing ? "checkmark" : "add"} size={32} color="#fff" />
              <Text w="semi" style={{ color: "#fff", fontSize: 13 }}>
                {existing ? "حفظ" : "إضافة"}
              </Text>
            </View>
          </Pill>
          <Side label={describeDays(days)} onPress={() => setSheet("repeat")}>
            <Ionicons name="calendar-outline" size={24} color={RED} />
          </Side>
        </View>
      </View>

      {/* طريقة الإيقاف + الغفوة */}
      <Sheet visible={sheet === "stop"} onClose={() => setSheet(null)} title="كيف تُوقف المنبّه؟">
        <View className="gap-2 mb-3">
          {CHALLENGES.map((c) => {
            const m = CHALLENGE_LABELS[c];
            const on = challenge === c;
            return (
              <Pressable
                key={c}
                onPress={() => setChallenge(c)}
                className="flex-row items-center gap-3 rounded-2xl px-3 py-3 border"
                style={{ backgroundColor: on ? "#FFF1E8" : "#FFFFFF", borderColor: on ? RED : "#E3E1D8" }}
              >
                <Ionicons name={m.icon as never} size={22} color={on ? RED : "#64748B"} />
                <View className="flex-1">
                  <Text w="bold">{m.label}</Text>
                  <Text className="text-xs text-muted">{m.hint}</Text>
                </View>
                {on ? <Ionicons name="checkmark-circle" size={20} color={RED} /> : null}
              </Pressable>
            );
          })}
        </View>
        <FieldRow label="مدة الغفوة">
          <View className="flex-row gap-2">
            {SNOOZES.map((v) => (
              <Chip key={v} label={`${v} د`} selected={snooze === v} color={RED} onPress={() => setSnooze(v)} />
            ))}
          </View>
        </FieldRow>
        <FieldRow label="أقصى عدد للغفوات">
          <View className="flex-row gap-2">
            {SNOOZE_LIMITS.map((v) => (
              <Chip
                key={v}
                label={v === 0 ? "ممنوعة" : String(v)}
                selected={maxSnoozes === v}
                color={RED}
                onPress={() => setMaxSnoozes(v)}
              />
            ))}
          </View>
        </FieldRow>
      </Sheet>

      {/* الاسم + التكرار */}
      <Sheet visible={sheet === "repeat"} onClose={() => setSheet(null)} title="الاسم والتكرار">
        <Field label="الاسم" value={label} onChangeText={setLabel} placeholder="مثال: الاستيقاظ للمناوبة" />
        <FieldRow label="التكرار (فارغ = مرة واحدة)">
          <View className="flex-row flex-wrap gap-2">
            {WEEK_ORDER.map((d) => (
              <Chip
                key={d}
                label={DAYS[d]}
                selected={days.includes(d)}
                color={RED}
                onPress={() => setDays((c) => (c.includes(d) ? c.filter((x) => x !== d) : [...c, d]))}
              />
            ))}
          </View>
        </FieldRow>
      </Sheet>
    </View>
  );
}

function Pill({
  onPress,
  style,
  label,
  children,
}: {
  onPress: () => void;
  style: object;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={[s.pill, style]}>
      {children}
    </Pressable>
  );
}

function Side({ onPress, label, children }: { onPress: () => void; label: string; children: React.ReactNode }) {
  return (
    <View style={{ alignItems: "center", width: 84, gap: 6 }}>
      <Pressable onPress={onPress} accessibilityLabel={label} style={s.side}>
        {children}
      </Pressable>
      <Text w="semi" numberOfLines={1} style={{ fontSize: 11, color: "#6B6B6B" }}>
        {label}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  top: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingTop: 16, gap: 12 },
  trash: { width: 72, alignItems: "center", justifyContent: "center" },
  bottomRow: {
    direction: "ltr",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  pill: {
    borderRadius: 999,
    backgroundColor: RED,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: RED,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
  side: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
