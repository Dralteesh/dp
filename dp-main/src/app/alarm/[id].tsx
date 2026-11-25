import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { ArcTimePicker } from "@/components/alarm/ArcTimePicker";
import { CardStack } from "@/components/alarm/CardStack";
import { ChallengeView } from "@/components/alarm/ChallengeView";
import { MissionCards, SnoozeCountCards, SnoozeDurationCards } from "@/components/alarm/MissionCards";
import { Chip } from "@/components/ui/Chip";
import { Field } from "@/components/ui/Field";
import { Text } from "@/components/ui/Text";
import { DAYS, WEEK_ORDER } from "@/constants/arabic";
import { CHALLENGE_LABELS, LOCATION_RADIUS_DEFAULT, MAX_SNOOZES_DEFAULT, STEPS_DEFAULT } from "@/lib/alarmChallenge";
import { addDays, combine, toISO } from "@/lib/dates";
import { useAlarms } from "@/store/useAlarms";
import type { AlarmChallenge, AlarmChallengeData, AlarmItem } from "@/types";
import { screenBg } from "@/lib/ui";

const RED = "#E32D0B";
const INK = "#111111";
const SNOOZES = [5, 10, 15];
const SNOOZE_LIMITS = [0, 1, 2, 3];

function nextOnceDate(time: string): string {
  const today = toISO(new Date());
  return combine(today, time).getTime() > Date.now() ? today : addDays(today, 1);
}

const describeDays = (days: number[]) =>
  days.length === 0 ? "مرة واحدة" : days.length === 7 ? "كل يوم" : `${days.length} أيام`;

