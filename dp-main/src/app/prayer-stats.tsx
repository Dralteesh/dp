import { View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { SectionHeader } from "@/components/ui/EmptyState";
import { addDays, todayISO } from "@/lib/dates";
import { FARD, PRAYER_LABELS } from "@/lib/prayer";
import { bestStreak, countDay, currentStreak, perPrayer, rangeStats } from "@/lib/prayerStats";
import { usePrayerLog } from "@/store/usePrayerLog";

const GREEN = "#16A34A";
const pct = (r: number) => `${Math.round(r * 100)}%`;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center">
      <Text w="bold" className="text-2xl" style={{ color: "#0B4F73" }}>{value}</Text>
      <Text className="text-xs text-muted">{label}</Text>
    </View>
  );
}

export default function PrayerStatsScreen() {
  const done = usePrayerLog((s) => s.done);
  const today = todayISO();
  const streak = currentStreak(done, today);
  const best = bestStreak(done);
  const w = rangeStats(done, today, 7);
  const m = rangeStats(done, today, 30);
  const per = perPrayer(done, today, 30);
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, -13 + i));

  return (
    <Screen title="إحصاءات الصلاة" back>
      <Card>
        <View className="flex-row">
          <Stat label="أيام متتالية" value={String(streak)} />
          <Stat label="أفضل سلسلة" value={String(best)} />
          <Stat label="هذا الأسبوع" value={pct(w.ratio)} />
          <Stat label="آخر 30 يومًا" value={pct(m.ratio)} />
        </View>
        <Text className="text-xs text-muted text-center mt-3">
          السلسلة تُحسب بالأيام التي علّمت فيها الصلوات الخمس كلها. {w.prayed} من {w.total} هذا الأسبوع.
        </Text>
      </Card>

      <SectionHeader title="آخر 14 يومًا" />
      <Card>
        <View className="flex-row items-end justify-between" style={{ height: 90 }}>
          {days.map((d) => {
            const c = countDay(done, d);
            return (
              <View key={d} className="items-center" style={{ width: 18 }}>
                <View style={{ width: 12, height: Math.max(4, c * 16), borderRadius: 6, backgroundColor: c === 5 ? GREEN : c > 0 ? "#66ABCF" : "#E2E8F0" }} />
                <Text className="text-[10px] text-muted mt-1">{Number(d.slice(8))}</Text>
              </View>
            );
          })}
        </View>
      </Card>

      <SectionHeader title="حسب الصلاة (آخر 30 يومًا)" />
      <Card>
        {FARD.map((k) => (
          <View key={k} className="flex-row items-center mb-2">
            <Text w="semi" style={{ width: 56 }}>{PRAYER_LABELS[k]}</Text>
            <View className="flex-1 h-2 rounded-full" style={{ backgroundColor: "#E2E8F0" }}>
              <View style={{ width: `${(per[k] / 30) * 100}%`, height: 8, borderRadius: 4, backgroundColor: GREEN }} />
            </View>
            <Text className="text-xs text-muted" style={{ width: 44, textAlign: "left" }}>{per[k]}/30</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
