import { View } from "react-native";
import { SceneBox } from "@/components/focus/Scene";
import { Tree } from "@/components/focus/Tree";
import { useSky } from "@/components/focus/useSky";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import type { FocusRecord } from "@/store/useFocus";

const shadow = { textShadowColor: "rgba(0,0,0,0.35)", textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } } as const;

/** شاشة الاحتفال بعد انتهاء الجلسة (نجاح أو ذبول) */
export function ResultView({ record, onForest, onAgain }: { record: FocusRecord; onForest: () => void; onAgain: () => void }) {
  const sky = useSky().now;
  const ok = record.status === "grown";
  const scene = ok ? sky : { colors: ["#8C8A86", "#B3AFA7", "#D6D1C6"] as [string, string, string], night: false };
  return (
    <View className="mt-2">
      <SceneBox sky={scene}>
        <View className="items-center pt-6 pb-16 px-4">
          <Text w="bold" style={{ fontSize: 26, lineHeight: 36, color: "#fff", ...shadow }}>
            {ok ? "نمت شجرتك! 🌳" : "ذبلت الشجرة هذه المرة"}
          </Text>
          <Text style={{ color: "#fff", opacity: 0.92, ...shadow }}>
            {ok ? `ركّزت ${record.minutes} دقيقة • +${record.minutes} عملة` : "لا بأس، ازرع أخرى وابدأ من جديد"}
          </Text>
          <View style={{ marginTop: 10 }}>
            <Tree species={record.species} progress={1} withered={!ok} size={250} seed={record.id} noGround sway={ok} />
          </View>
        </View>
      </SceneBox>
      <View className="flex-row gap-3 mt-4">
        <View className="flex-1">
          <Button label="غابتي" icon="leaf-outline" variant="soft" onPress={onForest} />
        </View>
        <View className="flex-1">
          <Button label="ازرع أخرى" icon="add" onPress={onAgain} />
        </View>
      </View>
    </View>
  );
}
