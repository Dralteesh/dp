import { useState } from "react";
import { Alert, Switch, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { DateField, TimeField } from "@/components/pickers";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip, TypeSelector } from "@/components/ui/Chip";
import { Field, FieldRow } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { DAYS, WEEK_ORDER } from "@/constants/arabic";
import { TYPE_META } from "@/constants/shiftTypes";
import { todayISO, weekdayOf } from "@/lib/dates";
import { usePlanner } from "@/store/usePlanner";
import { useSettings } from "@/store/useSettings";
import type { PlannerEvent, ShiftType } from "@/types";
import { useTheme } from "@/hooks/useTheme";

const REMINDERS: { value: number | null; label: string }[] = [
  { value: null, label: "بدون" },
  { value: 0, label: "عند البدء" },
  { value: 15, label: "15 د" },
  { value: 30, label: "30 د" },
  { value: 60, label: "ساعة" },
  { value: 120, label: "ساعتان" },
];

const ALARMS: { value: number | null; label: string }[] = [
  { value: null, label: "بدون" },
  { value: 0, label: "عند البدء" },
  { value: 30, label: "قبل 30 د" },
  { value: 60, label: "قبل ساعة" },
  { value: 90, label: "قبل ساعة ونصف" },
];

export default function EventFormScreen() {
  useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; type?: string; date?: string }>();
  const isNew = params.id === "new";

  const events = usePlanner((s) => s.events);
  const addEvent = usePlanner((s) => s.addEvent);
  const updateEvent = usePlanner((s) => s.updateEvent);
  const removeEvent = usePlanner((s) => s.removeEvent);
  const defaultReminder = useSettings((s) => s.defaultReminder);

  const existing: PlannerEvent | undefined = isNew ? undefined : events.find((e) => e.id === params.id);
  const initialType = (existing?.type ?? (params.type as ShiftType) ?? "hospital") as ShiftType;
  const initialDate = existing?.date ?? params.date ?? todayISO();
  const d0 = TYPE_META[initialType].defaults;

  const [type, setType] = useState<ShiftType>(initialType);
  const [title, setTitle] = useState(existing?.title ?? TYPE_META[initialType].defaultTitle);
  const [titleTouched, setTitleTouched] = useState(!!existing);
  const [date, setDate] = useState<string>(initialDate);
  const [startTime, setStartTime] = useState(existing?.startTime ?? d0.start);
  const [endTime, setEndTime] = useState(existing?.endTime ?? d0.end);
  const [endsNextDay, setEndsNextDay] = useState(existing?.endsNextDay ?? d0.endsNextDay);
  const [location, setLocation] = useState(existing?.location ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [repeat, setRepeat] = useState<"none" | "weekly">(existing?.repeat ?? "none");
  const [weekdays, setWeekdays] = useState<number[]>(existing?.weekdays ?? [weekdayOf(initialDate)]);
  const [repeatUntil, setRepeatUntil] = useState<string | undefined>(existing?.repeatUntil);
  const [reminder, setReminder] = useState<number | null>(
    existing ? existing.reminderMinutes : defaultReminder,
  );
  const [alarm, setAlarm] = useState<number | null>(existing ? existing.alarmMinutes : null);

  const meta = TYPE_META[type];

  const changeType = (t: ShiftType | undefined) => {
    if (!t) return;
    setType(t);
    if (!existing) {
      const d = TYPE_META[t].defaults;
      setStartTime(d.start);
      setEndTime(d.end);
      setEndsNextDay(d.endsNextDay);
      if (!titleTouched) setTitle(TYPE_META[t].defaultTitle);
      // المناوبة: منبّه إجباري افتراضي قبل ساعة
      setAlarm(t === "maxillo" ? 60 : null);
    }
  };

  const toggleDay = (d: number) =>
    setWeekdays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  const save = () => {
    const t = title.trim();
    if (!t) {
      Alert.alert("العنوان مطلوب", "اكتب عنوانًا للحدث.");
      return;
    }
    if (repeat === "weekly" && weekdays.length === 0) {
      Alert.alert("اختر يومًا", "اختر يومًا واحدًا على الأقل للتكرار الأسبوعي.");
      return;
    }
    const payload = {
      type,
      title: t,
      date,
      startTime,
      endTime,
      endsNextDay,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      repeat,
      weekdays: repeat === "weekly" ? weekdays : undefined,
      repeatUntil: repeat === "weekly" ? repeatUntil : undefined,
      reminderMinutes: reminder,
      alarmMinutes: alarm,
    };
    if (existing) updateEvent(existing.id, payload);
    else addEvent(payload);
    router.back();
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert(
      "حذف الحدث",
      existing.repeat === "weekly" ? "سيُحذف التكرار الأسبوعي كاملًا. متأكد؟" : "هل تريد حذف هذا الحدث؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: () => {
            removeEvent(existing.id);
            router.back();
          },
        },
      ],
    );
  };

  if (!isNew && !existing) {
    return (
      <Screen title="غير موجود" back>
        <Text>تعذّر العثور على هذا الحدث.</Text>
      </Screen>
    );
  }

  return (
    <Screen title={existing ? "تعديل الحدث" : "حدث جديد"} subtitle={meta.label} back>
      <Card accent={type}>
        <FieldRow label="النوع">
          <TypeSelector value={type} onChange={changeType} />
        </FieldRow>
        <Field
          label="العنوان"
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            setTitleTouched(true);
          }}
          placeholder="مثال: مناوبة جراحة"
        />
      </Card>

      <Card className="mt-3">
        <DateField label={repeat === "weekly" ? "يبدأ من" : "التاريخ"} value={date} onChange={(v) => v && setDate(v)} />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TimeField label="من" value={startTime} onChange={setStartTime} />
          </View>
          <View className="flex-1">
            <TimeField label="إلى" value={endTime} onChange={setEndTime} />
          </View>
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text w="semi">ينتهي في اليوم التالي</Text>
            <Text className="text-xs text-muted">لمناوبات 24 ساعة (من 8 صباحًا إلى 8 صباحًا)</Text>
          </View>
          <Switch
            value={endsNextDay}
            onValueChange={setEndsNextDay}
            trackColor={{ true: meta.hex, false: "#CBD5E1" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Card>

      <Card className="mt-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text w="semi">تكرار أسبوعي</Text>
            <Text className="text-xs text-muted">مناسب للدوام الثابت (مثل السبت والاثنين والأربعاء)</Text>
          </View>
          <Switch
            value={repeat === "weekly"}
            onValueChange={(v) => setRepeat(v ? "weekly" : "none")}
            trackColor={{ true: meta.hex, false: "#CBD5E1" }}
            thumbColor="#FFFFFF"
          />
        </View>
        {repeat === "weekly" ? (
          <View className="mt-3">
            <View className="flex-row flex-wrap gap-2 mb-3">
              {WEEK_ORDER.map((d) => (
                <Chip
                  key={d}
                  label={DAYS[d]}
                  selected={weekdays.includes(d)}
                  color={meta.hex}
                  textColor={meta.onSolid}
                  onPress={() => toggleDay(d)}
                />
              ))}
            </View>
            <DateField
              label="ينتهي التكرار (اختياري)"
              value={repeatUntil}
              onChange={setRepeatUntil}
              clearable
              placeholder="بدون نهاية"
            />
          </View>
        ) : null}
      </Card>

      <Card className="mt-3">
        <FieldRow label="تذكير (إشعار يصل إلى الساعة أيضًا)">
          <View className="flex-row flex-wrap gap-2">
            {REMINDERS.map((r) => (
              <Chip
                key={String(r.value)}
                label={r.label}
                selected={reminder === r.value}
                color={meta.hex}
                textColor={meta.onSolid}
                onPress={() => setReminder(r.value)}
              />
            ))}
          </View>
        </FieldRow>
        <FieldRow label="منبّه إجباري بصوت متكرر">
          <View className="flex-row flex-wrap gap-2">
            {ALARMS.map((r) => (
              <Chip
                key={String(r.value)}
                label={r.label}
                icon="alarm-outline"
                selected={alarm === r.value}
                color="#DC2626"
                onPress={() => setAlarm(r.value)}
              />
            ))}
          </View>
          <Text className="text-xs text-muted mt-1.5">يحتاج Development Build وصلاحية المنبّهات الدقيقة.</Text>
        </FieldRow>
      </Card>

      <Card className="mt-3">
        <Field label="المكان (اختياري)" value={location} onChangeText={setLocation} placeholder="مثال: مشفى حماه الوطني" />
        <Field label="ملاحظات" value={notes} onChangeText={setNotes} multiline placeholder="أي تفاصيل إضافية" />
      </Card>

      <View className="flex-row gap-3 mt-5">
        <View className="flex-1">
          <Button label="حفظ" icon="checkmark" type={type} onPress={save} />
        </View>
        {existing ? <Button label="حذف" icon="trash-outline" variant="danger" onPress={confirmDelete} /> : null}
      </View>
    </Screen>
  );
}
