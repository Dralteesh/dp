import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { STATUS_META } from "@/constants/clinic";
import { ProcedureBadge } from "@/components/clinic/ProcedureIcon";
import { TYPE_META } from "@/constants/shiftTypes";
import { useDebts } from "@/hooks/useDebts";
import { useTheme } from "@/hooks/useTheme";
import { fmtMoneyP, useHideMoney } from "@/lib/privacy";
import { useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";
import type { AgendaItem } from "@/lib/agenda";
import { endDayWord, fmtTime, toMinutes } from "@/lib/dates";
import type { AppointmentStatus } from "@/types";

type Props = {
  item: AgendaItem;
  live: boolean;
  past: boolean;
  /** دقائق متبقية للحدث الجاري */
  remainingMin?: number;
  onPress: () => void;
};

/** بطاقة نشاط في خط اليوم الزمني: خلفية ناعمة بلون المكان + أيقونة كبيرة (من تصميم Timeline) */
export function TimelineCard({ item, live, past, remainingMin, onPress }: Props) {
  useHideMoney();
  useTheme();
  const m = TYPE_META[item.type];
  const status = item.status ? STATUS_META[item.status as AppointmentStatus] : null;
  const done = past || item.status === "done";
  // شارة الذمّة: رصيد المريض المتبقي عليه (لمواعيد العيادة فقط)
  const currency = useSettings((s) => s.currency);
  const debts = useDebts();
  const pid = useClinic((s) => (item.source === "appointment" ? s.appointments.find((a) => a.id === item.refId)?.patientId : undefined));
  const debt = pid ? debts.get(pid) ?? 0 : 0;
  // مدفوع على هذا الموعد (زيارة أو عربون)
  const paidHere = useClinic((s) => (item.source === "appointment" ? s.payments.reduce((a, p) => (p.apptId === item.refId ? a + p.amount : a), 0) : 0));

  return (
    <PressableScale
      onPress={onPress}
      className="rounded-3xl px-4 py-3.5 flex-row items-center"
      style={{
        backgroundColor: m.soft,
        borderWidth: live ? 2 : 0,
        borderColor: m.hex,
        opacity: done && !live ? 0.62 : 1,
        overflow: "hidden",
      }}
    >
      <View style={{ position: "absolute", end: -22, top: -22, width: 110, height: 110, borderRadius: 55, backgroundColor: m.hex, opacity: 0.10 }} />
      <View className="flex-1 pe-3">
        <View className="flex-row items-center gap-1.5">
          <Text w="bold" className="text-base flex-shrink" style={{ color: m.inkHex }} numberOfLines={1}>
            {item.title}
          </Text>
          {done ? <Ionicons name="checkmark-circle" size={16} color="#16A34A" /> : null}
        </View>
        {item.subtitle ? (
          <Text className="text-xs" style={{ color: m.inkHex, opacity: 0.8 }} numberOfLines={1}>
            {item.subtitle}
          </Text>
        ) : null}
        <View className="flex-row items-center gap-1 mt-1">
          <Ionicons name="time-outline" size={13} color={m.inkHex} />
          <Text className="text-xs" style={{ color: m.inkHex, fontVariant: ["tabular-nums"] }}>
            {fmtTime(item.startTime)} - {item.endsNextDay ? `${endDayWord(item.extraDays ?? 1)} ` : ""}
            {fmtTime(item.endTime)}
          </Text>
          {live && remainingMin != null ? (
            <Text w="bold" className="text-xs" style={{ color: m.hex }}>
              {"  "}• متبقّي {remainingMin >= 60 ? `${Math.floor(remainingMin / 60)} س ${remainingMin % 60} د` : `${remainingMin} د`}
            </Text>
          ) : null}
        </View>
        {paidHere > 0 ? (
          <View className="self-start rounded-full px-2 py-0.5 mt-1.5" style={{ backgroundColor: "#DCFCE7" }}>
            <Text w="semi" className="text-[11px]" style={{ color: "#166534" }}>
              دُفع {fmtMoneyP(paidHere, currency)}
            </Text>
          </View>
        ) : null}
        {debt > 0 ? (
          <View className="self-start rounded-full px-2 py-0.5 mt-1.5" style={{ backgroundColor: "#FEE2E2" }}>
            <Text w="semi" className="text-[11px]" style={{ color: "#991B1B" }}>
              عليه {fmtMoneyP(debt, currency)}
            </Text>
          </View>
        ) : null}
        {status && !live ? (
          <View className="self-start rounded-full px-2 py-0.5 mt-1.5" style={{ backgroundColor: status.soft }}>
            <Text w="semi" className="text-[11px]" style={{ color: status.hex }}>
              {status.label}
            </Text>
          </View>
        ) : null}
      </View>
      <View
        style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: m.hex, alignItems: "center", justifyContent: "center" }}
      >
        {item.source === "appointment" ? (
          <ProcedureBadge name={item.procedure} size={40} color={m.onSolid} />
        ) : (
          <Ionicons name={m.icon} size={26} color={m.onSolid} />
        )}
      </View>
    </PressableScale>
  );
}

/** دقائق متبقية على نهاية عنصر جارٍ اليوم */
export function remainingMinutes(item: AgendaItem, nowMin: number): number {
  const e = toMinutes(item.endTime);
  const end = item.endsNextDay ? (item.extraDays ?? 1) * 24 * 60 + e : e;
  return Math.max(0, end - nowMin);
}
