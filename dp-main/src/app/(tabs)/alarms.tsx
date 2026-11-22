import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, FlatList, Pressable, StyleSheet, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { DAYS, DAYS_SHORT, WEEK_ORDER } from "@/constants/arabic";
import { useNow } from "@/hooks/useNow";
import { alarmSupported, ensureAlarmPermissions, nextAlarmFire, scheduleTestAlarm } from "@/lib/alarm";
import { CHALLENGE_LABELS } from "@/lib/alarmChallenge";
import { addDays, combine, fmtTime, toISO } from "@/lib/dates";
import { useAlarms } from "@/store/useAlarms";
import { useOnFabRequest } from "@/store/useFabRequest";
import type { AlarmItem } from "@/types";

// ---------- ألوان تصميم Clucky ----------
const BG = "#F4F4F4";
const CARD = "#FFFFFF";
const RED = "#E32D0B";
const GREEN = "#22C55E";
const INK = "#111111";
const MUTED = "#9A9A9A";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

/** أقرب تاريخ لتشغيل منبّه مرة واحدة */
function nextOnceDate(time: string): string {
  const today = toISO(new Date());
  return combine(today, time).getTime() > Date.now() ? today : addDays(today, 1);
}

const describe = (a: AlarmItem) => {
  if (a.days.length === 0) return a.onceDate === toISO(new Date()) ? "اليوم" : "مرة واحدة";
  if (a.days.length === 7) return "كل يوم";
  return WEEK_ORDER.filter((d) => a.days.includes(d))
    .map((d) => DAYS_SHORT[d])
    .join(" • ");
};

const timeParts = (a: AlarmItem): [string, string] => {
  const [t, suffix] = fmtTime(a.time).split(" ");
  return [t, suffix];
};

