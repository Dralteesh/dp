import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { STATUS_META } from "@/constants/clinic";
import { ProcedureBadge } from "@/components/clinic/ProcedureIcon";
import { TYPE_META } from "@/constants/shiftTypes";
import type { AgendaItem } from "@/lib/agenda";
import { fmtTime } from "@/lib/dates";
import type { AppointmentStatus } from "@/types";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  item: AgendaItem;
  onPress?: () => void;
  /** يظهر خط "الآن" إن كان جاريًا */
  live?: boolean;
};

/** صف في جدول اليوم: وقت + بطاقة ملوّنة بلون النوع */
export function AgendaRow({ item, onPress, live }: Props) {
  useTheme();
  const m = TYPE_META[item.type];
  const status = item.status ? STATUS_META[item.status as AppointmentStatus] : null;
  const dim = item.status === "no_show" || item.status === "done";

  return (
    <View className="flex-row gap-3 mb-2.5">
      <View className="w-16 items-center pt-1">
        <Text w="bold" className="text-sm">
          {fmtTime(item.startTime)}
        </Text>
        <Text className="text-xs text-muted">
          {item.endsNextDay ? "الغد " : ""}
          {fmtTime(item.endTime)}
        </Text>
      </View>

      <PressableScale
        containerClassName="flex-1"
        onPress={onPress}
        className="rounded-2xl p-3 flex-row items-center gap-3"
        style={{
          backgroundColor: m.soft,
          borderWidth: live ? 2 : 0,
          borderColor: m.hex,
          opacity: dim ? 0.6 : 1,
        }}
      >
        <View
          className="w-10 h-10 rounded-xl items-center justify-center"
          style={{ backgroundColor: m.hex }}
        >
          {item.source === "appointment" ? (
            <ProcedureBadge name={item.procedure} size={30} color={m.onSolid} />
          ) : (
            <Ionicons name={m.icon} size={20} color={m.onSolid} />
          )}
        </View>
        <View className="flex-1">
          <Text w="bold" style={{ color: m.inkHex }} numberOfLines={1}>
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text className="text-sm" style={{ color: m.inkHex, opacity: 0.8 }} numberOfLines={1}>
              {item.subtitle}
            </Text>
          ) : null}
        </View>
        {live ? (
          <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: m.hex }}>
            <Text w="bold" className="text-xs" style={{ color: m.onSolid }}>
              الآن
            </Text>
          </View>
        ) : status ? (
          <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: status.soft }}>
            <Text w="semi" className="text-xs" style={{ color: status.hex }}>
              {status.label}
            </Text>
          </View>
        ) : null}
      </PressableScale>
    </View>
  );
}
