import { useMemo } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ProcedureGlyph } from "@/components/clinic/ProcedureIcon";
import { PressableScale } from "@/components/ui/PressableScale";
import { SectionHeader } from "@/components/ui/EmptyState";
import { Text } from "@/components/ui/Text";
import { useProcedures } from "@/hooks/useProcedures";
import { fmtMoney } from "@/lib/format";
import { useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";

/** الخدمات السريعة: ضغطة واحدة تفتح نموذج حجز بإجراء محدّد مسبقًا */
export function QuickServices({ date }: { date: string }) {
  const router = useRouter();
  const procedures = useProcedures();
  if (!procedures.length) return null;
  return (
    <>
      <SectionHeader title="خدمات سريعة" />
      <View className="flex-row flex-wrap gap-2">
        {procedures.slice(0, 8).map((p) => (
          <PressableScale
            key={p.id}
            onPress={() => router.push({ pathname: "/clinic/appointment-form", params: { procedure: p.name, date } })}
            className="bg-surface border border-line rounded-2xl items-center py-2"
            style={{ width: "23.5%" }}
          >
            <ProcedureGlyph icon={p.icon} size={44} />
            <Text className="text-[11px] mt-1 text-center" numberOfLines={1} w="semi">
              {p.name}
            </Text>
          </PressableScale>
        ))}
      </View>
    </>
  );
}

const ago = (t: number) => {
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return "الآن";
  if (m < 60) return `منذ ${m} د`;
  const h = Math.round(m / 60);
  if (h < 24) return `منذ ${h} س`;
  return `منذ ${Math.round(h / 24)} يوم`;
};

/** آخر النشاطات: جلسات ودفعات ومرضى جدد مرتبة بالأحدث */
export function RecentActivity() {
  const patients = useClinic((s) => s.patients);
  const sessions = useClinic((s) => s.sessions);
  const payments = useClinic((s) => s.payments);
  const currency = useSettings((s) => s.currency);

  const items = useMemo(() => {
    const name = new Map(patients.map((p) => [p.id, p.name]));
    const all: { id: string; icon: keyof typeof Ionicons.glyphMap; hex: string; title: string; sub: string; at: number }[] = [
      ...sessions.map((s) => ({
        id: `s${s.id}`,
        icon: "medical-outline" as const,
        hex: "#0E6FA5",
        title: s.procedure + (s.tooth ? ` · سن ${s.tooth}` : ""),
        sub: name.get(s.patientId) ?? "—",
        at: s.createdAt,
      })),
      ...payments.map((p) => ({
        id: `p${p.id}`,
        icon: "card-outline" as const,
        hex: "#16A34A",
        title: `دفعة ${fmtMoney(p.amount, currency)}`,
        sub: name.get(p.patientId) ?? "—",
        at: p.createdAt,
      })),
      ...patients.map((p) => ({
        id: `n${p.id}`,
        icon: "person-add-outline" as const,
        hex: "#7C3AED",
        title: "مريض جديد",
        sub: p.name,
        at: p.createdAt,
      })),
    ];
    return all.sort((a, b) => b.at - a.at).slice(0, 5);
  }, [patients, sessions, payments, currency]);

  if (!items.length) return null;
  return (
    <>
      <SectionHeader title="آخر النشاطات" />
      <View className="bg-surface border border-line rounded-2xl px-3">
        {items.map((it, i) => (
          <View key={it.id} className={`flex-row items-center gap-3 py-2.5 ${i ? "border-t border-line" : ""}`}>
            <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: it.hex + "22" }}>
              <Ionicons name={it.icon} size={18} color={it.hex} />
            </View>
            <View className="flex-1">
              <Text w="semi" numberOfLines={1}>
                {it.title}
              </Text>
              <Text className="text-xs text-muted" numberOfLines={1}>
                {it.sub}
              </Text>
            </View>
            <Text className="text-[11px] text-muted">{ago(it.at)}</Text>
          </View>
        ))}
      </View>
    </>
  );
}