export default function AlarmsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const alarms = useAlarms((s) => s.alarms);
  const updateAlarm = useAlarms((s) => s.updateAlarm);
  const toggleAlarm = useAlarms((s) => s.toggleAlarm);

  const now = useNow(30000);
  const supported = alarmSupported();
  const [permOk, setPermOk] = useState<boolean | null>(null);
  useEffect(() => {
    if (supported) ensureAlarmPermissions().then(setPermOk);
  }, [supported]);

  const openEdit = (id: string, date?: string) =>
    router.push({ pathname: "/alarm/[id]", params: date ? { id, date } : { id } });
  // الضغط المطوّل على الزر العائم = منبّه جديد
  useOnFabRequest("alarms", () => openEdit("new"));

  // اليوم المحدّد في شريط الأسبوع (null = عرض الكل)
  const [selDay, setSelDay] = useState<number | null>(null);
  const todayISO = toISO(now);
  const weekDates = useMemo(() => {
    const off = (now.getDay() - WEEK_ORDER[0] + 7) % 7;
    return WEEK_ORDER.map((_, i) => addDays(todayISO, i - off));
  }, [todayISO, now]);
  const runsOn = (a: AlarmItem, d: number, date: string) =>
    a.days.length > 0 ? a.days.includes(d) : a.onceDate === date;
  const counts = useMemo(() => {
    const m: Record<number, number> = {};
    WEEK_ORDER.forEach((d, i) => {
      m[d] = alarms.filter((a) => a.enabled && runsOn(a, d, weekDates[i])).length;
    });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alarms, weekDates]);
  const selIndex = selDay === null ? -1 : WEEK_ORDER.indexOf(selDay);
  const shown = useMemo(
    () => (selDay === null ? alarms : alarms.filter((a) => runsOn(a, selDay, weekDates[selIndex]))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alarms, selDay, weekDates],
  );

  // أقرب منبّه فعّال مع موعد رنينه
  const next = useMemo(() => {
    let best: { alarm: AlarmItem; at: Date } | null = null;
    for (const a of alarms) {
      const f = nextAlarmFire([a], now);
      if (f && (!best || f.at < best.at)) best = { alarm: a, at: f.at };
    }
    return best;
  }, [alarms, now]);

  const test = async () => {
    const ok = await scheduleTestAlarm();
    Alert.alert(
      ok ? "تمت الجدولة" : "غير متاح",
      ok ? "سيرنّ المنبّه التجريبي بعد دقيقة. أغلق الشاشة لتجربة شاشة القفل." : "المنبّه يحتاج Development Build.",
    );
  };

  const onToggle = (a: AlarmItem) => {
    if (!a.enabled && a.days.length === 0) updateAlarm(a.id, { onceDate: nextOnceDate(a.time) });
    toggleAlarm(a.id);
  };

  const header = (
    <View style={{ gap: 12, marginBottom: 12 }}>
      <Pressable onPress={() => router.push("/sleep")} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#0F1B3D", borderRadius: 20, padding: 14 }}>
        <Ionicons name="moon" size={22} color="#A5B4FC" />
        <Text w="bold" style={{ color: "#fff", flex: 1 }}>
          النوم والصحة: سجل نومك وأفضل وقت للنوم
        </Text>
        <Ionicons name="chevron-back" size={18} color="#fff" />
      </Pressable>
      {!supported ? (
        <Card className="bg-amber-50 border-amber-200">
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
        <Card className="bg-red-50 border-red-200">
          <Text w="bold" className="text-red-900">
            الصلاحيات ناقصة
          </Text>
          <Text className="text-red-900 text-sm mt-1">
            فعّل الإشعارات و«المنبّهات والتذكيرات» لتطبيق Dentist Planner من إعدادات الهاتف. وعلى Xiaomi اسمح بالتشغيل
            التلقائي وبدون قيود بطارية.
          </Text>
        </Card>
      ) : null}

      <View style={s.rowBetween}>
        <View style={[s.row, { gap: 8 }]}>
          <Ionicons name="alarm" size={30} color={INK} />
          <Text w="bold" style={{ fontSize: 24, lineHeight: 34, color: INK }}>
            المنبّه
          </Text>
        </View>
        <View style={[s.row, { gap: 10 }]}>
          <Text style={{ fontSize: 12, color: MUTED }}>
            {alarms.filter((a) => a.enabled).length} من {alarms.length} فعّال
          </Text>
          <Pressable
            onPress={() => openEdit("new")}
            accessibilityLabel="إضافة منبّه"
            style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: RED, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </Pressable>
        </View>
      </View>

      <WeekStrip
        counts={counts}
        dates={weekDates}
        todayIndex={now.getDay()}
        selected={selDay}
        onSelect={(d) => setSelDay((cur) => (cur === d ? null : d))}
        onAdd={(date) => openEdit("new", date)}
      />
      {selDay !== null ? (
        <View style={s.rowBetween}>
          <Text w="bold" style={{ fontSize: 13, color: INK }}>
            {DAYS[selDay]} · {shown.length} منبّه
          </Text>
          <Pressable onPress={() => setSelDay(null)} hitSlop={10}>
            <Text w="bold" style={{ fontSize: 12, color: RED }}>
              عرض الكل
            </Text>
          </Pressable>
        </View>
      ) : (
        <Text style={{ fontSize: 11, color: MUTED, textAlign: "center" }}>اضغط يومًا لعرض منبّهاته · اضغط مطوّلًا لإضافة منبّه فيه</Text>
      )}

      <SectionTitle text="المنبّه القادم" />
      {next ? (
        <NextWakeupCard alarm={next.alarm} at={next.at} now={now} onPress={() => openEdit(next.alarm.id)} />
      ) : (
        <View style={[s.nextCard, { padding: 24 }]}>
          <Text style={{ color: MUTED, fontSize: 14 }}>لا يوجد منبّه فعّال</Text>
        </View>
      )}
      <View style={{ height: 4 }} />
      <SectionTitle text="كل المنبّهات" />
    </View>
  );

  return (
    <View style={s.root}>
      <FlatList
        data={shown}
        keyExtractor={(a) => a.id}
        style={{ paddingTop: insets.top }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 220, gap: 12 }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          selDay !== null ? (
            <View style={{ gap: 10, paddingVertical: 12 }}>
              <Text style={{ color: MUTED, textAlign: "center" }}>لا منبّهات في هذا اليوم.</Text>
              <Button label="إضافة منبّه لهذا اليوم" icon="add-circle-outline" variant="outline" onPress={() => openEdit("new", weekDates[selIndex])} />
            </View>
          ) : (
            <Text style={{ color: MUTED, textAlign: "center", paddingVertical: 12 }}>
              لا منبّهات. اضغط + لإضافة منبّه، أو اربط منبّهًا بأي مناوبة من شاشة الحدث.
            </Text>
          )
        }
        ListFooterComponent={
          <View style={{ marginTop: 4 }}>
            <Button label="تجربة منبّه بعد دقيقة" icon="play-circle-outline" variant="outline" onPress={test} />
          </View>
        }
        renderItem={({ item }) => (
          <AlarmRow alarm={item} onToggle={() => onToggle(item)} onPress={() => openEdit(item.id)} />
        )}
      />

      {/* تلاشي أسفل القائمة تحت الزر العائم */}
      <View pointerEvents="none" style={s.fade}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={BG} stopOpacity={0} />
              <Stop offset="1" stopColor={BG} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#fade)" />
        </Svg>
      </View>

    </View>
  );
}

