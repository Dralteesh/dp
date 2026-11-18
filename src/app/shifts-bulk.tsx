import { useMemo, useState } from "react";
import { Alert, Pressable, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DateField, TimeField } from "@/components/pickers";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip, Segmented, TypeSelector } from "@/components/ui/Chip";
import { SectionHeader } from "@/components/ui/EmptyState";
import { Field, FieldRow } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { DAYS, DAYS_SHORT, MONTHS, WEEK_ORDER } from "@/constants/arabic";
import { TYPE_META } from "@/constants/shiftTypes";
import { useAgendaInput } from "@/hooks/useAgenda";
import { useTheme } from "@/hooks/useTheme";
import { eventClashes, summarizeClashes } from "@/lib/conflicts";
import { addDays, fmtDateShort, monthCells, todayISO } from "@/lib/dates";
import { parseAmount } from "@/lib/format";
import { buildSeries, cycleDates, listSeries, skipExisting, weekdayDates } from "@/lib/shiftPatterns";
import { usePlanner } from "@/store/usePlanner";
import { useSettings } from "@/store/useSettings";
import type { ShiftType } from "@/types";

type Mode = "days" | "cycle" | "weekdays";

/** جدولة سريعة: ملء الشهر بدوامات/مناوبات بضغطة (أيام محددة، كل N أيام، أو أيام أسبوع ضمن مجال) */
export default function ShiftsBulkScreen() {
  useTheme();
  const router = useRouter();
  const input = useAgendaInput();
  const events = usePlanner((s) => s.events);
  const defaultReminder = useSettings((s) => s.defaultReminder);

  const [type, setType] = useState<ShiftType>("maxillo");
  const [title, setTitle] = useState(TYPE_META.maxillo.defaultTitle);
  const [titleTouched, setTitleTouched] = useState(false);
  const d0 = TYPE_META.maxillo.defaults;
  const [startTime, setStartTime] = useState(d0.start);
  const [endTime, setEndTime] = useState(d0.end);
  const [endsNextDay, setEndsNextDay] = useState(d0.endsNextDay);
  const [alarm, setAlarm] = useState(true);

  const [mode, setMode] = useState<Mode>("days");
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [picked, setPicked] = useState<string[]>([]);
  const [start, setStart] = useState(todayISO());
  const [every, setEvery] = useState(4);
  const [count, setCount] = useState("8");
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(addDays(todayISO(), 30));
  const [wdays, setWdays] = useState<number[]>([6, 0, 1, 2, 3]);

  const meta = TYPE_META[type];

  const changeType = (t?: ShiftType) => {
    if (!t) return;
    setType(t);
    const d = TYPE_META[t].defaults;
    setStartTime(d.start);
    setEndTime(d.end);
    setEndsNextDay(d.endsNextDay);
    setAlarm(d.alarmMinutes != null);
    if (!titleTouched) setTitle(TYPE_META[t].defaultTitle);
  };

  const dates = useMemo(() => {
    if (mode === "days") return [...picked].sort();
    if (mode === "cycle") return cycleDates(start, every, Math.round(parseAmount(count)));
    return from <= to ? weekdayDates(from, to, wdays) : [];
  }, [mode, picked, start, every, count, from, to, wdays]);

  const tpl = {
    type,
    title: title.trim() || meta.defaultTitle,
    startTime,
    endTime,
    endsNextDay,
    reminderMinutes: defaultReminder as number | null,
    alarmMinutes: alarm ? (TYPE_META[type].defaults.alarmMinutes ?? 60) : (null as number | null),
  };

  const { fresh, skipped } = useMemo(() => skipExisting(dates, events, tpl), [dates, events, type, startTime]); // eslint-disable-line react-hooks/exhaustive-deps

  const clashes = useMemo(() => {
    const out = [];
    for (const d of fresh.slice(0, 90)) {
      out.push(...eventClashes({ date: d, startTime, endTime, endsNextDay, repeat: "none" }, input));
    }
    return out;
  }, [fresh, startTime, endTime, endsNextDay, input]);

  const cells = useMemo(() => monthCells(ym.y, ym.m), [ym]);
  const toggleDate = (iso: string) => setPicked((p) => (p.includes(iso) ? p.filter((x) => x !== iso) : [...p, iso]));
  const moveMonth = (n: number) => {
    const d = new Date(ym.y, ym.m + n, 1);
    setYm({ y: d.getFullYear(), m: d.getMonth() });
  };

  const create = () => {
    if (!fresh.length) return Alert.alert("لا توجد أيام", "اختر أيامًا جديدة لإنشاء أحداث لها.");
    const go = () => {
      const made = buildSeries(fresh, tpl);
      usePlanner.setState((s) => ({ events: [...s.events, ...made] }));
      Alert.alert("تم", `أُنشئ ${made.length} حدثًا.`, [{ text: "حسنًا", onPress: () => router.back() }]);
    };
    if (clashes.length) {
      Alert.alert("تعارضات في الجدول", `${summarizeClashes(clashes)}\n\nهل تريد الإنشاء رغم ذلك؟`, [
        { text: "رجوع", style: "cancel" },
        { text: "إنشاء رغم التعارض", onPress: go },
      ]);
    } else go();
  };

  const series = useMemo(() => listSeries(events), [events]);

  const removeSeries = (id: string, name: string, n: number) =>
    Alert.alert("حذف السلسلة", `سيُحذف ${n} حدثًا من «${name}».`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: () => usePlanner.setState((s) => ({ events: s.events.filter((e) => e.seriesId !== id) })),
      },
    ]);

  return (
    <Screen title="جدولة الدوامات" subtitle="املأ الشهر بضغطة واحدة" back>
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
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TimeField label="من" value={startTime} onChange={setStartTime} />
          </View>
          <View className="flex-1">
            <TimeField label="إلى" value={endTime} onChange={setEndTime} />
          </View>
        </View>
        <View className="flex-row items-center justify-between mb-2">
          <Text w="semi" className="flex-1">
            ينتهي في اليوم التالي
          </Text>
          <Switch value={endsNextDay} onValueChange={setEndsNextDay} trackColor={{ true: meta.hex, false: "#CBD5E1" }} thumbColor="#FFFFFF" />
        </View>
        <View className="flex-row items-center justify-between">
          <Text w="semi" className="flex-1">
            منبّه إجباري قبل ساعة
          </Text>
          <Switch value={alarm} onValueChange={setAlarm} trackColor={{ true: "#DC2626", false: "#CBD5E1" }} thumbColor="#FFFFFF" />
        </View>
      </Card>

      <View className="mt-4">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "days", label: "أيام محددة" },
            { value: "cycle", label: "كل N أيام" },
            { value: "weekdays", label: "أيام الأسبوع" },
          ]}
        />
      </View>

      <Card className="mt-3">
        {mode === "days" && (
          <View>
            <View className="flex-row items-center justify-between mb-2">
              <Pressable onPress={() => moveMonth(-1)} hitSlop={10}>
                <Ionicons name="chevron-forward" size={22} color="#0F172A" />
              </Pressable>
              <Text w="bold">
                {MONTHS[ym.m]} {ym.y}
              </Text>
              <Pressable onPress={() => moveMonth(1)} hitSlop={10}>
                <Ionicons name="chevron-back" size={22} color="#0F172A" />
              </Pressable>
            </View>
            <View className="flex-row mb-1">
              {WEEK_ORDER.map((d) => (
                <Text key={d} className="flex-1 text-center text-xs text-muted">
                  {DAYS_SHORT[d]}
                </Text>
              ))}
            </View>
            {Array.from({ length: 6 }, (_, r) => (
              <View key={r} className="flex-row">
                {cells.slice(r * 7, r * 7 + 7).map((c) => {
                  const on = picked.includes(c.iso);
                  return (
                    <Pressable key={c.iso} onPress={() => toggleDate(c.iso)} className="flex-1 items-center py-1">
                      <View
                        className="w-9 h-9 rounded-full items-center justify-center"
                        style={{ backgroundColor: on ? meta.hex : "transparent" }}
                      >
                        <Text w={on ? "bold" : "regular"} style={{ color: on ? meta.onSolid : c.inMonth ? "#0F172A" : "#CBD5E1" }}>
                          {Number(c.iso.slice(8))}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
            <View className="flex-row gap-2 mt-2">
              <Chip label="مسح الاختيار" icon="close" onPress={() => setPicked([])} />
            </View>
          </View>
        )}

        {mode === "cycle" && (
          <View>
            <DateField label="أول يوم" value={start} onChange={(v) => v && setStart(v)} />
            <FieldRow label="كل كم يوم؟">
              <View className="flex-row flex-wrap gap-2">
                {[2, 3, 4, 5, 6, 7].map((n) => (
                  <Chip key={n} label={`${n}`} selected={every === n} color={meta.hex} textColor={meta.onSolid} onPress={() => setEvery(n)} />
                ))}
              </View>
            </FieldRow>
            <Field label="عدد المرات" value={count} onChangeText={setCount} keyboardType="number-pad" hint="حتى 120" />
          </View>
        )}

        {mode === "weekdays" && (
          <View>
            <DateField label="من" value={from} onChange={(v) => v && setFrom(v)} />
            <DateField label="إلى" value={to} onChange={(v) => v && setTo(v)} />
            <FieldRow label="الأيام">
              <View className="flex-row flex-wrap gap-2">
                {WEEK_ORDER.map((d) => (
                  <Chip
                    key={d}
                    label={DAYS[d]}
                    selected={wdays.includes(d)}
                    color={meta.hex}
                    textColor={meta.onSolid}
                    onPress={() => setWdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d]))}
                  />
                ))}
              </View>
            </FieldRow>
          </View>
        )}
      </Card>

      <View className="rounded-2xl p-3 mt-3" style={{ backgroundColor: clashes.length ? "#FEF3C7" : meta.soft }}>
        <Text w="bold" style={{ color: clashes.length ? "#92400E" : meta.inkHex }}>
          سيُنشأ {fresh.length} حدثًا
          {skipped.length ? ` (تخطّي ${skipped.length} موجودة)` : ""}
        </Text>
        {fresh.length ? (
          <Text className="text-xs mt-1" style={{ color: clashes.length ? "#92400E" : meta.inkHex }}>
            من {fmtDateShort(fresh[0])} إلى {fmtDateShort(fresh[fresh.length - 1])}
          </Text>
        ) : null}
        {clashes.length ? (
          <Text className="text-xs mt-1.5" style={{ color: "#92400E" }}>
            تعارضات: {clashes.length}
            {"\n"}
            {summarizeClashes(clashes, 3)}
          </Text>
        ) : null}
      </View>

      <View className="mt-4">
        <Button label={`إنشاء ${fresh.length} حدثًا`} icon="checkmark" type={type} disabled={!fresh.length} onPress={create} />
      </View>

      {series.length > 0 && (
        <>
          <SectionHeader title="سلاسل أنشأتها سابقًا" />
          {series.map((s) => (
            <View key={s.id} className="flex-row items-center gap-3 bg-surface border border-line rounded-2xl px-4 py-3 mb-2">
              <View className="w-3 h-10 rounded-full" style={{ backgroundColor: TYPE_META[s.type].hex }} />
              <View className="flex-1">
                <Text w="semi">{s.title}</Text>
                <Text className="text-xs text-muted">
                  {s.count} حدثًا • {fmtDateShort(s.first)} → {fmtDateShort(s.last)}
                </Text>
              </View>
              <Pressable hitSlop={10} onPress={() => removeSeries(s.id, s.title, s.count)}>
                <Ionicons name="trash-outline" size={20} color="#DC2626" />
              </Pressable>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}
