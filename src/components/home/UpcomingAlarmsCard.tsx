import { useShortcutMenu } from "@/store/useShortcutMenu";
import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { nextAlarmFire } from "@/lib/alarm";
import { fmtTime, relativeDay, toISO } from "@/lib/dates";
import { useAlarms } from "@/store/useAlarms";
import type { AlarmItem } from "@/types";

const RED = "#E5322D";
const INK = "#0F1B3D";

/** المنبّهات القادمة (بدل مهام اليوم): الضغط على البطاقة يفتح المنبّه، والزر الأحمر يضيف منبّهًا سريعًا */
export function UpcomingAlarmsCard({ now }: { now: Date }) {
  const router = useRouter();
  const alarms = useAlarms((s) => s.alarms);
  const minuteKey = Math.floor(now.getTime() / 60000);

  const showMenu = useShortcutMenu((s) => s.show);
  const upcoming = useMemo(() => {
    const list: { a: AlarmItem; at: Date }[] = [];
    for (const a of alarms) {
      const f = nextAlarmFire([a], now);
      if (f) list.push({ a, at: f.at });
    }
    return list.sort((x, y) => x.at.getTime() - y.at.getTime()).slice(0, 3);
    // يُعاد الحساب كل دقيقة فقط
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alarms, minuteKey]);

  return (
    <PressableScale
      onPress={() => router.push("/alarms")}
      onLongPress={() =>
        showMenu("المنبّهات", [
          { label: "منبّه جديد", icon: "add-circle-outline", onPress: () => router.push({ pathname: "/alarm/[id]", params: { id: "new" } }) },
          { label: "كل المنبّهات", icon: "alarm-outline", onPress: () => router.push("/alarms") },
        ])
      }
      className="bg-surface rounded-[28px] border border-line p-4"
    >
      <View className="flex-row items-center gap-3 mb-2">
        <Ionicons name="alarm" size={26} color={INK} />
        <View className="flex-1">
          <Text w="bold" className="text-lg">
            المنبّهات القادمة
          </Text>
          <Text className="text-xs text-muted">{alarms.filter((a) => a.enabled).length} فعّال من {alarms.length}</Text>
        </View>
        <Pressable
          onPress={() => router.push({ pathname: "/alarm/[id]", params: { id: "new" } })}
          accessibilityLabel="إضافة منبّه سريع"
          className="w-11 h-11 rounded-full items-center justify-center"
          style={{ backgroundColor: RED }}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      </View>

      {upcoming.length === 0 ? (
        <Text className="text-muted text-sm py-2">لا منبّه فعّال. اضغط الزر الأحمر لإضافة منبّه.</Text>
      ) : (
        upcoming.map(({ a, at }) => (
          <View key={a.id} className="flex-row items-center gap-3 py-2 border-t border-line">
            <Text w="bold" style={{ fontSize: 24, lineHeight: 32, color: INK, fontVariant: ["tabular-nums"], minWidth: 92 }}>
              {fmtTime(a.time)}
            </Text>
            <View className="flex-1">
              <Text w="semi" numberOfLines={1}>
                {a.label || "منبّه"}
              </Text>
              <Text className="text-xs text-muted">{relativeDay(toISO(at))}</Text>
            </View>
          </View>
        ))
      )}
    </PressableScale>
  );
}
