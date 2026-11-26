import { Linking, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { todayISO } from "@/lib/dates";
import { initial } from "@/lib/format";
import type { NeedRow } from "@/lib/needs";
import { whatsappLink } from "@/lib/phone";
import { useExtras } from "@/store/useExtras";
import { useSettings } from "@/store/useSettings";

const KIND: Record<NeedRow["kind"], { label: string; hex: string }> = {
  plan: { label: "خطة علاج", hex: "#0F766E" },
  ortho: { label: "تقويم", hex: "#7C3AED" },
  lab: { label: "مخبر", hex: "#D97706" },
  manual: { label: "انتظار", hex: "#2563EB" },
};

/** يفتح نموذج الموعد مملوءًا من صف الاحتياج (بنود الخطة والأسنان والإجراء) */
export function bookParams(r: NeedRow): Record<string, string> {
  const params: Record<string, string> = { patientId: r.patient.id, procedure: r.procedure.split("،")[0] };
  const d = r.due && r.due >= todayISO() ? r.due : todayISO();
  params.date = d;
  if (r.planItemIds.length) params.planItemIds = r.planItemIds.join(",");
  if (r.teeth.length) params.teeth = r.teeth.join(",");
  if (r.waitId) params.waitId = r.waitId;
  return params;
}

/** قائمة صفوف «يحتاجون موعدًا»: احجز / واتساب / (إسقاط للمُدخل يدويًا) */
export function NeedsList({ rows, compact }: { rows: NeedRow[]; compact?: boolean }) {
  const router = useRouter();
  const clinicName = useSettings((s) => s.clinicName);
  const setWaitStatus = useExtras((s) => s.setWaitStatus);
  const green = TYPE_META.private.hex;

  const whatsapp = (r: NeedRow) => {
    if (!r.patient.phone) return;
    if (r.waitId) setWaitStatus(r.waitId, "notified");
    const what = `${r.procedure}${r.teeth.length ? ` (سن ${r.teeth.join("،")})` : ""}`;
    Linking.openURL(
      whatsappLink(r.patient.phone, `السلام عليكم ${r.patient.name}، نودّ ترتيب موعدك القادم: ${what}. متى يناسبك؟${clinicName ? ` — ${clinicName}` : ""}`),
    );
  };

  return (
    <View>
      {rows.map((r) => {
        const k = KIND[r.kind];
        return (
          <Card key={r.key} accent="private" className="mb-3">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-full bg-private-soft items-center justify-center">
                <Text w="bold" className="text-private-ink">
                  {initial(r.patient.name)}
                </Text>
              </View>
              <Pressable className="flex-1" onPress={() => router.push({ pathname: "/clinic/patient/[id]", params: { id: r.patient.id } })}>
                <Text w="bold">{r.patient.name}</Text>
                <Text className="text-xs text-muted" numberOfLines={compact ? 1 : 2}>
                  {r.procedure}
                  {r.teeth.length ? ` • سن ${r.teeth.join("،")}` : ""}
                </Text>
              </Pressable>
              <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: k.hex + "22" }}>
                <Text w="semi" className="text-xs" style={{ color: k.hex }}>
                  {k.label}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-1.5 mt-2">
              <Ionicons name={r.overdue ? "alert-circle" : "time-outline"} size={15} color={r.overdue ? "#DC2626" : "#64748B"} />
              <Text className="text-xs" style={{ color: r.overdue ? "#DC2626" : "#64748B" }}>
                {r.reason}
              </Text>
            </View>
            {compact ? null : (
              <View className="flex-row flex-wrap gap-2 mt-3">
                <Chip label="احجز" icon="calendar" color={green} selected onPress={() => router.push({ pathname: "/clinic/appointment-form", params: bookParams(r) })} />
                {r.patient.phone ? <Chip label="واتساب" icon="logo-whatsapp" color="#16A34A" onPress={() => whatsapp(r)} /> : null}
                {r.waitId ? <Chip label="إسقاط" icon="close" onPress={() => setWaitStatus(r.waitId!, "dropped")} /> : null}
              </View>
            )}
          </Card>
        );
      })}
    </View>
  );
}
