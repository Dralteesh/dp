import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Alert, Pressable, Switch, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AlarmStats } from "@/components/AlarmStats";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { DAYS_SHORT, WEEK_ORDER } from "@/constants/arabic";
import { CHALLENGE_LABELS } from "@/lib/alarmChallenge";
import { alarmSupported, ensureAlarmPermissions, nextAlarmFire, scheduleTestAlarm } from "@/lib/alarm";
import { useNow } from "@/hooks/useNow";
import { addDays, combine, fmtTime, fmtTimeDate, toISO } from "@/lib/dates";
import { useAlarms } from "@/store/useAlarms";
import type { AlarmItem } from "@/types";

/** أقرب تاريخ لتشغيل منبّه مرة واحدة */
function nextOnceDate(time: string): string {
  const today = toISO(new Date());
  return combine(today, time).getTime() > Date.now() ? today : addDays(today, 1);
}

export default function AlarmsScreen() {
  const router = useRouter();
  const alarms = useAlarms((s) => s.alarms);
  const updateAlarm = useAlarms((s) => s.updateAlarm);
  const toggleAlarm = useAlarms((s) => s.toggleAlarm);

  const now = useNow(30000);
  const upcoming = nextAlarmFire(alarms, now);
  const supported = alarmSupported();
  const [permOk, setPermOk] = useState<boolean | null>(null);
  useEffect(() => {
    if (supported) ensureAlarmPermissions().then(setPermOk);
  }, [supported]);

  const openEdit = (id: string) => router.push({ pathname: "/alarm/[id]", params: { id } });

  const describe = (a: AlarmItem) => {
    if (a.days.length === 0) return a.onceDate === toISO(new Date()) ? "اليوم" : "مرة واحدة";
    if (a.days.length === 7) return "كل يوم";
    return WEEK_ORDER.filter((d) => a.days.includes(d))
      .map((d) => DAYS_SHORT[d])
      .join(" • ");
  };

  const test = async () => {
    const ok = await scheduleTestAlarm();
    Alert.alert(
      ok ? "تمت الجدولة" : "غير متاح",
      ok ? "سيرنّ المنبّه التجريبي بعد دقيقة. أغلق الشاشة لتجربة شاشة القفل." : "المنبّه يحتاج Development Build.",
    );
  };

  return (
    <Screen
      title="المنبّه الإجباري"
      subtitle="صوت متكرر بأعلى مستوى حتى توقفه"
      overlay={<Fab onPress={() => openEdit("new")} color="#C2410C" />}
    >
      {!supported ? (
        <Card className="mb-4 bg-amber-50 border-amber-200">
          <View className="flex-row gap-3">
            <Ionicons name="warning" size={22} color="#B45309" />
            <View className="flex-1">
              <Text w="bold" className="text-amber-900">
                غير متاح في Expo Go
              </Text>
              <Text className="text-amber-900 text-sm mt-1">
                المنبّه الإجباري وحدة أندرويد أصلية. ابنِ نسخة تطويرية بالأمر npx expo run:android ثم سيعمل. يمكنك
                تجهيز المنبّهات الآن وستُجدول تلقائيًا.
              </Text>
            </View>
          </View>
        </Card>
      ) : permOk === false ? (
        <Card className="mb-4 bg-red-50 border-red-200">
          <Text w="bold" className="text-red-900">
            الصلاحيات ناقصة
          </Text>
          <Text className="text-red-900 text-sm mt-1">
            فعّل الإشعارات و«المنبّهات والتذكيرات» لتطبيق Dentist Planner من إعدادات الهاتف. وعلى Xiaomi اسمح بالتشغيل
            التلقائي وبدون قيود بطارية.
          </Text>
        </Card>
      ) : null}

      <AlarmStats
        nextAt={upcoming?.at ?? null}
        now={now}
        active={alarms.filter((a) => a.enabled).length}
        total={alarms.length}
        nextLabel={upcoming?.label}
        nextTimeText={upcoming ? fmtTimeDate(upcoming.at) : undefined}
      />

      {alarms.length === 0 ? (
        <EmptyState icon="alarm-outline" title="لا منبّهات" hint="اضغط + لإضافة منبّه. ويمكنك ربط منبّه بأي مناوبة من شاشة الحدث." />
      ) : (
        alarms.map((a) => (
          <Pressable key={a.id} onPress={() => openEdit(a.id)}>
            <Card className={`mb-3 ${a.enabled ? "" : "opacity-60"}`}>
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text w="bold" className="text-4xl leading-[48px]" style={{ fontVariant: ["tabular-nums"] }}>
                    {fmtTime(a.time)}
                  </Text>
                  <Text className="text-muted">
                    {a.label} • {describe(a)}
                  </Text>
                  <View className="flex-row items-center gap-1 mt-1">
                    <Ionicons name={CHALLENGE_LABELS[a.challenge ?? "math"].icon as never} size={13} color="#C2410C" />
                    <Text className="text-xs" style={{ color: "#C2410C" }}>
                      {CHALLENGE_LABELS[a.challenge ?? "math"].label}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={a.enabled}
                  onValueChange={() => {
                    if (!a.enabled && a.days.length === 0) updateAlarm(a.id, { onceDate: nextOnceDate(a.time) });
                    toggleAlarm(a.id);
                  }}
                  trackColor={{ true: "#C2410C", false: "#CBD5E1" }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </Card>
          </Pressable>
        ))
      )}

      <View className="mt-2">
        <Button label="تجربة منبّه بعد دقيقة" icon="play-circle-outline" variant="outline" onPress={test} />
      </View>

    </Screen>
  );
}
