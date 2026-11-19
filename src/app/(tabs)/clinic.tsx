import { Logo } from "@/components/Logo";
import { FreeSlotBanner } from "@/components/clinic/FreeSlotBanner";
import { MedicalAlertBar } from "@/components/clinic/MedicalAlertBar";
import { WeekStrip } from "@/components/home/WeekStrip";
import { useTheme } from "@/hooks/useTheme";
import { TYPE_META } from "@/constants/shiftTypes";
import { useMemo, useState } from "react";
import { Linking, Pressable, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip, Segmented } from "@/components/ui/Chip";
import { EmptyState, SectionHeader } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { PressableScale } from "@/components/ui/PressableScale";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { STATUS_META } from "@/constants/clinic";
import { addDays, fmtDateFull, fmtDateShort, fmtTime, minutesToTime, relativeDay, toISO, toMinutes } from "@/lib/dates";
import { fmtMoney, initial } from "@/lib/format";
import { inputAlign } from "@/lib/rtl";
import { whatsappLink } from "@/lib/phone";
import { patientBalance, useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";
import type { Appointment, AppointmentStatus, Patient, ShiftType } from "@/types";

type Tab = "day" | "patients" | "money";
type PFilter = "active" | "finished" | "all";


export default function ClinicScreen() {
  useTheme();
  const clinicName = useSettings((x) => x.clinicName);
  const clinicLogo = useSettings((x) => x.clinicLogo);
  const router = useRouter();
  const currency = useSettings((s) => s.currency);

  const patients = useClinic((s) => s.patients);
  const appointments = useClinic((s) => s.appointments);
  const sessions = useClinic((s) => s.sessions);
  const payments = useClinic((s) => s.payments);
  const setStatus = useClinic((s) => s.setAppointmentStatus);

  const [tab, setTab] = useState<Tab>("day");
  const [date, setDate] = useState(toISO(new Date()));
  const [query, setQuery] = useState("");
  const [pFilter, setPFilter] = useState<PFilter>("active");
  const [fabOpen, setFabOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  const today = toISO(new Date());
  const byId = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);

  const dayAppts = useMemo(
    () =>
      appointments
        .filter((a) => a.date === date)
        .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)),
    [appointments, date],
  );

  const todayCount = appointments.filter(
    (a) => a.date === today && a.status !== "cancelled" && a.status !== "postponed",
  ).length;
  const activeCount = patients.filter((p) => p.status === "active").length;

  // الموعد القادم (من الآن فصاعدًا) لبطاقة الرأس
  const nextAppt = useMemo(() => {
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    return (
      appointments
        .filter(
          (a) =>
            (a.status === "scheduled" || a.status === "arrived") &&
            (a.date > today || (a.date === today && toMinutes(a.startTime) + a.durationMin > nowMin)),
        )
        .sort((a, b) => (a.date === b.date ? toMinutes(a.startTime) - toMinutes(b.startTime) : a.date < b.date ? -1 : 1))[0] ?? null
    );
  }, [appointments, today]);

  // نقاط الأيام في شريط الأسبوع
  const apptDays = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of appointments) if (a.status !== "cancelled" && a.status !== "postponed") m.set(a.date, (m.get(a.date) ?? 0) + 1);
    return m;
  }, [appointments]);

  const balances = useMemo(
    () =>
      patients.map((p) => ({ patient: p, ...patientBalance(p.id, sessions, payments) })),
    [patients, sessions, payments],
  );
  const totalDebt = balances.reduce((a, b) => a + Math.max(0, b.balance), 0);

  // مراجعة دورية: مرضى قيد المعالجة بلا موعد قادم
  const needRecall = useMemo(() => {
    const withFuture = new Set(
      appointments
        .filter((a) => a.date >= today && (a.status === "scheduled" || a.status === "arrived"))
        .map((a) => a.patientId),
    );
    return patients.filter((p) => p.status === "active" && !withFuture.has(p.id)).slice(0, 5);
  }, [appointments, patients, today]);

  const filteredPatients = useMemo(() => {
    const q = query.trim();
    return patients.filter((p) => {
      if (pFilter !== "all" && p.status !== pFilter) return false;
      if (!q) return true;
      return p.name.includes(q) || (p.phone ?? "").includes(q);
    });
  }, [patients, query, pFilter]);

  const monthPrefix = today.slice(0, 7);
  const monthCollected = payments.filter((p) => p.date.startsWith(monthPrefix)).reduce((a, p) => a + p.amount, 0);
  const monthCharged = sessions.filter((s) => s.date.startsWith(monthPrefix)).reduce((a, s) => a + s.cost, 0);
  const debtors = balances.filter((b) => b.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 8);
  const recentPayments = payments.slice(0, 8);

  const remind = (a: Appointment, p?: Patient) => {
    if (!p?.phone) return;
    const text = `السلام عليكم ${p.name}، تذكير بموعدك في العيادة ${fmtDateFull(a.date)} الساعة ${fmtTime(
      a.startTime,
    )} (${a.procedure}). نرجو التأكيد. شكرًا.`;
    Linking.openURL(whatsappLink(p.phone, text));
  };

  const postpone = (a: Appointment) => {
    setStatus(a.id, "postponed");
    router.push({
      pathname: "/clinic/appointment-form",
      params: { patientId: a.patientId, procedure: a.procedure, date: addDays(a.date, 1) },
    });
  };

  const actions: { status: AppointmentStatus; label: string }[] = [
    { status: "arrived", label: "وصل" },
    { status: "done", label: "تم" },
    { status: "no_show", label: "لم يحضر" },
  ];

  return (
    <Screen
      title={clinicName || "العيادة الخاصة"}
      subtitle="مرضى • مواعيد • حسابات"
      logo={<Logo uri={clinicLogo} size={46} clinic />}
      right={
        <Pressable
          onPress={() => router.push("/clinic/followups" as never)}
          className="w-10 h-10 rounded-full bg-surface border border-line items-center justify-center"
          accessibilityLabel="المتابعات"
        >
          <Ionicons name="notifications-outline" size={20} color="#0F172A" />
          {needRecall.length + todayCount > 0 ? (
            <View style={{ position: "absolute", top: 7, end: 8, width: 9, height: 9, borderRadius: 5, backgroundColor: "#F97316", borderWidth: 1.5, borderColor: "#FFFFFF" }} />
          ) : null}
        </Pressable>
      }
      overlay={
        <>
          <Fab onPress={() => setFabOpen(true)} color={TYPE_META.private.hex} />
          {/* المقبض المنحني على الحافة: يفتح درج أدوات العيادة (من تصميم Dental) */}
          <Pressable
            onPress={() => setToolsOpen(true)}
            accessibilityLabel="أدوات العيادة"
            style={{
              position: "absolute",
              end: 0,
              top: "38%",
              width: 30,
              height: 92,
              borderTopStartRadius: 46,
              borderBottomStartRadius: 46,
              backgroundColor: TYPE_META.private.hex,
              alignItems: "center",
              justifyContent: "center",
              elevation: 6,
            }}
          >
            <Ionicons name="menu" size={20} color={TYPE_META.private.onSolid} />
          </Pressable>
        </>
      }
    >
      {/* بطاقة الموعد القادم */}
      {nextAppt ? (
        <PressableScale
          onPress={() => router.push({ pathname: "/clinic/patient/[id]", params: { id: nextAppt.patientId } })}
          className="rounded-[28px] p-5 mb-4"
          style={{ backgroundColor: TYPE_META.private.hex, overflow: "hidden" }}
        >
          <View style={{ position: "absolute", end: -30, top: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: "#FFFFFF", opacity: 0.08 }} />
          <Text className="text-xs" style={{ color: TYPE_META.private.onSolid, opacity: 0.8 }}>
            الموعد القادم • {relativeDay(nextAppt.date)}
          </Text>
          <Text w="bold" style={{ fontSize: 24, lineHeight: 34, color: TYPE_META.private.onSolid }} numberOfLines={1}>
            {byId.get(nextAppt.patientId)?.name ?? "مريض"}
          </Text>
          <View className="flex-row items-end justify-between mt-3">
            <View className="flex-1">
              <Text w="semi" style={{ color: TYPE_META.private.onSolid, opacity: 0.9 }} numberOfLines={1}>
                {nextAppt.procedure}
              </Text>
              <Text w="bold" style={{ fontSize: 20, color: TYPE_META.private.onSolid, fontVariant: ["tabular-nums"] }}>
                {fmtTime(nextAppt.startTime)}
              </Text>
            </View>
            <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: "#FFFFFF" }}>
              <Ionicons name="arrow-back" size={22} color={TYPE_META.private.hex} />
            </View>
          </View>
        </PressableScale>
      ) : null}

      {/* ملخص */}
      <View className="flex-row gap-2.5 mb-4">
        {[
          { label: "مواعيد اليوم", value: String(todayCount), hex: TYPE_META.private.inkHex, soft: TYPE_META.private.soft },
          { label: "قيد المعالجة", value: String(activeCount), hex: "#2563EB", soft: "#DBEAFE" },
          { label: "ذمم المرضى", value: fmtMoney(totalDebt, currency), hex: "#DC2626", soft: "#FEE2E2", small: true },
        ].map((c) => (
          <View key={c.label} className="flex-1 rounded-2xl p-3" style={{ backgroundColor: c.soft }}>
            <Text className="text-xs" style={{ color: c.hex }}>
              {c.label}
            </Text>
            <Text w="bold" className={c.small ? "text-base" : "text-2xl"} style={{ color: c.hex }} numberOfLines={1} adjustsFontSizeToFit>
              {c.value}
            </Text>
          </View>
        ))}
      </View>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "day", label: "اليوم" },
          { value: "patients", label: "المرضى" },
          { value: "money", label: "المالية" },
        ]}
      />

      {/* ---------------- اليوم ---------------- */}
      {tab === "day" && (
        <View className="mt-4">
          <WeekStrip
            selected={date}
            onSelect={setDate}
            onOpenCalendar={() => setDate(today)}
            dotsFor={(iso) => (apptDays.has(iso) ? (["private"] as ShiftType[]) : [])}
          />

          {dayAppts.length === 0 ? (
            <Card>
              <EmptyState icon="calendar-clear-outline" title="لا مواعيد في هذا اليوم" hint="اضغط + لحجز موعد" />
            </Card>
          ) : (
            dayAppts.map((a) => {
              const p = byId.get(a.patientId);
              const st = STATUS_META[a.status];
              const end = minutesToTime(toMinutes(a.startTime) + a.durationMin);
              return (
                <Card key={a.id} accent="private" className="mb-3">
                  <Pressable onPress={() => p && router.push({ pathname: "/clinic/patient/[id]", params: { id: p.id } })}>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text w="bold" className="text-base">
                          {p?.name ?? "مريض محذوف"}
                        </Text>
                        <Text className="text-sm text-muted">
                          {fmtTime(a.startTime)} – {fmtTime(end)} • {a.procedure}
                        </Text>
                        {p ? <MedicalAlertBar patient={p} compact /> : null}
                      </View>
                      <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: st.soft }}>
                        <Text w="semi" className="text-xs" style={{ color: st.hex }}>
                          {st.label}
                        </Text>
                      </View>
                    </View>
                  </Pressable>

                  <View className="flex-row flex-wrap gap-2 mt-3">
                    {actions.map((x) => (
                      <Chip
                        key={x.status}
                        label={x.label}
                        selected={a.status === x.status}
                        color={STATUS_META[x.status].hex}
                        onPress={() => setStatus(a.id, a.status === x.status ? "scheduled" : x.status)}
                      />
                    ))}
                    <Chip label="تأجيل" icon="time-outline" onPress={() => postpone(a)} />
                    {p?.phone ? (
                      <Chip label="واتساب" icon="logo-whatsapp" color="#16A34A" onPress={() => remind(a, p)} />
                    ) : null}
                  </View>
                  <FreeSlotBanner appt={a} />
                </Card>
              );
            })
          )}

          {needRecall.length > 0 && (
            <>
              <SectionHeader title="يحتاجون موعدًا" />
              {needRecall.map((p) => (
                <PressableScale
                  key={p.id}
                  className="flex-row items-center gap-3 bg-surface border border-line rounded-2xl px-3 py-2.5 mb-2"
                  onPress={() =>
                    router.push({ pathname: "/clinic/appointment-form", params: { patientId: p.id, date } })
                  }
                >
                  <View className="w-9 h-9 rounded-full bg-amber-100 items-center justify-center">
                    <Text w="bold" className="text-amber-800">
                      {initial(p.name)}
                    </Text>
                  </View>
                  <Text w="semi" className="flex-1">
                    {p.name}
                  </Text>
                  <Text className="text-private-ink text-sm" w="semi">
                    احجز
                  </Text>
                </PressableScale>
              ))}
            </>
          )}
        </View>
      )}

      {/* ---------------- المرضى ---------------- */}
      {tab === "patients" && (
        <View className="mt-4">
          <View className="flex-row items-center gap-2 bg-surface border border-line rounded-2xl px-3 mb-3">
            <Ionicons name="search" size={20} color="#94A3B8" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="ابحث بالاسم أو الهاتف"
              placeholderTextColor="#94A3B8"
              style={{
                flex: 1,
                fontFamily: "Cairo_400Regular",
                fontSize: 15,
                paddingVertical: 11,
                textAlign: inputAlign(),
                color: "#0F172A",
              }}
            />
          </View>
          <View className="flex-row gap-2 mb-3">
            <Chip label="قيد المعالجة" selected={pFilter === "active"} color={TYPE_META.private.hex} onPress={() => setPFilter("active")} />
            <Chip label="أنهى العلاج" selected={pFilter === "finished"} color={TYPE_META.private.hex} onPress={() => setPFilter("finished")} />
            <Chip label="الكل" selected={pFilter === "all"} color={TYPE_META.private.hex} onPress={() => setPFilter("all")} />
          </View>

          {filteredPatients.length === 0 ? (
            <EmptyState icon="people-outline" title="لا يوجد مرضى" hint="اضغط + لإضافة مريض جديد" />
          ) : (
            filteredPatients.map((p) => {
              const bal = balances.find((b) => b.patient.id === p.id)?.balance ?? 0;
              return (
                <PressableScale
                  key={p.id}
                  className="flex-row items-center gap-3 bg-surface border border-line rounded-2xl px-3 py-3 mb-2"
                  onPress={() => router.push({ pathname: "/clinic/patient/[id]", params: { id: p.id } })}
                >
                  <View className="w-11 h-11 rounded-full bg-private-soft items-center justify-center">
                    <Text w="bold" className="text-private-ink text-lg">
                      {initial(p.name)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1.5">
                      <Text w="bold" numberOfLines={1} className="flex-shrink">
                        {p.name}
                      </Text>
                      {p.medicalAlerts ? <Ionicons name="warning" size={15} color="#DC2626" /> : null}
                    </View>
                    <Text className="text-xs text-muted">{p.phone || "بدون هاتف"}</Text>
                  </View>
                  {bal > 0 ? (
                    <View className="rounded-full bg-red-50 px-2.5 py-1">
                      <Text w="semi" className="text-xs text-danger">
                        {fmtMoney(bal, currency)}
                      </Text>
                    </View>
                  ) : null}
                </PressableScale>
              );
            })
          )}
        </View>
      )}

      {/* ---------------- المالية ---------------- */}
      {tab === "money" && (
        <View className="mt-4">
          <View className="flex-row gap-2.5">
            <View className="flex-1 rounded-2xl bg-private-soft p-3">
              <Text className="text-xs text-private-ink">المقبوض هذا الشهر</Text>
              <Text w="bold" className="text-private-ink text-lg">
                {fmtMoney(monthCollected, currency)}
              </Text>
            </View>
            <View className="flex-1 rounded-2xl bg-hospital-soft p-3">
              <Text className="text-xs text-hospital-ink">قيمة العلاج هذا الشهر</Text>
              <Text w="bold" className="text-hospital-ink text-lg">
                {fmtMoney(monthCharged, currency)}
              </Text>
            </View>
          </View>

          <SectionHeader title="أعلى الذمم" />
          {debtors.length === 0 ? (
            <Card>
              <EmptyState icon="happy-outline" title="لا ذمم مستحقة" />
            </Card>
          ) : (
            debtors.map((d) => (
              <PressableScale
                key={d.patient.id}
                className="flex-row items-center justify-between bg-surface border border-line rounded-2xl px-4 py-3 mb-2"
                onPress={() => router.push({ pathname: "/clinic/patient/[id]", params: { id: d.patient.id } })}
              >
                <Text w="semi">{d.patient.name}</Text>
                <Text w="bold" className="text-danger">
                  {fmtMoney(d.balance, currency)}
                </Text>
              </PressableScale>
            ))
          )}

          <SectionHeader title="آخر الدفعات" />
          {recentPayments.length === 0 ? (
            <Card>
              <EmptyState icon="cash-outline" title="لا دفعات بعد" />
            </Card>
          ) : (
            recentPayments.map((p) => (
              <View
                key={p.id}
                className="flex-row items-center justify-between bg-surface border border-line rounded-2xl px-4 py-3 mb-2"
              >
                <View>
                  <Text w="semi">{byId.get(p.patientId)?.name ?? "مريض محذوف"}</Text>
                  <Text className="text-xs text-muted">{fmtDateShort(p.date)}</Text>
                </View>
                <Text w="bold" className="text-private-ink">
                  +{fmtMoney(p.amount, currency)}
                </Text>
              </View>
            ))
          )}
        </View>
      )}

      <Sheet visible={fabOpen} onClose={() => setFabOpen(false)} title="إضافة">
        <View className="gap-3">
          <Button
            label="موعد جديد"
            icon="calendar"
            type="private"
            onPress={() => {
              setFabOpen(false);
              router.push({ pathname: "/clinic/appointment-form", params: { date } });
            }}
          />
          <Button
            label="مريض جديد"
            icon="person-add"
            variant="soft"
            type="private"
            onPress={() => {
              setFabOpen(false);
              router.push("/clinic/patient-form");
            }}
          />
        </View>
      </Sheet>

      <Sheet visible={toolsOpen} onClose={() => setToolsOpen(false)} title="أدوات العيادة">
        <View className="flex-row flex-wrap" style={{ gap: 10 }}>
          {[
            { t: "المتابعة والاستدعاء", i: "logo-whatsapp", h: "/clinic/followups" },
            { t: "دليل الأدوية", i: "medkit", h: "/clinic/drugs" },
            { t: "المصاريف", i: "wallet", h: "/clinic/expenses" },
            { t: "التقارير", i: "stats-chart", h: "/clinic/reports" },
            { t: "المخزون", i: "cube", h: "/clinic/inventory" },
            { t: "قائمة الأسعار", i: "pricetags", h: "/clinic/prices" },
            { t: "قائمة الانتظار", i: "hourglass", h: "/clinic/waitlist" },
            { t: "سجل التعقيم", i: "flask", h: "/clinic/sterilization" },
            { t: "تعديل الإجراءات", i: "construct", h: "/clinic/procedures" },
            { t: "استيراد JSON", i: "download", h: "/clinic/import" },
          ].map((x) => (
            <PressableScale
              key={x.h}
              containerClassName="w-[31%]"
              className="rounded-2xl py-4 items-center gap-2"
              style={{ backgroundColor: TYPE_META.private.soft }}
              onPress={() => {
                setToolsOpen(false);
                router.push(x.h as never);
              }}
            >
              <Ionicons name={x.i as never} size={26} color={TYPE_META.private.hex} />
              <Text w="semi" className="text-xs text-center" style={{ color: TYPE_META.private.inkHex }}>
                {x.t}
              </Text>
            </PressableScale>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}
