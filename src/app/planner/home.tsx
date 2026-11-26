import { useMemo } from "react";
import { Image, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Logo } from "@/components/Logo";
import { PCard, ProcAvatar, PlannerShell, SectionTitle, StatusPill } from "@/components/planner/kit";
import { WaitlistBanner } from "@/components/planner/WaitlistBanner";
import { Text } from "@/components/ui/Text";
import { TREATMENT_ICONS } from "@/constants/icons";
import { PL } from "@/design/planner";
import { useLayout } from "@/hooks/useLayout";
import { useNow } from "@/hooks/useNow";
import { fmtTime, toISO } from "@/lib/dates";
import { nextAlarmFire } from "@/lib/alarm";
import { fmtCountdown, fmtTimeDate } from "@/lib/dates";
import { PRAYER_LABELS, nextPrayer } from "@/lib/prayer";
import { useAlarms } from "@/store/useAlarms";
import { useClinic } from "@/store/useClinic";
import { usePlanner } from "@/store/usePlanner";
import { switchUi } from "@/lib/ui";
import { useSettings } from "@/store/useSettings";

const SECTIONS: { label: string; icon: keyof typeof Ionicons.glyphMap; href: string }[] = [
  { label: "العيادة", icon: "medkit-outline", href: "/planner/clinic" },
  { label: "الأدوات", icon: "apps-outline", href: "/planner/tools" },
  { label: "الإعدادات", icon: "settings-outline", href: "/planner/settings" },
];

function Stat({ icon, value, label, color }: { icon: keyof typeof Ionicons.glyphMap; value: number; label: string; color: string }) {
  return (
    <PCard style={{ flex: 1, alignItems: "center", paddingVertical: 12, paddingHorizontal: 6 }}>
      <Ionicons name={icon} size={24} color={color} />
      <Text w="bold" style={{ fontSize: 22, color: PL.navy }}>
        {value}
      </Text>
      <Text style={{ fontSize: 11.5, color: PL.muted }}>{label}</Text>
    </PCard>
  );
}

