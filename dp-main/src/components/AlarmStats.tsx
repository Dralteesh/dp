import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Text } from "@/components/ui/Text";

const SIZE = 96;
const R = 40;
const C = 2 * Math.PI * R;
const DAY = 24 * 3600 * 1000;

function fmtLeft(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  if (d > 0) return `${d} ي ${h} س`;
  if (h > 0) return `${h} س ${mm} د`;
  return `${mm} د`;
}

type Props = {
  /** موعد أقرب منبّه فعّال، أو null */
  nextAt: Date | null;
  now: Date;
  active: number;
  total: number;
  nextLabel?: string;
  nextTimeText?: string;
};

/** بطاقتان أعلى قائمة المنبّهات: حلقة الوقت المتبقي + عدد الفعّالة والقادم */
export function AlarmStats({ nextAt, now, active, total, nextLabel, nextTimeText }: Props) {
  const diff = nextAt ? nextAt.getTime() - now.getTime() : 0;
  const p = nextAt ? Math.min(1, Math.max(0, 1 - diff / DAY)) : 0;

  return (
    <View className="flex-row gap-3 mb-4">
      <View className="flex-1 bg-surface rounded-3xl border border-line p-3 items-center">
        <Text w="bold" className="text-xs self-start">
          المنبّه القادم
        </Text>
        <View style={{ width: SIZE, height: SIZE, marginTop: 6 }}>
          <Svg width={SIZE} height={SIZE}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#E2E8F0" strokeWidth={7} />
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke="#DC2626"
              strokeWidth={7}
              strokeLinecap="round"
              strokeDasharray={`${C * p} ${C}`}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
          </Svg>
          <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} className="items-center justify-center">
            <Text w="bold" className="text-sm text-center">
              {nextAt ? fmtLeft(diff) : "لا يوجد"}
            </Text>
            <Text className="text-[10px] text-muted text-center">
              {nextAt ? "حتى المنبّه" : "منبّه فعّال"}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-1 bg-surface rounded-3xl border border-line p-3 justify-between">
        <View>
          <Text w="bold" className="text-xs">
            منبّهات فعّالة
          </Text>
          <Text w="bold" style={{ fontSize: 26, lineHeight: 36 }}>
            {active}
          </Text>
          <Text className="text-[11px] text-muted">من {total}</Text>
        </View>
        <View>
          <Text w="bold" className="text-xs">
            القادم
          </Text>
          <Text w="bold" className="text-base" style={{ fontVariant: ["tabular-nums"] }}>
            {nextTimeText ?? "—"}
          </Text>
          <Text className="text-[11px] text-muted" numberOfLines={1}>
            {nextLabel ?? ""}
          </Text>
        </View>
      </View>
    </View>
  );
}
