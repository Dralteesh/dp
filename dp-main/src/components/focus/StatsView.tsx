import { useMemo } from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { SectionHeader } from "@/components/ui/EmptyState";
import { Text } from "@/components/ui/Text";
import { addDays, toISO } from "@/lib/dates";
import { byTag, fmtMin, heatLevel, lastDays, minutesByDay, streak } from "@/lib/focusStats";
import { useFocus, type FocusRecord } from "@/store/useFocus";

const GREEN = "#15803D";
const HEAT = ["#E7E5DE", "#BFE3C8", "#86CC98", "#4FAE6B", "#15803D"];
const DAY_LETTER = ["ح", "ن", "ث", "ر", "خ", "ج", "س"]; // الأحد أولًا

export function StatsView({ records }: { records: FocusRecord[] }) {
  const goal = useFocus((s) => s.dailyGoal);
  const setGoal = useFocus((s) => s.setDailyGoal);

  const d = useMemo(() => {
    const today = toISO(new Date());
    const by = minutesByDay(records);
    const week = lastDays(by, today, 7);
    const heat = lastDays(by, today, 35);
    return {
      today,
      todayMin: by.get(today) ?? 0,
      week,
      weekTotal: week.reduce((s, x) => s + x.minutes, 0),
      weekMax: Math.max(goal, ...week.map((x) => x.minutes)),
      heat,
      streak: streak(by, today),
      tags: byTag(records, today, 7),
      trees: records.filter((r) => r.status === "grown").length,
    };
  }, [records, goal]);

  const R = 52;
  const C = 2 * Math.PI * R;
  const pct = Math.min(1, d.todayMin / goal);

  return (
    <View className="mt-4">
      <View className="rounded-3xl p-4 flex-row items-center gap-4" style={{ backgroundColor: "#E4F4E8" }}>
        <View style={{ width: 120, height: 120 }}>
          <Svg width={120} height={120} viewBox="0 0 120 120">
            <Circle cx={60} cy={60} r={R} stroke="#C8E6D0" strokeWidth={12} fill="none" />
            <Circle
              cx={60}
              cy={60}
              r={R}
              stroke={GREEN}
              strokeWidth={12}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${C * pct} ${C}`}
              transform="rotate(-90 60 60)"
            />
          </Svg>
          <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <Text w="bold" style={{ fontSize: 22, lineHeight: 30, color: GREEN }}>
              {Math.round(pct * 100)}%
            </Text>
            <Text className="text-[11px]" style={{ color: GREEN }}>
              من هدف اليوم
            </Text>
          </View>
        </View>
        <View className="flex-1">
          <Text w="bold" className="text-lg" style={{ color: GREEN }}>
            {fmtMin(d.todayMin)}
          </Text>
          <Text className="text-xs" style={{ color: GREEN }}>
            الهدف اليومي: {fmtMin(goal)}
          </Text>
          <View className="flex-row items-center gap-3 mt-2">
            <Pressable onPress={() => setGoal(goal - 15)} className="w-9 h-9 rounded-full bg-white items-center justify-center">
              <Ionicons name="remove" size={20} color={GREEN} />
            </Pressable>
            <Pressable onPress={() => setGoal(goal + 15)} className="w-9 h-9 rounded-full bg-white items-center justify-center">
              <Ionicons name="add" size={20} color={GREEN} />
            </Pressable>
          </View>
        </View>
      </View>

      <View className="flex-row gap-2.5 mt-3">
        {[
          { l: "هذا الأسبوع", v: fmtMin(d.weekTotal) },
          { l: "أشجار", v: String(d.trees) },
          { l: "أيام متتالية", v: String(d.streak) },
        ].map((c) => (
          <View key={c.l} className="flex-1 rounded-2xl p-3" style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E0D8" }}>
            <Text className="text-xs text-muted">{c.l}</Text>
            <Text w="bold" className="text-lg" style={{ color: GREEN }}>
              {c.v}
            </Text>
          </View>
        ))}
      </View>

      <SectionHeader title="آخر 7 أيام" />
      <View className="flex-row items-end justify-between rounded-2xl p-3" style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E0D8", height: 150 }}>
        {d.week.map((x) => {
          const h = x.minutes ? Math.max(6, (x.minutes / d.weekMax) * 90) : 3;
          const letter = DAY_LETTER[new Date(x.iso + "T12:00:00").getDay()];
          return (
            <View key={x.iso} className="items-center" style={{ flex: 1 }}>
              <Text className="text-[10px] text-muted">{x.minutes || ""}</Text>
              <View style={{ width: 16, height: h, borderRadius: 6, backgroundColor: x.minutes >= goal ? GREEN : x.minutes ? "#86CC98" : "#E7E5DE", marginVertical: 3 }} />
              <Text className="text-xs" w={x.iso === d.today ? "bold" : "regular"}>
                {letter}
              </Text>
            </View>
          );
        })}
      </View>

      {d.tags.length ? (
        <>
          <SectionHeader title="توزيع وقتك حسب التصنيف" />
          {d.tags.map(([t, m]) => (
            <View key={t} className="mb-2">
              <View className="flex-row justify-between mb-1">
                <Text w="semi" className="text-sm">
                  {t}
                </Text>
                <Text className="text-xs text-muted">{fmtMin(m)}</Text>
              </View>
              <View style={{ height: 10, borderRadius: 5, backgroundColor: "#E5E7EB" }}>
                <View style={{ height: 10, borderRadius: 5, backgroundColor: GREEN, width: `${Math.max(6, (m / d.tags[0][1]) * 100)}%` }} />
              </View>
            </View>
          ))}
        </>
      ) : null}

      <SectionHeader title="آخر 5 أسابيع" />
      <View className="rounded-2xl p-3" style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E0D8" }}>
        {[0, 1, 2, 3, 4].map((row) => (
          <View key={row} className="flex-row justify-between" style={{ marginBottom: row < 4 ? 6 : 0 }}>
            {d.heat.slice(row * 7, row * 7 + 7).map((x) => (
              <View key={x.iso} style={{ width: 34, height: 26, borderRadius: 7, backgroundColor: HEAT[heatLevel(x.minutes, goal)], borderWidth: x.iso === d.today ? 2 : 0, borderColor: "#0F172A" }} />
            ))}
          </View>
        ))}
        <View className="flex-row items-center justify-end gap-1 mt-3">
          <Text className="text-[10px] text-muted">أقل</Text>
          {HEAT.map((c) => (
            <View key={c} style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: c }} />
          ))}
          <Text className="text-[10px] text-muted">أكثر</Text>
        </View>
      </View>
    </View>
  );
}
