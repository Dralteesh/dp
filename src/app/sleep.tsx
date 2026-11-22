import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TimeField } from "@/components/pickers";
import { Text } from "@/components/ui/Text";
import { nextAlarmFire } from "@/lib/alarm";
import { addDays, fmtTime, pad, toISO } from "@/lib/dates";
import { sharePdf } from "@/lib/pdf";
import { sleepWeatherTip } from "@/lib/weatherInsights";
import { useAlarms } from "@/store/useAlarms";
import { bedtimesFor, sleepHours, sleepScore, useSleep } from "@/store/useSleep";
import { useWeather } from "@/store/useWeather";

const NAVY = "#0F1B3D";
const CARD = "rgba(255,255,255,0.08)";
const hh = (h: number) => `${Math.floor(h)} س${Math.round((h % 1) * 60) ? ` ${Math.round((h % 1) * 60)} د` : ""}`;
const scoreColor = (s: number) => (s >= 80 ? "#34D399" : s >= 60 ? "#FBBF24" : "#F87171");

/** النوم والصحة: سجل يدوي، درجة النوم، أفضل وقت للنوم، تقرير أسبوعي PDF (بلا حسّاسات ولا بيانات تُرسل) */
export default function SleepScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const logs = useSleep((s) => s.logs);
  const add = useSleep((s) => s.add);
  const remove = useSleep((s) => s.remove);
  const alarms = useAlarms((s) => s.alarms);
  const cities = useWeather((s) => s.cities);
  const cache = useWeather((s) => s.cache);

  const nextWake = useMemo(() => nextAlarmFire(alarms, new Date()), [alarms]);
  const defaultWake = nextWake ? `${pad(nextWake.at.getHours())}:${pad(nextWake.at.getMinutes())}` : "07:00";

  const [bed, setBed] = useState("23:30");
  const [wake, setWake] = useState(defaultWake);
  const [quality, setQuality] = useState(4);
  const [target, setTarget] = useState(defaultWake);

  const today = toISO(new Date());
  const last = logs[0];
  const lastScore = last ? sleepScore(last) : null;
  const week = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
    return days.map((d) => {
      const l = logs.find((x) => x.date === d);
      return { date: d, hours: l ? sleepHours(l.bed, l.wake) : 0, score: l ? sleepScore(l) : 0 };
    });
  }, [logs, today]);
  const logged = week.filter((d) => d.hours > 0);
  const avgH = logged.length ? logged.reduce((a, b) => a + b.hours, 0) / logged.length : 0;
  const avgS = logged.length ? Math.round(logged.reduce((a, b) => a + b.score, 0) / logged.length) : 0;
  const tip = sleepWeatherTip(cities[0] ? cache[cities[0].id] : undefined);
  const suggestions = bedtimesFor(target);

  const save = () => {
    add({ date: today, bed, wake, quality });
  };

  const exportPdf = async () => {
    const rows = week
      .map((d) => `<tr><td>${d.date}</td><td>${d.hours ? hh(d.hours) : "—"}</td><td>${d.hours ? d.score : "—"}</td></tr>`)
      .join("");
    const html = `<html dir="rtl"><head><meta charset="utf-8"/><style>body{font-family:sans-serif;padding:24px}h1{font-size:22px}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border:1px solid #ccc;padding:8px;text-align:center}</style></head><body><h1>تقرير النوم الأسبوعي</h1><p>متوسط النوم: ${avgH ? hh(avgH) : "—"} · متوسط الدرجة: ${avgS || "—"}</p><table><tr><th>التاريخ</th><th>المدة</th><th>الدرجة</th></tr>${rows}</table></body></html>`;
    const err = await sharePdf(html, "sleep-report");
    if (err) Alert.alert("PDF", err);
  };

  return (
    <View style={{ flex: 1, backgroundColor: NAVY, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="رجوع" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: CARD, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </Pressable>
        <Text w="bold" style={{ color: "#fff", fontSize: 18, flex: 1 }}>
          النوم والصحة
        </Text>
        <Pressable onPress={() => router.push("/sleep-track")} accessibilityLabel="تعقّب النوم" hitSlop={10}>
          <Ionicons name="moon" size={24} color="#fff" />
        </Pressable>
        <Pressable onPress={() => router.push("/sleep-report")} accessibilityLabel="تقرير النوم" hitSlop={10}>
          <Ionicons name="stats-chart-outline" size={24} color="#fff" />
        </Pressable>
        <Pressable onPress={exportPdf} accessibilityLabel="تصدير PDF" hitSlop={10}>
          <Ionicons name="document-text-outline" size={24} color="#fff" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 40 }}>
        {/* درجة آخر ليلة */}
        <View style={{ backgroundColor: CARD, borderRadius: 26, padding: 18, alignItems: "center", gap: 4 }}>
          {last && lastScore != null ? (
            <>
              <Text style={{ color: "#fff", opacity: 0.6, fontSize: 12 }}>آخر ليلة مسجّلة · {last.date}</Text>
              <Text w="bold" style={{ fontSize: 64, lineHeight: 76, color: scoreColor(lastScore) }}>
                {lastScore}
              </Text>
              <Text w="semi" style={{ color: "#fff", fontSize: 15 }}>
                {hh(sleepHours(last.bed, last.wake))} · {fmtTime(last.bed)} ← {fmtTime(last.wake)}
              </Text>
            </>
          ) : (
            <Text style={{ color: "#fff", opacity: 0.7, textAlign: "center" }}>لا سجلات بعد. سجّل نومك الليلة الماضية بالأسفل.</Text>
          )}
        </View>

        {/* تسجيل */}
        <View style={{ backgroundColor: CARD, borderRadius: 26, padding: 16, gap: 6 }}>
          <Text w="bold" style={{ color: "#fff", fontSize: 15 }}>
            سجّل نوم الليلة الماضية
          </Text>
          <View style={{ backgroundColor: "#fff", borderRadius: 18, padding: 12, marginTop: 6 }}>
            <TimeField label="وقت النوم" value={bed} onChange={setBed} />
            <TimeField label="وقت الاستيقاظ" value={wake} onChange={setWake} />
            <Text w="semi" className="text-sm mb-2">
              كيف كان نومك؟
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setQuality(n)} style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 14, backgroundColor: quality === n ? NAVY : "#EEF2F7" }}>
                  <Ionicons name={n <= quality ? "star" : "star-outline"} size={18} color={quality === n ? "#FBBF24" : "#64748B"} />
                </Pressable>
              ))}
            </View>
          </View>
          <Pressable onPress={save} style={{ backgroundColor: "#6366F1", borderRadius: 18, paddingVertical: 13, alignItems: "center", marginTop: 8 }}>
            <Text w="bold" style={{ color: "#fff" }}>
              حفظ السجل
            </Text>
          </Pressable>
        </View>

        {/* الأسبوع */}
        <View style={{ backgroundColor: CARD, borderRadius: 26, padding: 16, gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text w="bold" style={{ color: "#fff", fontSize: 15 }}>
              آخر 7 أيام
            </Text>
            <Text style={{ color: "#fff", opacity: 0.7, fontSize: 12 }}>
              {logged.length ? `المتوسط ${hh(avgH)} · درجة ${avgS}` : "—"}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-end", height: 110, gap: 8, direction: "ltr" }}>
            {week.map((d) => (
              <View key={d.date} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                <View style={{ width: "100%", height: Math.max(4, (Math.min(d.hours, 10) / 10) * 90), borderRadius: 8, backgroundColor: d.hours ? scoreColor(d.score) : "rgba(255,255,255,0.12)" }} />
                <Text style={{ color: "#fff", opacity: 0.6, fontSize: 10 }}>{d.date.slice(8)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* وقت النوم المثالي */}
        <View style={{ backgroundColor: CARD, borderRadius: 26, padding: 16, gap: 8 }}>
          <Text w="bold" style={{ color: "#fff", fontSize: 15 }}>
            استيقاظ صحي: متى أنام؟
          </Text>
          <View style={{ backgroundColor: "#fff", borderRadius: 18, padding: 12 }}>
            <TimeField label="أريد الاستيقاظ عند" value={target} onChange={setTarget} />
          </View>
          <Text style={{ color: "#fff", opacity: 0.6, fontSize: 11 }}>تنام خلال 15 دقيقة تقريبًا، وتكتمل دورات نوم كل منها 90 دقيقة:</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {suggestions.map((s) => (
              <View key={s.cycles} style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 16, padding: 10, alignItems: "center" }}>
                <Text w="bold" style={{ color: "#fff", fontSize: 18 }}>
                  {fmtTime(s.time)}
                </Text>
                <Text style={{ color: "#fff", opacity: 0.6, fontSize: 10.5 }}>
                  {s.cycles} دورات · {hh(s.hours)}
                </Text>
              </View>
            ))}
          </View>
          {tip ? (
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginTop: 4 }}>
              <Ionicons name="thermometer-outline" size={16} color="#93C5FD" />
              <Text style={{ color: "#BFDBFE", fontSize: 12, flex: 1 }}>{tip}</Text>
            </View>
          ) : null}
        </View>

        {/* السجلات */}
        {logs.length > 0 ? (
          <View style={{ backgroundColor: CARD, borderRadius: 26, padding: 12 }}>
            {logs.slice(0, 10).map((l) => (
              <View key={l.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 6, gap: 10 }}>
                <Text w="bold" style={{ color: scoreColor(sleepScore(l)), width: 34 }}>
                  {sleepScore(l)}
                </Text>
                <Text style={{ color: "#fff", fontSize: 12.5, flex: 1 }}>
                  {l.date} · {hh(sleepHours(l.bed, l.wake))}
                </Text>
                <Pressable onPress={() => remove(l.id)} hitSlop={10} accessibilityLabel="حذف">
                  <Ionicons name="trash-outline" size={18} color="#F87171" />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        <Text style={{ color: "#fff", opacity: 0.45, fontSize: 11, textAlign: "center" }}>التسجيل يدوي ويبقى على جهازك فقط. الدرجة تقدير عام وليست تشخيصًا طبيًا.</Text>
      </ScrollView>
    </View>
  );
}
