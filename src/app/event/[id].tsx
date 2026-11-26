import { useState } from "react";
import { Alert, Pressable, Switch, View } from "react-native";
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
import { useAgendaInput } from "@/hooks/useAgenda";
import { eventClashes, summarizeClashes } from "@/lib/conflicts";
import { addDays, fmtDateFull, spanDaysOf, todayISO, weekdayOf } from "@/lib/dates";
import { eventHours } from "@/lib/shiftPatterns";
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
  const agendaInput = useAgendaInput();
  const removeEvent = usePlanner((s) => s.removeEvent);
  const defaultReminder = useSettings((s) => s.defaultReminder);
  const places = useSettings((s) => s.places);

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
  const [extraDays, setExtraDays] = useState<number>(existing ? spanDaysOf(existing) : d0.endsNextDay ? 1 : 0);
  const endsNextDay = extraDays > 0;
  const [location, setLocation] = useState(existing?.location ?? TYPE_META[initialType].place);
  const [locTouched, setLocTouched] = useState(!!existing);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [repeat, setRepeat] = useState<"none" | "weekly">(existing?.repeat ?? "none");
  const [weekdays, setWeekdays] = useState<number[]>(existing?.weekdays ?? [weekdayOf(initialDate)]);
  const [repeatUntil, setRepeatUntil] = useState<string | undefined>(existing?.repeatUntil);
  const [reminder, setReminder] = useState<number | null>(
    existing ? existing.reminderMinutes : defaultReminder,
  );
  const [alarm, setAlarm] = useState<number | null>(existing ? existing.alarmMinutes : TYPE_META[initialType].defaults.alarmMinutes);

  const meta = TYPE_META[type];

  const changeType = (t: ShiftType | undefined) => {
    if (!t) return;
    setType(t);
    if (!existing) {
      const d = TYPE_META[t].defaults;
      setStartTime(d.start);
      setEndTime(d.end);
      setExtraDays(d.endsNextDay ? 1 : 0);
      if (!titleTouched) setTitle(TYPE_META[t].defaultTitle);
      // منبّه إجباري افتراضي حسب إعدادات مكان العمل (المناوبة: قبل ساعة)
      setAlarm(d.alarmMinutes);
      if (!locTouched) setLocation(TYPE_META[t].place);
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
      extraDays: extraDays > 0 ? extraDays : undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      repeat,
      weekdays: repeat === "weekly" ? weekdays : undefined,
      repeatUntil: repeat === "weekly" ? repeatUntil : undefined,
      reminderMinutes: reminder,
      alarmMinutes: alarm,
    };
    const go = () => {
      // مكان جديد يُكتب يدويًا يُضاف لقائمة الأماكن المعروفة
      if (payload.location && !places.includes(payload.location)) {
        useSettings.getState().update({ places: [...places, payload.location] });
      }
      if (existing) updateEvent(existing.id, payload);
      else addEvent(payload);
      router.back();
    };
    const clashes = eventClashes(payload, agendaInput, existing?.id);
    if (clashes.length) {
      Alert.alert("تعارض في الجدول", `${summarizeClashes(clashes)}\n\nهل تريد الحفظ رغم ذلك؟`, [
        { text: "تعديل", style: "cancel" },
        { text: "حفظ رغم التعارض", onPress: go },
      ]);
      return;
    }
    go();
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
            <Text w="semi">تنتهي في يوم آخر</Text>
            <Text className="text-xs text-muted">لمناوبات 24 ساعة أو 48 ساعة أو أكثر</Text>
          </View>
          <Switch
            value={endsNextDay}
            onValueChange={(v) => setExtraDays(v ? 1 : 0)}
            trackColor={{ true: meta.hex, false: "#CBD5E1" }}
            thumbColor="#FFFFFF"
          />
        </View>
        {endsNextDay ? (
          <View>
            <View className="flex-row items-center justify-between">
              <Text w="semi">تنتهي بعد</Text>
              <View className="flex-row items-center gap-3">
                <Pressable
                  onPress={() => setExtraDays((n) => Math.max(1, n - 1))}
                  hitSlop={8}
                  className="w-9 h-9 rounded-full items-center justify-center"
                  style={{ backgroundColor: "#F1F5F9" }}
                  accessibilityLabel="يوم أقل"
                >
                  <Text w="bold" className="text-lg">−</Text>
                </Pressable>
                <Text w="bold" className="text-lg" style={{ minWidth: 70, textAlign: "center" }}>
                  {extraDays === 1 ? "يوم" : extraDays === 2 ? "يومين" : `${extraDays} أيام`}
                </Text>
                <Pressable
                  onPress={() => setExtraDays((n) => Math.min(30, n + 1))}
                  hitSlop={8}
                  className="w-9 h-9 rounded-full items-center justify-center"
                  style={{ backgroundColor: meta.hex }}
                  accessibilityLabel="يوم أكثر"
                >
                  <Text w="bold" className="text-lg" style={{ color: "#FFFFFF" }}>+</Text>
                </Pressable>
              </View>
            </View>
            <Text className="text-xs text-muted mt-1">
              تنتهي {fmtDateFull(addDays(date, extraDays))} الساعة {endTime} • المدة {Math.round(eventHours({ startTime, endTime, endsNextDay, extraDays }))} ساعة
            </Text>
          </View>
        ) : null}
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
        {places.length ? (
          <FieldRow label="المكان">
            <View className="flex-row flex-wrap gap-2">
              {places.map((p) => (
                <Chip
                  key={p}
                  label={p}
                  icon="location-outline"
                  selected={location === p}
                  color={meta.hex}
                  textColor={meta.onSolid}
                  onPress={() => {
                    setLocation(location === p ? "" : p);
                    setLocTouched(true);
                  }}
                />
              ))}
            </View>
          </FieldRow>
        ) : null}
        <Button
          label="تعديل هذا النوع"
          variant="ghost"
          icon="create-outline"
          small
          onPress={() => router.push({ pathname: "/workplaces", params: { type } })}
        />
        <Field
          label="أو اكتب مكانًا آخر"
          value={location}
          onChangeText={(v) => {
            setLocation(v);
            setLocTouched(true);
          }}
          placeholder="مثال: مشفى حماه الوطني"
        />
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
