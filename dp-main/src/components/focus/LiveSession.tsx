import { useEffect } from "react";
import { View, useWindowDimensions } from "react-native";
import { lerpSky, SceneBox } from "@/components/focus/Scene";
import { Tree } from "@/components/focus/Tree";
import { useSky } from "@/components/focus/useSky";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useNow } from "@/hooks/useNow";
import { fmtCountdown } from "@/lib/dates";
import { useFocus, type ActiveSession } from "@/store/useFocus";

type Props = {
  active: ActiveSession;
  onComplete: () => void;
  onTogglePause: () => void;
  onGiveUp: () => void;
};

const shadow = { textShadowColor: "rgba(0,0,0,0.35)", textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } } as const;

/** الجلسة الجارية: مشهد غامر تتبدّل سماؤه ببطء وتنمو فيه الشجرة باستمرار (المؤقّت الوحيد في هذه الشاشة) */
export function LiveSession({ active, onComplete, onTogglePause, onGiveUp }: Props) {
  const { height } = useWindowDimensions();
  const nowMs = useNow(1000).getTime();
  const sky = useSky();

  const total = active.minutes * 60_000;
  const ref = active.pausedAt ?? nowMs;
  const remaining = Math.max(0, active.endsAt - ref);
  const progress = Math.min(1, Math.max(0, 1 - remaining / total));

  // اكتمال الجلسة + نبضة حياة كل 5 ثوانٍ (لكشف إغلاق التطبيق)
  useEffect(() => {
    if (!active.pausedAt && nowMs >= active.endsAt) {
      onComplete();
      return;
    }
    if (!active.pausedAt && nowMs - (active.lastSeen ?? 0) > 5000) useFocus.getState().patchActive({ lastSeen: nowMs });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowMs, active.endsAt, active.pausedAt]);

  const scene = lerpSky(sky.now, sky.next, progress * 0.65);

  return (
    <SceneBox sky={scene} height={Math.max(420, height - 250)}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "space-between", paddingTop: 18, paddingBottom: 16 }}>
        <View className="items-center">
          <Text w="semi" style={{ color: "#fff", opacity: 0.9, ...shadow }}>
            {active.tag}
          </Text>
          <Text w="bold" style={{ fontSize: 58, lineHeight: 70, color: "#fff", fontVariant: ["tabular-nums"], ...shadow }}>
            {fmtCountdown(remaining).replace(/^00:/, "")}
          </Text>
          <Text className="text-sm" style={{ color: "#fff", opacity: 0.9, ...shadow }}>
            {active.pausedAt ? "استراحة — الشجرة بأمان" : "ابقَ في التطبيق لتنمو شجرتك"}
          </Text>
        </View>
        <View style={{ marginBottom: 54 }}>
          <Tree species={active.species} progress={progress} size={260} seed={String(active.startedAt)} sway={!active.pausedAt} noGround />
        </View>
        <View className="flex-row gap-3 px-4" style={{ width: "100%" }}>
          <View className="flex-1">
            <Button label={active.pausedAt ? "استئناف" : "استراحة صلاة"} icon={active.pausedAt ? "play" : "moon-outline"} variant="soft" onPress={onTogglePause} />
          </View>
          <View className="flex-1">
            <Button label="تخلَّ" icon="close-circle-outline" variant="danger" onPress={onGiveUp} />
          </View>
        </View>
      </View>
    </SceneBox>
  );
}
