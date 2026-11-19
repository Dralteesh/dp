import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { Egg } from "@/components/alarm/Egg";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { DAYS, DAYS_SHORT, WEEK_ORDER } from "@/constants/arabic";
import { useNow } from "@/hooks/useNow";
import { alarmSupported, ensureAlarmPermissions, nextAlarmFire, scheduleTestAlarm } from "@/lib/alarm";
import { CHALLENGE_LABELS } from "@/lib/alarmChallenge";
import { addDays, combine, fmtTime, toISO } from "@/lib/dates";
import { useAlarms } from "@/store/useAlarms";
import type { AlarmItem } from "@/types";

// ---------- ألوان تصميم Clucky ----------
const BG = "#F4F4F4";
const CARD = "#FFFFFF";
const RED = "#E32D0B";
const GREEN = "#22C55E";
const INK = "#111111";
const MUTED = "#9A9A9A";
const EGG_GREY = "#D9D9D9";

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

  const openEdit = (id: string) => router.push({ pathname: "/alarm/[id]", params: { id } });

  // أقرب منبّه فعّال مع موعد رنينه
  const next = useMemo(() => {
    let best: { alarm: AlarmItem; at: Date } | null = null;
    for (const a of alarms) {
      const f = nextAlarmFire([a], now);
      if (f && (!best || f.at < best.at)) best = { alarm: a, at: f.at };
    }
    return best;
  }, [alarms, now]);

  // أيام الأسبوع القادم التي فيها منبّه فعّال (بديل «سلسلة الأيام» لأن التطبيق لا يسجّل إيقاف المنبّهات)
  const scheduled = useMemo(() => {
    const set = new Set<number>();
    for (const a of alarms) {
      if (!a.enabled) continue;
      if (a.days.length > 0) a.days.forEach((d) => set.add(d));
      else if (a.onceDate) set.add(new Date(`${a.onceDate}T12:00:00`).getDay());
    }
    return set;
  }, [alarms]);

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
          <Egg width={26} height={32} color={INK} face={false} />
          <Text w="bold" style={{ fontSize: 24, lineHeight: 34, color: INK }}>
            المنبّه
          </Text>
        </View>
        <Text style={{ fontSize: 12, color: MUTED }}>
          {alarms.filter((a) => a.enabled).length} من {alarms.length} فعّال
        </Text>
      </View>

      <WeekStrip scheduled={scheduled} todayIndex={now.getDay()} />

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
        data={alarms}
        keyExtractor={(a) => a.id}
        style={{ paddingTop: insets.top }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 220, gap: 12 }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Text style={{ color: MUTED, textAlign: "center", paddingVertical: 12 }}>
            لا منبّهات. اضغط + لإضافة منبّه، أو اربط منبّهًا بأي مناوبة من شاشة الحدث.
          </Text>
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

      <Pressable onPress={() => openEdit("new")} accessibilityLabel="إضافة منبّه" style={s.fab}>
        <Ionicons name="add" size={36} color="#fff" />
      </Pressable>
    </View>
  );
}

// ---------- شريط الأسبوع ----------
function WeekStrip({ scheduled, todayIndex }: { scheduled: Set<number>; todayIndex: number }) {
  return (
    <View>
      <View style={s.row}>
        {WEEK_ORDER.map((d) => (
          <Text key={d} style={s.weekLabel}>
            {DAYS_SHORT[d]}
          </Text>
        ))}
      </View>
      <View style={{ height: 6 }} />
      <View style={s.row}>
        {WEEK_ORDER.map((d) => {
          const on = scheduled.has(d);
          return (
            <View key={d} style={{ flex: 1, alignItems: "center" }}>
              <Egg width={34} height={40} color={on ? "#fff" : EGG_GREY} face={on} outlined={on} />
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  marginTop: 4,
                  backgroundColor: d === todayIndex ? GREEN : "transparent",
                }}
              />
            </View>
          );
        })}
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
