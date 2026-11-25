import { useShortcutMenu } from "@/store/useShortcutMenu";
import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ClinicToolsSheet, useClinicToolList } from "@/components/clinic/ClinicToolsSheet";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { toISO } from "@/lib/dates";
import { fmtMoney } from "@/lib/format";
import { patientBalance, useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";

const CLINIC_LOGO = require("../../../assets/clinic-logo.png");
const COL = TYPE_META.private;

/** العيادة في الرئيسية: أرقام تفتح أقسام العيادة الثلاثة + صف أدوات قابل للتمرير */
export function ClinicHomeCard() {
  const router = useRouter();
  const currency = useSettings((s) => s.currency);
  const clinicName = useSettings((s) => s.clinicName);
  const patients = useClinic((s) => s.patients);
  const appointments = useClinic((s) => s.appointments);
  const sessions = useClinic((s) => s.sessions);
  const payments = useClinic((s) => s.payments);
  const tools = useClinicToolList();
  const [toolsOpen, setToolsOpen] = useState(false);
  const showMenu = useShortcutMenu((s) => s.show);

  const today = toISO(new Date());
  const todayCount = appointments.filter((a) => a.date === today && a.status !== "cancelled" && a.status !== "postponed").length;
  const activeCount = patients.filter((p) => p.status === "active").length;
  const totalDebt = useMemo(
    () => patients.reduce((acc, p) => acc + Math.max(0, patientBalance(p.id, sessions, payments).balance), 0),
    [patients, sessions, payments],
  );

  const open = (tab: "day" | "patients" | "money") =>
    router.push({ pathname: "/clinic", params: { tab, t: String(Date.now()) } });

  const stats = [
    { label: "مواعيد اليوم", value: String(todayCount), hex: COL.inkHex, soft: COL.soft, tab: "day" as const },
    { label: "قيد المعالجة", value: String(activeCount), hex: "#2563EB", soft: "#DBEAFE", tab: "patients" as const },
    { label: "ذمم المرضى", value: fmtMoney(totalDebt, currency), hex: "#DC2626", soft: "#FEE2E2", tab: "money" as const, small: true },
  ];

  return (
    <Pressable
      delayLongPress={400}
      onLongPress={() =>
        showMenu("العيادة", [
          { label: "موعد جديد", icon: "calendar-outline", onPress: () => router.push("/clinic/appointment-form" as never) },
          { label: "مريض جديد", icon: "person-add-outline", onPress: () => router.push("/clinic/patient-form" as never) },
          { label: "أدوات العيادة", icon: "grid-outline", onPress: () => setToolsOpen(true) },
        ])
      }
      className="bg-surface rounded-[28px] border border-line p-4"
    >
      <Pressable onPress={() => open("day")} className="flex-row items-center gap-3 mb-3" accessibilityLabel="فتح العيادة">
        <Image source={CLINIC_LOGO} style={{ width: 34, height: 34 }} resizeMode="contain" />
        <Text w="bold" className="text-lg flex-1" numberOfLines={1}>
          {clinicName || "العيادة"}
        </Text>
        <Ionicons name="chevron-back" size={20} color="#94A3B8" />
      </Pressable>

      <View className="flex-row gap-2.5">
        {stats.map((c) => (
          <Pressable key={c.label} onPress={() => open(c.tab)} className="flex-1 rounded-2xl p-3" style={{ backgroundColor: c.soft }}>
            <Text className="text-xs" style={{ color: c.hex }} numberOfLines={1}>
              {c.label}
            </Text>
            <Text w="bold" className={c.small ? "text-base" : "text-2xl"} style={{ color: c.hex }} numberOfLines={1} adjustsFontSizeToFit>
              {c.value}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4" contentContainerStyle={{ gap: 10, paddingEnd: 4 }}>
        {tools.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => router.push((t.params ? { pathname: t.path, params: t.params } : t.path) as never)}
            style={{ width: 74, alignItems: "center", gap: 6 }}
          >
            <View className="w-12 h-12 rounded-2xl items-center justify-center" style={{ backgroundColor: COL.hex }}>
              <Ionicons name={t.icon as never} size={22} color={COL.onSolid} />
            </View>
            <Text className="text-[11px] text-center" numberOfLines={2}>
              {t.label}
            </Text>
          </Pressable>
        ))}
        <Pressable onPress={() => setToolsOpen(true)} style={{ width: 74, alignItems: "center", gap: 6 }}>
          <View className="w-12 h-12 rounded-2xl items-center justify-center border border-line" style={{ backgroundColor: COL.soft }}>
            <Ionicons name="grid" size={22} color={COL.inkHex} />
          </View>
          <Text className="text-[11px] text-center" numberOfLines={2}>
            كل الأدوات
          </Text>
        </Pressable>
      </ScrollView>

      <ClinicToolsSheet visible={toolsOpen} onClose={() => setToolsOpen(false)} />
    </Pressable>
  );
}
