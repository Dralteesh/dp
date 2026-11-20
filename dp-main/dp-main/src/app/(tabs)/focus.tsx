import { useEffect, useRef, useState } from "react";
import { Alert, AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { ForestView } from "@/components/focus/ForestView";
import { LiveSession } from "@/components/focus/LiveSession";
import { PlantView } from "@/components/focus/PlantView";
import { ResultView } from "@/components/focus/ResultView";
import { ShopView } from "@/components/focus/ShopView";
import { StatsView } from "@/components/focus/StatsView";
import { Segmented } from "@/components/ui/Chip";
import { Screen } from "@/components/ui/Screen";
import { CHANNEL } from "@/lib/notifications";
import { useFocus, type FocusRecord, type Species } from "@/store/useFocus";

const GRACE_MS = 10_000;

type Tab = "plant" | "forest" | "stats" | "shop";

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

/** غابة التركيز: ازرع شجرة، ابقَ في التطبيق حتى تكتمل، وإن خرجت ذبلت. لا مؤقّت هنا: المؤقّت داخل LiveSession فقط */
export default function FocusScreen() {
  const active = useFocus((s) => s.active);
  const records = useFocus((s) => s.records);
  const coins = useFocus((s) => s.coins);
  const tags = useFocus((s) => s.tags);
  const { setActive, patchActive, finish } = useFocus.getState();

  const [tab, setTab] = useState<Tab>("plant");
  const [minutes, setMinutes] = useState(25);
  const [tagSel, setTag] = useState(tags[0]);
  const [species, setSpecies] = useState<Species>("oak");
  const [result, setResult] = useState<FocusRecord | null>(null);
  const leftAt = useRef<number | null>(null);
  const tag = tags.includes(tagSel) ? tagSel : tags[0];

  const end = async (status: "grown" | "withered") => {
    const a = useFocus.getState().active;
    if (!a) return;
    await cancelNotif(a.notificationId);
    finish(status);
    setResult(useFocus.getState().records[0] ?? null);
  };

  // عند الفتح: إن كانت هناك جلسة وغاب التطبيق أكثر من المهلة (أُغلق) فقد ذبلت
  useEffect(() => {
    const a = useFocus.getState().active;
    if (a && !a.pausedAt && a.lastSeen && Date.now() < a.endsAt && Date.now() - a.lastSeen > GRACE_MS * 3) end("withered");
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
        if (t && Date.now() - t > GRACE_MS && Date.now() < a.endsAt) end("withered");
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    const startedAt = Date.now();
    const endsAt = startedAt + minutes * 60_000;
    const notificationId = await scheduleEnd(endsAt, minutes);
    setResult(null);
    setActive({ startedAt, endsAt, minutes, tag, species, notificationId, lastSeen: startedAt });
  };

  const togglePause = async () => {
    const a = useFocus.getState().active;
    if (!a) return;
    if (!a.pausedAt) {
      await cancelNotif(a.notificationId);
      patchActive({ pausedAt: Date.now(), notificationId: undefined });
    } else {
      const endsAt = a.endsAt + (Date.now() - a.pausedAt);
      const notificationId = await scheduleEnd(endsAt, a.minutes);
      patchActive({ pausedAt: undefined, endsAt, notificationId, lastSeen: Date.now() });
    }
  };

  const giveUp = () =>
    Alert.alert("التخلّي عن الشجرة؟", "ستذبل شجرتك ولن تكسب عملات.", [
      { text: "أكمل", style: "cancel" },
      { text: "تخلَّ", style: "destructive", onPress: () => end("withered") },
    ]);

  // ---------- جلسة جارية ----------
  if (active) {
    return (
      <Screen title="تركيز" subtitle={active.tag}>
        <LiveSession active={active} onComplete={() => end("grown")} onTogglePause={togglePause} onGiveUp={giveUp} />
      </Screen>
    );
  }

  // ---------- احتفال ----------
  if (result) {
    return (
      <Screen title="غابة التركيز" subtitle={`${coins} عملة`}>
        <ResultView
          record={result}
          onForest={() => (setResult(null), setTab("forest"))}
          onAgain={() => (setResult(null), setTab("plant"))}
        />
      </Screen>
    );
  }

  const grownCount = records.filter((r) => r.status === "grown").length;
  return (
    <Screen title="غابة التركيز" subtitle={`${coins} عملة • ${grownCount} شجرة`}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "plant", label: "ازرع" },
          { value: "forest", label: "غابتي" },
          { value: "stats", label: "إحصاءات" },
          { value: "shop", label: "المتجر" },
        ]}
      />
      {tab === "plant" ? (
        <PlantView species={species} setSpecies={setSpecies} minutes={minutes} setMinutes={setMinutes} tag={tag} setTag={setTag} onStart={start} />
      ) : tab === "forest" ? (
        <ForestView records={records} />
      ) : tab === "stats" ? (
        <StatsView records={records} />
      ) : (
        <ShopView />
      )}
    </Screen>
  );
}