// ---------- شريط الأسبوع (تفاعلي) ----------
function DayCircle({
  num,
  count,
  isToday,
  selected,
  onPress,
  onLong,
}: {
  num: number;
  count: number;
  isToday: boolean;
  selected: boolean;
  onPress: () => void;
  onLong: () => void;
}) {
  const sc = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.spring(sc, { toValue: selected ? 1.14 : 1, useNativeDriver: true, friction: 5 }).start();
  }, [selected, sc]);
  const press = (v: number) => Animated.spring(sc, { toValue: v, useNativeDriver: true, friction: 6 }).start();
  const has = count > 0;
  const bg = selected ? RED : has ? INK : "#E7E7E7";
  const fg = selected || has ? "#fff" : MUTED;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLong}
      onPressIn={() => press(0.9)}
      onPressOut={() => press(selected ? 1.14 : 1)}
      accessibilityLabel={`${num}`}
      style={{ flex: 1, alignItems: "center" }}
    >
      <Animated.View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: isToday ? 3 : 0,
          borderColor: isToday ? GREEN : "transparent",
          transform: [{ scale: sc }],
        }}
      >
        <Text w="bold" style={{ color: fg, fontSize: 16 }}>
          {num}
        </Text>
        {count > 1 ? (
          <View style={s.badge}>
            <Text w="bold" style={{ color: INK, fontSize: 9, lineHeight: 12 }}>
              {count}
            </Text>
          </View>
        ) : null}
      </Animated.View>
      <View
        style={{ width: 6, height: 6, borderRadius: 3, marginTop: 5, backgroundColor: isToday ? GREEN : "transparent" }}
      />
    </Pressable>
  );
}

function WeekStrip({
  counts,
  dates,
  todayIndex,
  selected,
  onSelect,
  onAdd,
}: {
  counts: Record<number, number>;
  dates: string[];
  todayIndex: number;
  selected: number | null;
  onSelect: (d: number) => void;
  onAdd: (date: string) => void;
}) {
  return (
    <View>
      <View style={s.row}>
        {WEEK_ORDER.map((d) => (
          <Text key={d} style={[s.weekLabel, selected === d && { color: RED }]}>
            {DAYS_SHORT[d]}
          </Text>
        ))}
      </View>
      <View style={{ height: 6 }} />
      <View style={s.row}>
        {WEEK_ORDER.map((d, i) => (
          <DayCircle
            key={d}
            num={Number(dates[i].slice(8, 10))}
            count={counts[d] ?? 0}
            isToday={d === todayIndex}
            selected={selected === d}
            onPress={() => onSelect(d)}
            onLong={() => onAdd(dates[i])}
          />
        ))}
      </View>
    </View>
  );
}

// ---------- المنبّه القادم ----------
const SectionTitle = ({ text }: { text: string }) => (
  <Text w="bold" style={{ fontSize: 15, color: INK }}>
    {text}
  </Text>
);

function NextWakeupCard({
  alarm,
  at,
  now,
  onPress,
}: {
  alarm: AlarmItem;
  at: Date;
  now: Date;
  onPress: () => void;
}) {
  const ms = Math.max(0, at.getTime() - now.getTime());
  const hours = Math.floor(ms / 3_600_000);
  const mins = Math.floor(ms / 60_000) % 60;
  const [time, suffix] = timeParts(alarm);
  const todayISO = toISO(now);
  const atISO = toISO(at);
  const day = atISO === todayISO ? "اليوم" : atISO === addDays(todayISO, 1) ? "غدًا" : DAYS[at.getDay()];
  const ch = CHALLENGE_LABELS[alarm.challenge ?? "math"];

  return (
    <View style={s.nextCard}>
      <View style={s.rowBetween}>
        <View>
          <Text w="bold" style={{ color: RED, fontSize: 13 }}>
            {day}
          </Text>
          <Text style={{ color: MUTED, fontSize: 11 }}>
            يرنّ بعد {hours} س {mins} د
          </Text>
        </View>
        <BigTime time={time} suffix={suffix} size={44} suffixSize={16} />
      </View>
      <View style={{ height: 12 }} />
      <View style={[s.row, { gap: 10 }]}>
        <OptionTile label="طريقة الإيقاف" value={ch.label} icon={ch.icon as IconName} onPress={onPress} />
        <OptionTile label="التكرار" value={describe(alarm)} icon="calendar-outline" onPress={onPress} />
      </View>
    </View>
  );
}