/** الرئيسية (الواجهة الجديدة) */
export default function PlannerHome() {
  const router = useRouter();
  const { isWide } = useLayout();
  const now = useNow(60000);
  const today = toISO(now);
  const doctorName = useSettings((s) => s.doctorName);
  const appName = useSettings((s) => s.appName);
  const logo = useSettings((s) => s.logo);
  const patients = useClinic((s) => s.patients);
  const appointments = useClinic((s) => s.appointments);
  const tasks = usePlanner((s) => s.tasks);

  const todays = useMemo(
    () =>
      appointments
        .filter((a) => a.date === today && a.status !== "cancelled" && a.status !== "postponed")
        .sort((a, b) => (a.startTime < b.startTime ? -1 : 1)),
    [appointments, today],
  );
  const byId = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);
  const activeCount = patients.filter((p) => p.status === "active").length;
  const prayerMethod = useSettings((s) => s.prayerMethod);
  const madhab = useSettings((s) => s.madhab);
  const prayerAdjust = useSettings((s) => s.prayerAdjust);
  const alarms = useAlarms((s) => s.alarms);
  const minuteKey = Math.floor(now.getTime() / 60000);
  const np = useMemo(
    () => nextPrayer(new Date(), { prayerMethod, madhab, prayerAdjust }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [minuteKey, prayerMethod, madhab, prayerAdjust],
  );
  const nextAlarm = useMemo(() => {
    let best: { label: string; at: Date } | null = null;
    for (const a of alarms) {
      const f = nextAlarmFire([a], now);
      if (f && (!best || f.at.getTime() < best.at.getTime())) best = { label: a.label || "منبّه", at: f.at };
    }
    return best;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alarms, minuteKey]);
  const openTasks = tasks.filter((t) => !t.done).length;

  const hour = now.getHours();
  const greeting = hour < 12 ? "صباح الخير" : hour < 18 ? "مساء الخير" : "مساء النور";

  return (
    <PlannerShell
      title={appName || "Alteesh Planner"}
     
      maxWidth={1000}
      right={
        <Pressable onLongPress={() => switchUi("classic")} delayLongPress={1500} accessibilityLabel="الشعار">
          <Logo uri={logo} size={40} app />
        </Pressable>
      }
    >
      <View style={{ backgroundColor: PL.cardStrong, borderRadius: 26, padding: 18, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: PL.border }}>
        <View style={{ flex: 1 }}>
          <Text w="bold" style={{ fontSize: 21, lineHeight: 32, color: PL.navy }}>
            {greeting}،{"\n"}
            {doctorName ? `د. ${doctorName} 👋` : "دكتور 👋"}
          </Text>
          <Text style={{ color: PL.navySoft, marginTop: 4, fontSize: 13 }}>لنجعل يومنا مثمرًا!</Text>
        </View>
        <Image source={TREATMENT_ICONS.cleaning} style={{ width: 84, height: 84 }} resizeMode="contain" />
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <Stat icon="calendar-outline" value={todays.length} label="مواعيد اليوم" color={PL.blue} />
        <Stat icon="people" value={activeCount} label="قيد المعالجة" color={PL.blue} />
        <Stat icon="checkmark-circle" value={openTasks} label="مهام مفتوحة" color={PL.good} />
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
        <PCard onPress={() => router.push("/prayer" as never)} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Ionicons name="moon" size={24} color={PL.blue} />
          <View style={{ flex: 1 }}>
            <Text w="bold" style={{ color: PL.navy }}>{PRAYER_LABELS[np.key]} {fmtTimeDate(np.time)}</Text>
            <Text style={{ fontSize: 12, color: PL.muted }}>بعد {fmtCountdown(np.time.getTime() - now.getTime())}</Text>
          </View>
        </PCard>
        <PCard onPress={() => router.push("/alarms" as never)} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Ionicons name="alarm" size={24} color={PL.blue} />
          <View style={{ flex: 1 }}>
            <Text w="bold" numberOfLines={1} style={{ color: PL.navy }}>{nextAlarm ? fmtTimeDate(nextAlarm.at) : "لا منبّهات"}</Text>
            <Text numberOfLines={1} style={{ fontSize: 12, color: PL.muted }}>{nextAlarm ? nextAlarm.label : "المنبّه القادم"}</Text>
          </View>
        </PCard>
      </View>

      {/* مداخل الأقسام (لا أشرطة تنقل): العيادة، الأدوات، الإعدادات. الصلاة والمنبّه والجدول لها بطاقاتها أدناه */}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
        {SECTIONS.map((x) => (
          <Pressable
            key={x.href}
            onPress={() => router.push(x.href as never)}
            accessibilityLabel={x.label}
            style={{ flex: 1, borderRadius: 20, backgroundColor: PL.card, borderWidth: 1, borderColor: PL.border, alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14 }}
          >
            <Ionicons name={x.icon} size={28} color={PL.blue} />
            <Text w="semi" numberOfLines={1} style={{ fontSize: 12.5, color: PL.navy }}>
              {x.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <SectionTitle title="جدول اليوم" action="عرض الكل" onAction={() => router.push("/planner/schedule" as never)} />
      <WaitlistBanner day={today} />
      {todays.length === 0 ? (
        <PCard style={{ alignItems: "center", paddingVertical: 24 }}>
          <Image source={TREATMENT_ICONS.exam} style={{ width: 56, height: 56 }} resizeMode="contain" />
          <Text w="semi" style={{ color: PL.navy, marginTop: 4 }}>
            لا مواعيد اليوم
          </Text>
          <Pressable onPress={() => router.push({ pathname: "/clinic/appointment-form", params: { date: today } } as never)} style={{ marginTop: 10 }}>
            <Text w="semi" style={{ color: PL.blue }}>
              + موعد جديد
            </Text>
          </Pressable>
        </PCard>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {todays.map((a) => {
            const p = byId.get(a.patientId);
            return (
              <PCard
                key={a.id}
                onPress={() => p && router.push({ pathname: "/planner/patient/[id]", params: { id: p.id } } as never)}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10, width: isWide ? "48.8%" : "100%" }}
              >
                <View style={{ width: 66 }}>
                  <Text w="bold" style={{ fontSize: 12.5, color: PL.navy }}>
                    {fmtTime(a.startTime)}
                  </Text>
                </View>
                <ProcAvatar procedure={a.procedure} name={p?.name ?? "؟"} gender={p?.gender} size={42} />
                <View style={{ flex: 1 }}>
                  <Text w="bold" numberOfLines={1} style={{ color: PL.navy }}>
                    {p?.name ?? "مريض محذوف"}
                  </Text>
                  <Text numberOfLines={1} style={{ fontSize: 12, color: PL.muted }}>
                    {a.procedure}
                  </Text>
                </View>
                <StatusPill status={a.status} />
              </PCard>
            );
          })}
        </View>
      )}
    </PlannerShell>
  );
}
