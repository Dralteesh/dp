import { useEffect, useState } from "react";
import { Alert, Pressable, Switch, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TimeField } from "@/components/pickers";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Field, FieldRow } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { DAYS, DAYS_SHORT, WEEK_ORDER } from "@/constants/arabic";
import { alarmSupported, ensureAlarmPermissions, scheduleTestAlarm } from "@/lib/alarm";
import { addDays, combine, fmtTime, toISO } from "@/lib/dates";
import { useAlarms } from "@/store/useAlarms";
import type { AlarmItem } from "@/types";

const SNOOZES = [5, 10, 15];

/** أقرب تاريخ لتشغيل منبّه مرة واحدة */
function nextOnceDate(time: string): string {
  const today = toISO(new Date());
  return combine(today, time).getTime() > Date.now() ? today : addDays(today, 1);
}

export default function AlarmsScreen() {
  const alarms = useAlarms((s) => s.alarms);
  const addAlarm = useAlarms((s) => s.addAlarm);
  const updateAlarm = useAlarms((s) => s.updateAlarm);
  const toggleAlarm = useAlarms((s) => s.toggleAlarm);
  const removeAlarm = useAlarms((s) => s.removeAlarm);

  const supported = alarmSupported();
  const [permOk, setPermOk] = useState<boolean | null>(null);
  const [editing, setEditing] = useState<{ open: boolean; alarm?: AlarmItem }>({ open: false });

  const [label, setLabel] = useState("");
  const [time, setTime] = useState("07:00");
  const [days, setDays] = useState<number[]>([]);
  const [snooze, setSnooze] = useState(5);

  useEffect(() => {
    if (supported) ensureAlarmPermissions().then(setPermOk);
  }, [supported]);

  const openSheet = (a?: AlarmItem) => {
    setLabel(a?.label ?? "");
    setTime(a?.time ?? "07:00");
    setDays(a?.days ?? []);
    setSnooze(a?.snoozeMinutes ?? 5);
    setEditing({ open: true, alarm: a });
  };

  const save = () => {
    const base = {
      label: label.trim() || "منبّه",
      time,
      days,
      snoozeMinutes: snooze,
      onceDate: days.length === 0 ? nextOnceDate(time) : undefined,
      enabled: true,
    };
    if (editing.alarm) updateAlarm(editing.alarm.id, base);
    else addAlarm(base);
    setEditing({ open: false });
  };

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
      back
      overlay={<Fab onPress={() => openSheet()} color="#DC2626" />}
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
            فعّل الإشعارات و«المنبّهات والتذكيرات» لتطبيق DoctorPlanner من إعدادات الهاتف. وعلى Xiaomi اسمح بالتشغيل
            التلقائي وبدون قيود بطارية.
          </Text>
        </Card>
      ) : null}

      {alarms.length === 0 ? (
        <EmptyState icon="alarm-outline" title="لا منبّهات" hint="اضغط + لإضافة منبّه. ويمكنك ربط منبّه بأي مناوبة من شاشة الحدث." />
      ) : (
        alarms.map((a) => (
          <Pressable key={a.id} onPress={() => openSheet(a)}>
            <Card className={`mb-3 ${a.enabled ? "" : "opacity-60"}`}>
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text w="bold" className="text-4xl leading-[48px]" style={{ fontVariant: ["tabular-nums"] }}>
                    {fmtTime(a.time)}
                  </Text>
                  <Text className="text-muted">
                    {a.label} • {describe(a)}
                  </Text>
                </View>
                <Switch
                  value={a.enabled}
                  onValueChange={() => {
                    if (!a.enabled && a.days.length === 0) updateAlarm(a.id, { onceDate: nextOnceDate(a.time) });
                    toggleAlarm(a.id);
                  }}
                  trackColor={{ true: "#DC2626", false: "#CBD5E1" }}
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

      <Sheet
        visible={editing.open}
        onClose={() => setEditing({ open: false })}
        title={editing.alarm ? "تعديل المنبّه" : "منبّه جديد"}
      >
        <TimeField label="الوقت" value={time} onChange={setTime} />
        <Field label="الاسم" value={label} onChangeText={setLabel} placeholder="مثال: الاستيقاظ للمناوبة" />
        <FieldRow label="التكرار (فارغ = مرة واحدة)">
          <View className="flex-row flex-wrap gap-2">
            {WEEK_ORDER.map((d) => (
              <Chip
                key={d}
                label={DAYS[d]}
                selected={days.includes(d)}
                color="#DC2626"
                onPress={() => setDays((c) => (c.includes(d) ? c.filter((x) => x !== d) : [...c, d]))}
              />
            ))}
          </View>
        </FieldRow>
        <FieldRow label="مدة الغفوة">
          <View className="flex-row gap-2">
            {SNOOZES.map((s) => (
              <Chip key={s} label={`${s} د`} selected={snooze === s} color="#DC2626" onPress={() => setSnooze(s)} />
            ))}
          </View>
        </FieldRow>
        <View className="flex-row gap-3 mt-2">
          <View className="flex-1">
            <Button label="حفظ" icon="checkmark" onPress={save} />
          </View>
          {editing.alarm ? (
            <Button
              label="حذف"
              variant="danger"
              icon="trash-outline"
              onPress={() => {
                removeAlarm(editing.alarm!.id);
                setEditing({ open: false });
              }}
            />
          ) : null}
        </View>
      </Sheet>
    </Screen>
  );
}