function OptionTile({
  label,
  value,
  icon,
  onPress,
}: {
  label: string;
  value: string;
  icon: IconName;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={s.tile}>
      <View style={{ height: 64 }}>
        <Text w="bold" style={{ fontSize: 10, color: MUTED }}>
          {label}
        </Text>
        <Text w="bold" numberOfLines={1} style={{ fontSize: 13, color: INK }}>
          {value}
        </Text>
        <View style={{ position: "absolute", top: 0, end: 0 }}>
          <Ionicons name="chevron-back" size={16} color={INK} />
        </View>
        <View style={{ position: "absolute", bottom: 0, start: 0 }}>
          <Ionicons name={icon} size={26} color={RED} style={{ opacity: 0.85 }} />
        </View>
      </View>
    </Pressable>
  );
}

// ---------- صف المنبّه ----------
function AlarmRow({
  alarm,
  onToggle,
  onPress,
}: {
  alarm: AlarmItem;
  onToggle: () => void;
  onPress: () => void;
}) {
  const [time, suffix] = timeParts(alarm);
  const a = alarm.enabled ? 1 : 0.35;
  const ch = CHALLENGE_LABELS[alarm.challenge ?? "math"];
  return (
    <Pressable onPress={onPress} style={s.alarmRow}>
      <View style={s.rowBetween}>
        <BigTime time={time} suffix={suffix} size={30} suffixSize={13} alpha={a} />
        <Switch
          value={alarm.enabled}
          onValueChange={onToggle}
          thumbColor="#fff"
          trackColor={{ true: GREEN, false: "#E0E0E0" }}
          ios_backgroundColor="#E0E0E0"
        />
      </View>
      <View style={{ height: 6 }} />
      <View style={[s.row, { gap: 14, flexWrap: "wrap" }]}>
        <Tag icon="calendar-outline" text={describe(alarm)} color={RED} alpha={a} />
        <Tag icon={ch.icon as IconName} text={ch.label} color={MUTED} alpha={a} />
        {alarm.weatherLink ? <Tag icon="cloud-outline" text="مرتبط بالطقس" color={MUTED} alpha={a} /> : null}
        {alarm.label ? <Tag icon="pricetag-outline" text={alarm.label} color={MUTED} alpha={a} /> : null}
      </View>
    </Pressable>
  );
}

const Tag = ({ icon, text, color, alpha }: { icon: IconName; text: string; color: string; alpha: number }) => (
  <View style={[s.row, { gap: 4, opacity: alpha }]}>
    <Ionicons name={icon} size={12} color={color} />
    <Text w="semi" style={{ fontSize: 11, color }}>
      {text}
    </Text>
  </View>
);

function BigTime({
  time,
  suffix,
  size,
  suffixSize,
  alpha = 1,
}: {
  time: string;
  suffix: string;
  size: number;
  suffixSize: number;
  alpha?: number;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, opacity: alpha, direction: "ltr" }}>
      <Text w="bold" style={{ fontSize: size, lineHeight: size * 1.25, color: INK, fontVariant: ["tabular-nums"] }}>
        {time}
      </Text>
      <Text w="bold" style={{ fontSize: suffixSize, color: INK }}>
        {suffix}
      </Text>
    </View>
  );
}

// ---------- الأنماط ----------
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  row: { flexDirection: "row", alignItems: "center" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: { position: "absolute", top: -4, end: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: "#FFB800", alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  weekLabel: { flex: 1, textAlign: "center", fontSize: 10, color: INK, fontFamily: "Cairo_700Bold" },
  nextCard: { backgroundColor: CARD, borderRadius: 24, padding: 14 },
  tile: { flex: 1, backgroundColor: BG, borderRadius: 18, padding: 12 },
  alarmRow: { backgroundColor: CARD, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 14 },
  fade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 200 },
  fab: {
    position: "absolute",
    alignSelf: "center",
    bottom: 104,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: RED,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: RED,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
});
