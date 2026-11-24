import { useMemo, useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PCard, ProcAvatar } from "@/components/planner/kit";
import { Text } from "@/components/ui/Text";
import { PL } from "@/design/planner";
import { lastProcedure } from "@/lib/plannerProc";
import { fmtDateFull, fmtTime, toISO } from "@/lib/dates";
import { lastVisit } from "@/lib/followups";
import { fmtMoney } from "@/lib/format";
import { telLink, whatsappLink } from "@/lib/phone";
import { patientBalance, useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";

type Tab = "info" | "history" | "notes";
const TABS: { key: Tab; label: string }[] = [
  { key: "info", label: "المعلومات" },
  { key: "history", label: "السجل" },
  { key: "notes", label: "ملاحظات" },
];

function Row({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: PL.border }}>
      <Ionicons name={icon} size={22} color={PL.blue} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11.5, color: PL.muted }}>{label}</Text>
        <Text w="semi" style={{ color: PL.navy }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

/** محتوى تفاصيل المريض (يُستعمل في صفحته، وفي اللوحة الجانبية على الشاشات العريضة). الملف الكامل يبقى في صفحته الأصلية */
export function PatientPanel({ id }: { id: string }) {
  const router = useRouter();
  const currency = useSettings((s) => s.currency);
  const patient = useClinic((s) => s.patients.find((p) => p.id === id));
  const appointments = useClinic((s) => s.appointments);
  const sessions = useClinic((s) => s.sessions);
  const payments = useClinic((s) => s.payments);
  const [tab, setTab] = useState<Tab>("info");
  const today = toISO(new Date());

  const next = useMemo(
    () =>
      appointments
        .filter((a) => a.patientId === id && a.status === "scheduled" && a.date >= today)
        .sort((a, b) => (a.date + a.startTime < b.date + b.startTime ? -1 : 1))[0],
    [appointments, id, today],
  );
  const history = useMemo(() => sessions.filter((s) => s.patientId === id).sort((a, b) => (a.date < b.date ? 1 : -1)), [sessions, id]);

  if (!patient) {
    return (
      <PCard style={{ alignItems: "center", paddingVertical: 30 }}>
        <Text w="semi" style={{ color: PL.navy }}>
          لم يُعثر على المريض
        </Text>
      </PCard>
    );
  }

  const age = patient.birthYear ? new Date().getFullYear() - patient.birthYear : undefined;
  const bal = patientBalance(patient.id, sessions, payments).balance;
  const last = lastVisit(patient, sessions, appointments, today);
  const full = () => router.push({ pathname: "/clinic/patient/[id]", params: { id: patient.id } } as never);

  const actions: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; off?: boolean }[] = [
    { icon: "call-outline", label: "اتصال", off: !patient.phone, onPress: () => patient.phone && Linking.openURL(telLink(patient.phone)) },
    { icon: "chatbubble-ellipses-outline", label: "رسالة", off: !patient.phone, onPress: () => patient.phone && Linking.openURL(whatsappLink(patient.phone, `مرحبًا ${patient.name}`)) },
    { icon: "calendar-outline", label: "حجز", onPress: () => router.push({ pathname: "/clinic/appointment-form", params: { patientId: patient.id } } as never) },
    { icon: "create-outline", label: "تعديل", onPress: () => router.push({ pathname: "/clinic/patient-form", params: { id: patient.id } } as never) },
  ];

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <ProcAvatar procedure={lastProcedure(patient.id, appointments, sessions)} name={patient.name} gender={patient.gender} size={84} />
        <View style={{ flex: 1 }}>
          <Text w="bold" style={{ fontSize: 22, color: PL.navy }}>
            {patient.name}
          </Text>
          {patient.fileNumber ? <Text style={{ color: PL.muted }}>#{patient.fileNumber}</Text> : null}
          <View style={{ alignSelf: "flex-start", marginTop: 4, backgroundColor: patient.status === "active" ? PL.goodSoft : "#E5E7EB", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 3 }}>
            <Text w="semi" style={{ fontSize: 12, color: patient.status === "active" ? PL.good : "#6B7280" }}>
              {patient.status === "active" ? "✓ نشط" : "أنهى العلاج"}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        {actions.map((a) => (
          <Pressable
            key={a.label}
            onPress={a.onPress}
            disabled={a.off}
            style={{ flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 16, backgroundColor: PL.card, borderWidth: 1, borderColor: PL.border, opacity: a.off ? 0.4 : 1 }}
          >
            <Ionicons name={a.icon} size={22} color={PL.blue} />
            <Text w="semi" style={{ fontSize: 12, color: PL.navy }}>
              {a.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: "row", marginTop: 16, borderBottomWidth: 1, borderBottomColor: PL.border }}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderBottomWidth: 3, borderBottomColor: tab === t.key ? PL.blue : "transparent" }}>
            <Text w={tab === t.key ? "bold" : "regular"} style={{ color: tab === t.key ? PL.navy : PL.muted }}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ marginTop: 6 }}>
        {tab === "info" ? (
          <>
            {patient.phone ? <Row icon="call-outline" label="الهاتف" value={patient.phone} /> : null}
            {age !== undefined ? <Row icon="gift-outline" label="العمر" value={`${age} سنة (${patient.birthYear})`} /> : null}
            <Row icon="time-outline" label="آخر زيارة" value={fmtDateFull(last)} />
            <Row icon="cash-outline" label={bal > 0 ? "المتبقي عليه" : "الحساب"} value={bal > 0 ? fmtMoney(bal, currency) : "لا ذمم"} />
            {patient.medicalAlerts ? <Row icon="warning-outline" label="تنبيهات طبية" value={patient.medicalAlerts} /> : null}
          </>
        ) : null}
        {tab === "history" ? (
          history.length === 0 ? (
            <Text style={{ color: PL.muted, textAlign: "center", paddingVertical: 24 }}>لا جلسات مسجّلة</Text>
          ) : (
            history.map((s) => (
              <Row key={s.id} icon="medkit-outline" label={fmtDateFull(s.date)} value={`${s.procedure}${s.tooth ? ` • سن ${s.tooth}` : ""} — ${fmtMoney(s.cost, currency)}`} />
            ))
          )
        ) : null}
        {tab === "notes" ? (
          <Text style={{ color: PL.navy, paddingVertical: 14, lineHeight: 24 }}>{patient.notes?.trim() || "لا ملاحظات"}</Text>
        ) : null}
      </View>

      <PCard onPress={next ? full : () => router.push({ pathname: "/clinic/appointment-form", params: { patientId: patient.id } } as never)} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16, backgroundColor: PL.cardStrong }}>
        <Ionicons name="calendar" size={30} color={PL.blue} />
        <View style={{ flex: 1 }}>
          <Text w="bold" style={{ color: PL.navy }}>
            الموعد القادم
          </Text>
          <Text style={{ color: PL.navySoft, fontSize: 13 }}>{next ? `${fmtDateFull(next.date)} • ${fmtTime(next.startTime)}` : "لا موعد — اضغط للحجز"}</Text>
          {next ? <Text style={{ color: PL.muted, fontSize: 12 }}>{next.procedure}</Text> : null}
        </View>
        <Ionicons name="chevron-back" size={20} color={PL.muted} />
      </PCard>

      <Pressable onPress={full} style={{ marginTop: 12, backgroundColor: PL.navy, borderRadius: 999, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}>
        <Ionicons name="albums-outline" size={20} color="#fff" />
        <Text w="bold" style={{ color: "#fff" }}>
          الملف الكامل (مخطط الأسنان والخطط)
        </Text>
      </Pressable>
    </View>
  );
}