/** إنشاء/تعديل منبّه بتصميم Clucky: دولابا الوقت + زر إضافة، والخيارات في نافذتين سفليتين */
export default function AlarmEditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>();
  const alarms = useAlarms((s) => s.alarms);
  const addAlarm = useAlarms((s) => s.addAlarm);
  const updateAlarm = useAlarms((s) => s.updateAlarm);
  const removeAlarm = useAlarms((s) => s.removeAlarm);

  const existing = id === "new" ? undefined : alarms.find((a) => a.id === id);

  const [time, setTime] = useState(existing?.time ?? "07:00");
  const [label, setLabel] = useState(existing?.label ?? "");
  const [days, setDays] = useState<number[]>(existing?.days ?? []);
  const [snooze, setSnooze] = useState(existing?.snoozeMinutes ?? 5);
  const [maxSnoozes, setMaxSnoozes] = useState(existing?.maxSnoozes ?? MAX_SNOOZES_DEFAULT);
  const [challenge, setChallenge] = useState<AlarmChallenge>(existing?.challenge ?? "math");
  const [data, setData] = useState<AlarmChallengeData>(existing?.challengeData ?? {});
  const [link, setLink] = useState<AlarmItem["weatherLink"]>(existing?.weatherLink);
  const [qrOpen, setQrOpen] = useState(false);
  const [locBusy, setLocBusy] = useState(false);
  const [locMsg, setLocMsg] = useState("");
  const [sheet, setSheet] = useState<null | "stop" | "repeat">(null);
  const [preview, setPreview] = useState<Exclude<AlarmChallenge, "none"> | null>(null);

  const save = () => {
    const base = {
      label: label.trim() || "منبّه",
      time,
      days,
      snoozeMinutes: snooze,
      maxSnoozes,
      challenge,
      challengeData: data,
      weatherLink: link,
      onceDate:
        days.length === 0
          ? !existing && date && combine(date, time).getTime() > Date.now()
            ? date
            : nextOnceDate(time)
          : undefined,
      enabled: true,
    };
    if (existing) updateAlarm(existing.id, base);
    else addAlarm(base);
    router.back();
  };

  const ch = CHALLENGE_LABELS[challenge];

  const pickMyLocation = async () => {
    setLocBusy(true);
    setLocMsg("");
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setLocMsg("لم يُمنح إذن الموقع");
        return;
      }
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setData((d) => ({ ...d, lat: p.coords.latitude, lng: p.coords.longitude, radius: d.radius ?? LOCATION_RADIUS_DEFAULT }));
      setLocMsg("تم حفظ موقعك الحالي");
    } catch {
      setLocMsg("تعذّر تحديد الموقع");
    } finally {
      setLocBusy(false);
    }
  };

  const configContent =
    challenge === "steps" ? (
      <View className="flex-row flex-wrap gap-2">
        {[20, 30, 50, 80].map((n) => (
          <Chip key={n} label={`${n} خطوة`} selected={(data.steps ?? STEPS_DEFAULT) === n} color={RED} onPress={() => setData((d) => ({ ...d, steps: n }))} />
        ))}
      </View>
    ) : challenge === "qr" ? (
      <View style={{ gap: 10 }}>
        <Pressable onPress={() => setQrOpen(true)} style={s.action}>
          <Ionicons name="qr-code-outline" size={20} color="#fff" />
          <Text w="bold" style={{ color: "#fff" }}>
            {data.qr ? "إعادة تسجيل الكود" : "مسح الكود وتسجيله"}
          </Text>
        </Pressable>
        <Text style={{ fontSize: 12, color: "#6B6B6B" }}>
          {data.qr ? "تم تسجيل كود: " + (data.qr.length > 24 ? data.qr.slice(0, 24) + "…" : data.qr) : "ألصق أي باركود أو QR في مكان بعيد عن سريرك وسجّله هنا"}
        </Text>
      </View>
    ) : challenge === "location" ? (
      <View style={{ gap: 10 }}>
        <Pressable onPress={pickMyLocation} disabled={locBusy} style={[s.action, locBusy && { opacity: 0.6 }]}>
          <Ionicons name="location-outline" size={20} color="#fff" />
          <Text w="bold" style={{ color: "#fff" }}>
            {data.lat != null ? "تحديث الموقع من مكاني الآن" : "استخدم موقعي الحالي"}
          </Text>
        </Pressable>
        <Text style={{ fontSize: 12, color: "#6B6B6B" }}>
          {locMsg || (data.lat != null ? "الموقع محفوظ. قف في المكان المطلوب ثم اضغط للتحديث إن أردت" : "قف في المكان الذي تريد الذهاب إليه صباحًا ثم اضغط")}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {[50, 100, 150, 300].map((n) => (
            <Chip key={n} label={`${n} م`} selected={(data.radius ?? LOCATION_RADIUS_DEFAULT) === n} color={RED} onPress={() => setData((d) => ({ ...d, radius: n }))} />
          ))}
        </View>
      </View>
    ) : null;

  const modes: { key: "rain" | "heat" | "cold"; label: string }[] = [
    { key: "rain", label: "قبل المطر" },
    { key: "heat", label: "قبل الحر الشديد" },
    { key: "cold", label: "قبل البرد القارس" },
  ];

  return (
    <View style={[s.root, { backgroundColor: screenBg() }]}>
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        {/* أعلى: إغلاق + عنوان + حذف */}
        <View style={s.top}>
          <Pill onPress={() => router.back()} label="إغلاق" style={{ width: 72, height: 88 }}>
            <Ionicons name="chevron-up" size={32} color="#fff" />
          </Pill>
          <Text w="bold" style={{ fontSize: 16, color: INK, flex: 1, textAlign: "center" }}>
            {existing ? "تعديل المنبّه" : "منبّه جديد"}
          </Text>
          {existing ? (
            <Pressable
              accessibilityLabel="حذف المنبّه"
              hitSlop={10}
              style={s.trash}
              onPress={() => {
                removeAlarm(existing.id);
                router.back();
              }}
            >
              <Ionicons name="trash-outline" size={22} color="#DC2626" />
            </Pressable>
          ) : (
            <View style={{ width: 72 }} />
          )}
        </View>

        <View style={{ flex: 1 }} />

        {/* المنتقي خارج أي ScrollView حتى لا يتعارض التمرير */}
        <ArcTimePicker value={time} onChange={setTime} />

        <View style={{ flex: 0.5 }} />

        {/* أسفل: [طريقة الإيقاف] [إضافة/حفظ] [التكرار] — ثابتة اليسار/اليمين مهما كان اتجاه الجهاز */}
        <View style={s.bottomRow}>
          <Side label={ch.label} onPress={() => setSheet("stop")}>
            <Ionicons name={ch.icon as never} size={24} color={RED} />
          </Side>
          <Pill onPress={save} label={existing ? "حفظ" : "إضافة"} style={{ width: 110, height: 160 }}>
            <View style={{ alignItems: "center" }}>
              <Ionicons name={existing ? "checkmark" : "add"} size={32} color="#fff" />
              <Text w="semi" style={{ color: "#fff", fontSize: 13 }}>
                {existing ? "حفظ" : "إضافة"}
              </Text>
            </View>
          </Pill>
          <Side label={describeDays(days)} onPress={() => setSheet("repeat")}>
            <Ionicons name="calendar-outline" size={24} color={RED} />
          </Side>
        </View>
      </View>

      {/* المهمات + الغفوة: بطاقات متتالية */}
      <CardStack
        visible={sheet === "stop"}
        onClose={() => setSheet(null)}
        cards={[
          { key: "t", tone: "red", title: "طريقة الإيقاف", hint: "اضغط للاختيار · اضغط مطوّلًا للتجربة" },
          { key: "m", tone: "cream", title: "المهمة", content: <MissionCards value={challenge} onSelect={setChallenge} onPreview={setPreview} /> },
          ...(configContent ? [{ key: "c", tone: "cream" as const, title: "إعداد المهمة", content: configContent }] : []),
          { key: "s", tone: "yellow", title: "مدة الغفوة", content: <SnoozeDurationCards options={SNOOZES} value={snooze} onSelect={setSnooze} /> },
          { key: "n", tone: "blue", title: "أقصى عدد للغفوات", content: <SnoozeCountCards options={SNOOZE_LIMITS} value={maxSnoozes} onSelect={setMaxSnoozes} /> },
        ]}
      />

      {/* الاسم + التكرار: بطاقات متتالية */}
      <CardStack
        visible={sheet === "repeat"}
        onClose={() => setSheet(null)}
        cards={[
          { key: "t", tone: "blue", title: "الاسم والتكرار", hint: "فارغ = مرة واحدة" },
          { key: "f", tone: "cream", content: <Field label="الاسم" value={label} onChangeText={setLabel} placeholder="مثال: الاستيقاظ للمناوبة" /> },
          {
            key: "d",
            tone: "yellow",
            title: "التكرار",
            content: (
              <View className="flex-row flex-wrap gap-2">
                {WEEK_ORDER.map((d) => (
                  <Chip
                    key={d}
                    label={DAYS[d]}
                    selected={days.includes(d)}
                    color={RED}
                    onPress={() => setDays((c) => (c.includes(d) ? c.filter((x) => x !== d) : [...c, d]))}
                  />
                ))}
              </View>
            ),
          },
          {
            key: "w",
            tone: "cream",
            title: "ربط بالطقس",
            hint: "يُقدَّم الرنين إن توقّع الطقس الحالة خلال 3 ساعات بعد وقت المنبّه",
            content: (
              <View style={{ gap: 10 }}>
                <View className="flex-row flex-wrap gap-2">
                  <Chip label="بدون" selected={!link} color={RED} onPress={() => setLink(undefined)} />
                  {modes.map((m) => (
                    <Chip key={m.key} label={m.label} selected={link?.mode === m.key} color={RED} onPress={() => setLink({ mode: m.key, shiftMin: link?.shiftMin ?? 20 })} />
                  ))}
                </View>
                {link ? (
                  <View className="flex-row flex-wrap gap-2">
                    {[10, 20, 30, 45].map((n) => (
                      <Chip key={n} label={`قبل ${n} د`} selected={link.shiftMin === n} color={RED} onPress={() => setLink({ mode: link.mode, shiftMin: n })} />
                    ))}
                  </View>
                ) : null}
              </View>
            ),
          },
        ]}
      />

      {qrOpen ? <LazyQrScan onClose={() => setQrOpen(false)} onScan={(v) => { setData((d) => ({ ...d, qr: v })); setQrOpen(false); }} /> : null}

      {/* تجربة المهمة (ضغط مطوّل على البطاقة) */}
      <Modal visible={preview !== null} animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={{ flex: 1, backgroundColor: "#C2410C", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Pressable
            onPress={() => setPreview(null)}
            hitSlop={12}
            accessibilityLabel="إغلاق التجربة"
            style={{ position: "absolute", top: insets.top + 12, end: 20 }}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </Pressable>
          <Text w="semi" style={{ color: "#FFEDD5", marginBottom: 24 }}>
            تجربة المهمة
          </Text>
          {preview ? <ChallengeView key={preview} kind={preview} data={data} onSolved={() => setPreview(null)} /> : null}
        </View>
      </Modal>
    </View>
  );
}

/** نافذة مسح الكود تُحمَّل عند الطلب حتى لا ينهار المحرّر إن غابت وحدة الكاميرا */
function LazyQrScan({ onClose, onScan }: { onClose: () => void; onScan: (v: string) => void }) {
  let mod: typeof import("@/components/alarm/CameraChallenges") | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require("@/components/alarm/CameraChallenges");
  } catch {
    mod = null;
  }
  if (!mod) return null;
  return <mod.QrScanModal visible onClose={onClose} onScan={onScan} />;
}

function Pill({
  onPress,
  style,
  label,
  children,
}: {
  onPress: () => void;
  style: object;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={[s.pill, style]}>
      {children}
    </Pressable>
  );
}

function Side({ onPress, label, children }: { onPress: () => void; label: string; children: React.ReactNode }) {
  return (
    <View style={{ alignItems: "center", width: 84, gap: 6 }}>
      <Pressable onPress={onPress} accessibilityLabel={label} style={s.side}>
        {children}
      </Pressable>
      <Text w="semi" numberOfLines={1} style={{ fontSize: 11, color: "#6B6B6B" }}>
        {label}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: screenBg() },
  top: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingTop: 16, gap: 12 },
  trash: { width: 72, alignItems: "center", justifyContent: "center" },
  bottomRow: {
    direction: "ltr",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  pill: {
    borderRadius: 999,
    backgroundColor: RED,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: RED,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: RED,
    borderRadius: 18,
    paddingVertical: 12,
  },
  side: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
