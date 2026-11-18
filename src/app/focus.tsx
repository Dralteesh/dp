import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, Pressable, View } from "react-native";
import * as Notifications from "expo-notifications";
import { Ionicons } from "@expo/vector-icons";
import { TreeSvg, stageOf } from "@/components/focus/TreeSvg";
import { Chip, Segmented } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useNow } from "@/hooks/useNow";
import { addDays, fmtCountdown, toISO } from "@/lib/dates";
import { CHANNEL } from "@/lib/notifications";
import { SPECIES, useFocus, type Species } from "@/store/useFocus";

const GREEN = "#15803D";
const GRACE_MS = 10_000;
const DURATIONS = [15, 25, 45, 60, 90, 120];
const TAGS = ["دراسة", "قراءة", "عمل", "مراجعة", "أخرى"];

async function scheduleEnd(endsAt: number, minutes: number): Promise<string | undefined> {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title: "🌳 اكتملت شجرتك", body: `أنهيت ${minutes} دقيقة من التركيز. عمل رائع!`, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(endsAt), channelId: CHANNEL.events },
    });
  } catch {
    return undefined;
  }
}
const cancelNotif = async (id?: string) => {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
};

/** غابة التركيز: ازرع شجرة، ابقَ في التطبيق حتى تكتمل، وإن خرجت ذبلت */
export default function FocusScreen() {
  const now = useNow(1000);
  const nowMs = now.getTime();
  const { active, records, coins, unlocked } = useFocus();
  const { setActive, patchActive, finish, unlock } = useFocus.getState();

  const [tab, setTab] = useState<"plant" | "forest">("plant");
  const [minutes, setMinutes] = useState(25);
  const [tag, setTag] = useState(TAGS[0]);
  const [species, setSpecies] = useState<Species>("oak");
  const [result, setResult] = useState<"grown" | "withered" | null>(null);
  const leftAt = useRef<number | null>(null);

  const wither = async () => {
    const a = useFocus.getState().active;
    if (!a) return;
    await cancelNotif(a.notificationId);
    finish("withered");
    setResult("withered");
  };

  // عند الفتح: إن كانت هناك جلسة وغاب التطبيق أكثر من المهلة (أُغلق) فقد ذبلت
  useEffect(() => {
    const a = useFocus.getState().active;
    if (a && !a.pausedAt && a.lastSeen && Date.now() < a.endsAt && Date.now() - a.lastSeen > GRACE_MS * 3) wither();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // تتبّع الخروج من التطبيق
  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => {
      const a = useFocus.getState().active;
      if (!a || a.pausedAt) {
        leftAt.current = null;
        return;
      }
      if (st === "background" || st === "inactive") {
        if (leftAt.current == null) leftAt.current = Date.now();
      } else if (st === "active") {
        const t = leftAt.current;
        leftAt.current = null;
        if (t && Date.now() - t > GRACE_MS && Date.now() < a.endsAt) wither();
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // اكتمال الجلسة + نبضة حياة كل 5 ثوانٍ
  useEffect(() => {
    if (!active) return;
    if (!active.pausedAt && nowMs >= active.endsAt) {
      cancelNotif(active.notificationId);
      finish("grown");
      setResult("grown");
      return;
    }
    if (!active.pausedAt && nowMs - (active.lastSeen ?? 0) > 5000) patchActive({ lastSeen: nowMs });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowMs, active?.endsAt, active?.pausedAt]);

  const start = async () => {
    const startedAt = Date.now();
    const endsAt = startedAt + minutes * 60_000;
    const notificationId = await scheduleEnd(endsAt, minutes);
    setResult(null);
    setActive({ startedAt, endsAt, minutes, tag, species, notificationId, lastSeen: startedAt });
  };

  const togglePause = async () => {
    if (!active) return;
    if (!active.pausedAt) {
      await cancelNotif(active.notificationId);
      patchActive({ pausedAt: Date.now(), notificationId: undefined });
    } else {
      const endsAt = active.endsAt + (Date.now() - active.pausedAt);
      const notificationId = await scheduleEnd(endsAt, active.minutes);
      patchActive({ pausedAt: undefined, endsAt, notificationId, lastSeen: Date.now() });
    }
  };

  const giveUp = () =>
    Alert.alert("التخلّي عن الشجرة؟", "ستذبل شجرتك ولن تكسب عملات.", [
      { text: "أكمل", style: "cancel" },
      { text: "تخلَّ", style: "destructive", onPress: wither },
    ]);

  const pickSpecies = (sp: Species) => {
    if (unlocked.includes(sp)) return setSpecies(sp);
    const cost = SPECIES[sp].cost;
    if (coins < cost) {
      Alert.alert("عملات غير كافية", `تحتاج ${cost} عملة لفتح «${SPECIES[sp].label}». عندك ${coins}.`);
      return;
    }
    Alert.alert("فتح نوع جديد", `فتح «${SPECIES[sp].label}» مقابل ${cost} عملة؟`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "فتح",
        onPress: () => {
          if (unlock(sp)) setSpecies(sp);
        },
      },
    ]);
  };

  // ---------- إحصاءات الغابة ----------
  const stats = useMemo(() => {
    const today = toISO(new Date());
    const weekAgo = addDays(today, -6);
    let tMin = 0;
    let wMin = 0;
    let trees = 0;
    const byTag = new Map<string, number>();
    for (const r of records) {
      if (r.status !== "grown") continue;
      trees++;
      const d = toISO(new Date(r.at));
      if (d === today) tMin += r.minutes;
      if (d >= weekAgo) {
        wMin += r.minutes;
        byTag.set(r.tag, (byTag.get(r.tag) ?? 0) + r.minutes);
      }
    }
    return { tMin, wMin, trees, byTag: [...byTag.entries()].sort((a, b) => b[1] - a[1]) };
  }, [records]);

  const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} س ${m % 60} د` : `${m} د`);

  // ---------- جلسة جارية ----------
  if (active) {
    const total = active.minutes * 60_000;
    const ref = active.pausedAt ?? nowMs;
    const remaining = Math.max(0, active.endsAt - ref);
    const progress = Math.min(1, Math.max(0, 1 - remaining / total));
    return (
      <Screen title="تركيز" subtitle={active.tag}>
        <View className="items-center mt-4">
          <View className="rounded-[40px] items-center justify-center py-6" style={{ width: "100%", backgroundColor: "#E4F4E8" }}>
            <TreeSvg species={active.species} stage={stageOf(progress)} size={220} />
            <Text w="bold" style={{ fontSize: 52, lineHeight: 64, color: GREEN, fontVariant: ["tabular-nums"] }}>
              {fmtCountdown(remaining).replace(/^00:/, "")}
            </Text>
            <Text className="text-sm" style={{ color: GREEN }}>
              {active.pausedAt ? "استراحة — الشجرة بأمان" : "ابقَ في التطبيق لتنمو شجرتك"}
            </Text>
          </View>
          <View className="w-full gap-3 mt-5">
            <Button label={active.pausedAt ? "استئناف" : "استراحة صلاة"} icon={active.pausedAt ? "play" : "moon-outline"} variant="soft" onPress={togglePause} />
            <Button label="التخلّي عن الشجرة" icon="close-circle-outline" variant="danger" onPress={giveUp} />
          </View>
        </View>
      </Screen>
    );
  }

  // ---------- النتيجة ----------
  const lastRec = records[0];
  return (
    <Screen title="غابة التركيز" subtitle={`${coins} عملة • ${stats.trees} شجرة`} back>
      {result && lastRec ? (
        <View className="rounded-3xl items-center py-5 mb-4" style={{ backgroundColor: result === "grown" ? "#E4F4E8" : "#F1ECE4" }}>
          <TreeSvg species={lastRec.species} stage={3} withered={result === "withered"} size={150} />
          <Text w="bold" className="text-lg" style={{ color: result === "grown" ? GREEN : "#78716C" }}>
            {result === "grown" ? `نمت شجرتك! +${lastRec.minutes} عملة` : "ذبلت الشجرة هذه المرة"}
          </Text>
        </View>
      ) : null}

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "plant", label: "ازرع" },
          { value: "forest", label: "غابتي" },
        ]}
      />

      {tab === "plant" ? (
        <View className="mt-4">
          <View className="items-center rounded-3xl py-4" style={{ backgroundColor: "#E4F4E8" }}>
            <TreeSvg species={species} stage={3} size={150} />
            <View className="flex-row items-center gap-4 mt-1">
              <Pressable onPress={() => setMinutes((m) => Math.max(5, m - 5))} className="w-10 h-10 rounded-full bg-white items-center justify-center">
                <Ionicons name="remove" size={22} color={GREEN} />
              </Pressable>
              <Text w="bold" style={{ fontSize: 38, lineHeight: 50, color: GREEN, fontVariant: ["tabular-nums"] }}>
                {minutes} د
              </Text>
              <Pressable onPress={() => setMinutes((m) => Math.min(180, m + 5))} className="w-10 h-10 rounded-full bg-white items-center justify-center">
                <Ionicons name="add" size={22} color={GREEN} />
              </Pressable>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-2 mt-3">
            {DURATIONS.map((d) => (
              <Chip key={d} label={`${d} د`} selected={minutes === d} color={GREEN} onPress={() => setMinutes(d)} />
            ))}
          </View>

          <SectionHeader title="التصنيف" />
          <View className="flex-row flex-wrap gap-2">
            {TAGS.map((t) => (
              <Chip key={t} label={t} selected={tag === t} color={GREEN} onPress={() => setTag(t)} />
            ))}
          </View>

          <SectionHeader title="نوع الشجرة" />
          <View className="flex-row flex-wrap gap-2">
            {(Object.keys(SPECIES) as Species[]).map((sp) => {
              const lock = !unlocked.includes(sp);
              return (
                <Chip
                  key={sp}
                  label={lock ? `${SPECIES[sp].label} • ${SPECIES[sp].cost}` : SPECIES[sp].label}
                  icon={lock ? "lock-closed" : "leaf"}
                  selected={species === sp && !lock}
                  color={GREEN}
                  onPress={() => pickSpecies(sp)}
                />
              );
            })}
          </View>

          <View className="mt-6">
            <Button label="ازرع الشجرة" icon="leaf" onPress={start} />
          </View>
          <Text className="text-xs text-muted text-center mt-2 leading-5">
            إن خرجت من التطبيق أكثر من 10 ثوانٍ ذبلت الشجرة. استعمل «استراحة صلاة» لإيقاف الجلسة دون خسارة.
          </Text>
        </View>
      ) : (
        <View className="mt-4">
          <View className="flex-row gap-2.5">
            {[
              { l: "اليوم", v: fmtMin(stats.tMin) },
              { l: "آخر 7 أيام", v: fmtMin(stats.wMin) },
              { l: "أشجار", v: String(stats.trees) },
            ].map((c) => (
              <View key={c.l} className="flex-1 rounded-2xl p-3" style={{ backgroundColor: "#E4F4E8" }}>
                <Text className="text-xs" style={{ color: GREEN }}>
                  {c.l}
                </Text>
                <Text w="bold" className="text-lg" style={{ color: GREEN }}>
                  {c.v}
                </Text>
              </View>
            ))}
          </View>

          {stats.byTag.length ? (
            <>
              <SectionHeader title="توزيع وقتك (آخر 7 أيام)" />
              {stats.byTag.map(([t, m]) => (
                <View key={t} className="mb-2">
                  <View className="flex-row justify-between mb-1">
                    <Text w="semi" className="text-sm">
                      {t}
                    </Text>
                    <Text className="text-xs text-muted">{fmtMin(m)}</Text>
                  </View>
                  <View style={{ height: 10, borderRadius: 5, backgroundColor: "#E5E7EB" }}>
                    <View style={{ height: 10, borderRadius: 5, backgroundColor: GREEN, width: `${Math.max(6, (m / stats.byTag[0][1]) * 100)}%` }} />
                  </View>
                </View>
              ))}
            </>
          ) : null}

          <SectionHeader title="غابتي" />
          {records.length === 0 ? (
            <Text className="text-muted text-center py-6">لم تزرع شيئًا بعد.</Text>
          ) : (
            <View className="flex-row flex-wrap">
              {records.slice(0, 60).map((r) => (
                <View key={r.id} style={{ width: "25%", alignItems: "center", marginBottom: 6 }}>
                  <TreeSvg species={r.species} stage={3} withered={r.status === "withered"} size={70} />
                  <Text className="text-[10px] text-muted">{r.minutes} د</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}
