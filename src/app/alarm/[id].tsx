import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ArcTimePicker } from "@/components/alarm/ArcTimePicker";
import { Chip } from "@/components/ui/Chip";
import { Field, FieldRow } from "@/components/ui/Field";
import { Text } from "@/components/ui/Text";
import { DAYS, WEEK_ORDER } from "@/constants/arabic";
import { addDays, combine, toISO } from "@/lib/dates";
import { CHALLENGE_LABELS, MAX_SNOOZES_DEFAULT } from "@/lib/alarmChallenge";
import { useAlarms } from "@/store/useAlarms";
import type { AlarmChallenge } from "@/types";

const RED = "#C2410C";
const SNOOZES = [5, 10, 15];
const SNOOZE_LIMITS = [0, 1, 2, 3];
const CHALLENGES: AlarmChallenge[] = ["math", "hold", "phrase", "none"];

function nextOnceDate(time: string): string {
  const today = toISO(new Date());
  return combine(today, time).getTime() > Date.now() ? today : addDays(today, 1);
}

/** تعديل/إنشاء منبّه: منتقي قوسي بملء الشاشة + خيارات الصعوبة (من تصميم «When do you usually wake up») */
export default function AlarmEditScreen() {
  const router = useRouter();
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

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: "#EEEEEC" }}>
      <View className="flex-row items-center gap-3 px-4 pt-2 pb-1">
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          className="w-11 h-11 rounded-full items-center justify-center"
          style={{ backgroundColor: "#E2E2DF" }}
        >
          <Ionicons name="arrow-forward" size={22} color="#0A0A0A" />
        </Pressable>
        <Text w="bold" className="text-xl flex-1">
          {existing ? "تعديل المنبّه" : "منبّه جديد"}
        </Text>
        {existing ? (
          <Pressable
            hitSlop={10}
            onPress={() => {
              removeAlarm(existing.id);
              router.back();
            }}
          >
            <Ionicons name="trash-outline" size={22} color="#DC2626" />
          </Pressable>
        ) : null}
      </View>

      <Text w="bold" className="text-center text-2xl mt-3 mb-1 px-6">
        متى تريد أن يرنّ المنبّه؟
      </Text>

      {/* المنتقي خارج أي ScrollView حتى لا يتعارض التمرير */}
      <ArcTimePicker value={time} onChange={setTime} />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
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

        <FieldRow label="كيف تُوقف المنبّه؟">
          <View className="gap-2">
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
        </FieldRow>

        <FieldRow label="مدة الغفوة">
          <View className="flex-row gap-2">
            {SNOOZES.map((s) => (
              <Chip key={s} label={`${s} د`} selected={snooze === s} color={RED} onPress={() => setSnooze(s)} />
            ))}
          </View>
        </FieldRow>
        <FieldRow label="أقصى عدد للغفوات">
          <View className="flex-row gap-2">
            {SNOOZE_LIMITS.map((s) => (
              <Chip key={s} label={s === 0 ? "ممنوعة" : String(s)} selected={maxSnoozes === s} color={RED} onPress={() => setMaxSnoozes(s)} />
            ))}
          </View>
        </FieldRow>
      </ScrollView>

      <Pressable
        onPress={save}
        className="mx-4 mb-3 rounded-3xl py-4 flex-row items-center justify-between px-6"
        style={{ backgroundColor: "#C2410C" }}
      >
        <Text w="bold" className="text-lg" style={{ color: "#FFFFFF" }}>
          حفظ المنبّه
        </Text>
        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}
