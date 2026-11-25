import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Text } from "@/components/ui/Text";
import { DEFAULT_TIMELINE, useSettings } from "@/store/useSettings";
import type { TimelinePrefs } from "@/types";

type Row = { key: Exclude<keyof TimelinePrefs, "days">; label: string; hint: string; min: number; max: number; step: number; unit: string };

const ROWS: Row[] = [
  { key: "densePx", label: "ارتفاع الوقت الذي فيه مواعيد", hint: "لكل 15 دقيقة — كلما زاد اتّسعت المواعيد", min: 8, max: 32, step: 1, unit: "px" },
  { key: "basePx", label: "ارتفاع الوقت الفارغ", hint: "لكل 15 دقيقة — كلما قلّ انضغطت الفراغات", min: 1, max: 12, step: 1, unit: "px" },
  { key: "maxH", label: "أقصى ارتفاع للجدول", hint: "إن تجاوزه اليوم تُصغَّر الشرائح قليلًا", min: 240, max: 800, step: 20, unit: "px" },
  { key: "minCardH", label: "أدنى ارتفاع لبطاقة الموعد", hint: "يمنع تكدّس المواعيد القصيرة", min: 22, max: 56, step: 2, unit: "px" },
  { key: "longHours", label: "حدّ الدوام/المناوبة", hint: "ما طوله هذا العدد من الساعات فأكثر يُعدّ خلفية", min: 2, max: 12, step: 1, unit: "س" },
];

/** لوحة ضبط الجدول الأسبوعي (تُستخدم في الإعدادات وفي نافذة الضغط المطوّل على اسم الشهر) */
export function TimelinePrefsPanel() {
  const tl = useSettings((s) => s.timeline);
  const update = useSettings((s) => s.update);
  const set = (patch: Partial<TimelinePrefs>) => update({ timeline: { ...tl, ...patch } });
  const clamp = (r: Row, v: number) => Math.max(r.min, Math.min(r.max, v));

  return (
    <View>
      <Text w="semi" className="mb-1.5">
        عدد الأيام (اليوم المحدّد في المنتصف)
      </Text>
      <View className="flex-row gap-2 mb-3">
        {[3, 5, 7].map((n) => (
          <Chip key={n} label={`${n} أيام`} selected={tl.days === n} onPress={() => set({ days: n })} />
        ))}
      </View>

      {ROWS.map((r) => (
        <View key={r.key} className="flex-row items-center justify-between py-2" style={{ borderTopWidth: 1, borderTopColor: "#EFEDE5" }}>
          <View className="flex-1 pe-3">
            <Text w="semi" className="text-sm">
              {r.label}
            </Text>
            <Text className="text-xs text-muted">{r.hint}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable onPress={() => set({ [r.key]: clamp(r, tl[r.key] - r.step) } as Partial<TimelinePrefs>)} hitSlop={6} className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center" accessibilityLabel="أنقص">
              <Ionicons name="remove" size={18} color="#0F172A" />
            </Pressable>
            <Text w="bold" className="text-center" style={{ minWidth: 52, fontVariant: ["tabular-nums"] }}>
              {tl[r.key]} {r.unit}
            </Text>
            <Pressable onPress={() => set({ [r.key]: clamp(r, tl[r.key] + r.step) } as Partial<TimelinePrefs>)} hitSlop={6} className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center" accessibilityLabel="زِد">
              <Ionicons name="add" size={18} color="#0F172A" />
            </Pressable>
          </View>
        </View>
      ))}

      <View className="mt-2">
        <Button label="استعادة الافتراضي" icon="refresh" variant="ghost" onPress={() => update({ timeline: { ...DEFAULT_TIMELINE } })} />
      </View>
    </View>
  );
}
