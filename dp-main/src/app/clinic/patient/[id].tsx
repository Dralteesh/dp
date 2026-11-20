import { useTheme } from "@/hooks/useTheme";
import { TYPE_META } from "@/constants/shiftTypes";
import { useMemo, useState } from "react";
import { Alert, Linking, Pressable, Share, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DictateField } from "@/components/DictateField";
import { MoneyField, useMoneyInput } from "@/components/MoneyField";
import { MedicalAlertBar } from "@/components/clinic/MedicalAlertBar";
import { PatientDocs } from "@/components/clinic/PatientDocs";
import { QuickSession } from "@/components/clinic/QuickSession";
import { Odontogram } from "@/components/Odontogram";
import { DateField } from "@/components/pickers";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip, Segmented } from "@/components/ui/Chip";
import { EmptyState, SectionHeader } from "@/components/ui/EmptyState";
import { Field, FieldRow } from "@/components/ui/Field";
import { PressableScale } from "@/components/ui/PressableScale";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { STATUS_META, TOOTH_STATUS } from "@/constants/clinic";
import { foreignLabel } from "@/lib/currency";
import { fmtDateShort, fmtTime, toISO } from "@/lib/dates";
import { fmtMoney, initial, parseAmount } from "@/lib/format";
import { telLink, whatsappLink } from "@/lib/phone";
import { patientBalance, useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";
import type { ToothStatus } from "@/types";
import { useProcedures } from "@/hooks/useProcedures";

type Section = "overview" | "teeth" | "sessions" | "rx" | "payments";

export default function PatientScreen() {
  const procedures = useProcedures();
  useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const currency = useSettings((s) => s.currency);

  const patients = useClinic((s) => s.patients);
  const appointments = useClinic((s) => s.appointments);
  const allSessions = useClinic((s) => s.sessions);
  const allPayments = useClinic((s) => s.payments);
  const updatePatient = useClinic((s) => s.updatePatient);
  const removePatient = useClinic((s) => s.removePatient);
  const setTooth = useClinic((s) => s.setTooth);
  const addSession = useClinic((s) => s.addSession);
  const removeSession = useClinic((s) => s.removeSession);
  const addPayment = useClinic((s) => s.addPayment);
  const removePayment = useClinic((s) => s.removePayment);
  const allRx = useClinic((s) => s.prescriptions);
  const removePrescription = useClinic((s) => s.removePrescription);
  const allPlans = useClinic((s) => s.plans);
  const clinicName = useSettings((s) => s.clinicName);

  const patient = patients.find((p) => p.id === id);

  const [section, setSection] = useState<Section>("overview");
  const [tooth, setToothSel] = useState<string | undefined>();

  // نماذج الجلسة والدفعة
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sDate, setSDate] = useState(toISO(new Date()));
  const [sProc, setSProc] = useState("");
  const [sTooth, setSTooth] = useState("");
  const sMoney = useMoneyInput();
  const [sNotes, setSNotes] = useState("");

  const [payOpen, setPayOpen] = useState(false);
  const [pDate, setPDate] = useState(toISO(new Date()));
  const pMoney = useMoneyInput();
  const [pNote, setPNote] = useState("");

  const sessions = useMemo(
    () => allSessions.filter((s) => s.patientId === id).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [allSessions, id],
  );
  const payments = useMemo(
    () => allPayments.filter((p) => p.patientId === id).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [allPayments, id],
  );
  const appts = useMemo(
    () => appointments.filter((a) => a.patientId === id).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [appointments, id],
  );
  const money = patientBalance(id ?? "", allSessions, allPayments);
  const patientPlans = useMemo(() => allPlans.filter((p) => p.patientId === id), [allPlans, id]);
  const prescriptions = useMemo(
    () => allRx.filter((r) => r.patientId === id).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [allRx, id],
  );

  if (!patient) {
    return (
      <Screen title="غير موجود" back>
        <Text>تعذّر العثور على هذا المريض.</Text>
      </Screen>
    );
  }

  /** كشف حساب نصي: الجلسات والدفعات والرصيد، للإرسال عبر واتساب */
  const shareStatement = () => {
    const f = (n: number) => fmtMoney(n, currency);
    const text = [
      clinicName ? `*${clinicName}*` : "*كشف حساب*",
      `المريض: ${patient.name}`,
      "",
      "الجلسات:",
      ...(sessions.length ? [...sessions].reverse().map((x) => `• ${x.date} — ${x.procedure}${x.tooth ? ` (سن ${x.tooth})` : ""}: ${f(x.cost)}`) : ["—"]),
      "",
      "الدفعات:",
      ...(payments.length ? [...payments].reverse().map((x) => `• ${x.date}: ${f(x.amount)}`) : ["—"]),
      "",
      `المستحق: ${f(money.charged)}`,
      `المدفوع: ${f(money.paid)}`,
      money.balance > 0 ? `*المتبقي: ${f(money.balance)}*` : "*الحساب مسدّد*",
    ].join("\n");
    Share.share({ message: text });
  };

  const shareRx = (rxId: string) => {
    const rx = prescriptions.find((r) => r.id === rxId);
    if (!rx) return;
    const text = [
      clinicName ? `*${clinicName}*` : "*وصفة طبية*",
      `المريض: ${patient.name}`,
      `التاريخ: ${rx.date}`,
      "",
      ...rx.lines.map((l, n) => `${n + 1}. ${l.drug}${l.dosage ? `\n   ${l.dosage}` : ""}`),
      rx.notes ? `\nملاحظات: ${rx.notes}` : "",
      "\nمع تمنياتنا بالشفاء العاجل",
    ]
      .filter((x) => x !== "")
      .join("\n");
    Share.share({ message: text });
  };


  const today = toISO(new Date());
  const nextAppt = [...appts]
    .filter((a) => a.date >= today && (a.status === "scheduled" || a.status === "arrived"))
    .sort((a, b) => (a.date + a.startTime < b.date + b.startTime ? -1 : 1))[0];

  const confirmDelete = () =>
    Alert.alert("حذف المريض", "سيُحذف المريض مع كل مواعيده وجلساته ودفعاته نهائيًا.", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: () => {
          removePatient(patient.id);
          router.back();
        },
      },
    ]);

  const saveSession = () => {
    if (!sProc.trim()) {
      Alert.alert("الإجراء مطلوب", "اكتب الإجراء الذي تمّ.");
      return;
    }
    // التكلفة اختيارية (صفر مسموح)؛ إن كُتبت بالدولار فلا بد من سعر الصرف
    const m = sMoney.value > 0 ? sMoney.result() : { amount: 0, foreign: undefined };
    if (!m) {
      Alert.alert("سعر الدولار مطلوب", "اكتب سعر الدولار اليوم.");
      return;
    }
    addSession({
      patientId: patient.id,
      date: sDate,
      procedure: sProc.trim(),
      tooth: sTooth.trim() || undefined,
      cost: m.amount,
      foreign: m.foreign,
      notes: sNotes.trim() || undefined,
    });
    setSessionOpen(false);
    setSProc("");
    setSTooth("");
    sMoney.reset();
    setSNotes("");
  };

  const savePayment = () => {
    const m = pMoney.result();
    if (!m) {
      Alert.alert("المبلغ مطلوب", pMoney.cur === "usd" ? "اكتب مبلغًا وسعر الدولار." : "اكتب مبلغًا أكبر من صفر.");
      return;
    }
    addPayment({ patientId: patient.id, date: pDate, amount: m.amount, foreign: m.foreign, note: pNote.trim() || undefined });
    setPayOpen(false);
    pMoney.reset();
    setPNote("");
  };

  const toothCount = Object.keys(patient.teeth).length;

  return (
    <Screen
      title={patient.name}
      subtitle={patient.status === "active" ? "قيد المعالجة" : "أنهى العلاج"}
      back
      right={
        <IconButton icon="create-outline" onPress={() => router.push({ pathname: "/clinic/patient-form", params: { id: patient.id } })} />
      }
    >
      <MedicalAlertBar patient={patient} />

      {patient.fileNumber || patient.phone ? (
        <View className="flex-row flex-wrap gap-2 mb-3">
          {patient.fileNumber ? (
            <View className="rounded-full px-3 py-1" style={{ backgroundColor: TYPE_META.private.soft }}>
              <Text w="semi" className="text-xs" style={{ color: TYPE_META.private.inkHex }}>
                ملف رقم {patient.fileNumber}
              </Text>
            </View>
          ) : null}
          {patient.birthYear ? (
            <View className="rounded-full px-3 py-1 bg-slate-100">
              <Text w="semi" className="text-xs">
                مواليد {patient.birthYear}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* إجراءات سريعة */}
      <View className="flex-row gap-2 mb-4">
        {patient.phone ? (
          <>
            <View className="flex-1">
              <Button label="اتصال" icon="call" variant="soft" type="hospital" onPress={() => Linking.openURL(telLink(patient.phone!))} />
            </View>
            <View className="flex-1">
              <Button
                label="واتساب"
                icon="logo-whatsapp"
                variant="soft"
                type="private"
                onPress={() => Linking.openURL(whatsappLink(patient.phone!, `السلام عليكم ${patient.name}`))}
              />
            </View>
          </>
        ) : null}
        <View className="flex-1">
          <Button
            label="موعد"
            icon="calendar"
            type="private"
            onPress={() =>
              router.push({ pathname: "/clinic/appointment-form", params: { patientId: patient.id } })
            }
          />
        </View>
      </View>

      <Segmented
        value={section}
        onChange={setSection}
        options={[
          { value: "overview", label: "نظرة" },
          { value: "teeth", label: "الأسنان" },
          { value: "sessions", label: "الجلسات" },
          { value: "rx", label: "الوصفات" },
          { value: "payments", label: "الدفعات" },
        ]}
      />

      {/* ---------------- نظرة عامة ---------------- */}
      {section === "overview" && (
        <View className="mt-4">
          <View className="flex-row gap-2.5">
            <View className="flex-1 rounded-2xl bg-hospital-soft p-3">
              <Text className="text-xs text-hospital-ink">المستحق</Text>
              <Text w="bold" className="text-hospital-ink">
                {fmtMoney(money.charged, currency)}
              </Text>
            </View>
            <View className="flex-1 rounded-2xl bg-private-soft p-3">
              <Text className="text-xs text-private-ink">المدفوع</Text>
              <Text w="bold" className="text-private-ink">
                {fmtMoney(money.paid, currency)}
              </Text>
            </View>
            <View className="flex-1 rounded-2xl p-3" style={{ backgroundColor: money.balance > 0 ? "#FEE2E2" : "#F1F5F9" }}>
              <Text className="text-xs" style={{ color: money.balance > 0 ? "#DC2626" : "#64748B" }}>
                المتبقي
              </Text>
              <Text w="bold" style={{ color: money.balance > 0 ? "#DC2626" : "#334155" }}>
                {fmtMoney(money.balance, currency)}
              </Text>
            </View>
          </View>

          <Card className="mt-3">
            <View className="flex-row flex-wrap gap-x-6 gap-y-2">
              <Text className="text-sm text-muted">الهاتف: <Text w="semi">{patient.phone || "—"}</Text></Text>
              <Text className="text-sm text-muted">
                العمر: <Text w="semi">{patient.birthYear ? new Date().getFullYear() - patient.birthYear : "—"}</Text>
              </Text>
              <Text className="text-sm text-muted">
                الجنس: <Text w="semi">{patient.gender === "male" ? "ذكر" : patient.gender === "female" ? "أنثى" : "—"}</Text>
              </Text>
              <Text className="text-sm text-muted">أسنان مسجّلة: <Text w="semi">{toothCount}</Text></Text>
            </View>
            {patient.notes ? <Text className="mt-3">{patient.notes}</Text> : null}
            <View className="mt-3">
              <Chip
                label={patient.status === "active" ? "قيد المعالجة — اضغط لإنهاء العلاج" : "أنهى العلاج — اضغط لإعادة التفعيل"}
                icon="swap-horizontal"
                selected={patient.status === "active"}
                color={TYPE_META.private.hex}
                onPress={() => updatePatient(patient.id, { status: patient.status === "active" ? "finished" : "active" })}
              />
            </View>
          </Card>

          <PatientDocs patient={patient} />

          <SectionHeader title="المواعيد" />
          {nextAppt ? (
            <Card accent="private" className="mb-2">
              <Text className="text-xs text-private-ink">الموعد القادم</Text>
              <Text w="bold">
                {fmtDateShort(nextAppt.date)} • {fmtTime(nextAppt.startTime)} • {nextAppt.procedure}
              </Text>
            </Card>
          ) : null}
          <Pressable
            onPress={() => router.push({ pathname: "/clinic/plan", params: { patientId: patient.id } })}
            className="flex-row items-center justify-between bg-surface border border-line rounded-2xl px-4 py-3 mb-3"
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="clipboard" size={22} color={TYPE_META.private.hex} />
              <View>
                <Text w="semi">خطط العلاج</Text>
                <Text className="text-xs text-muted">
                  {patientPlans.length === 0
                    ? "لا خطط بعد"
                    : `${patientPlans.length} خطة • ${patientPlans.reduce((a, p) => a + p.items.filter((i) => i.done).length, 0)}/${patientPlans.reduce((a, p) => a + p.items.length, 0)} بند منجز`}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-back" size={18} color="#94A3B8" />
          </Pressable>
          {appts.length === 0 ? (
            <EmptyState icon="calendar-outline" title="لا مواعيد" />
          ) : (
            appts.slice(0, 8).map((a) => {
              const st = STATUS_META[a.status];
              return (
                <Pressable
                  key={a.id}
                  onPress={() => router.push({ pathname: "/clinic/appointment-form", params: { id: a.id } })}
                  className="flex-row items-center justify-between bg-surface border border-line rounded-2xl px-4 py-3 mb-2"
                >
                  <View>
                    <Text w="semi">{a.procedure}</Text>
                    <Text className="text-xs text-muted">
                      {fmtDateShort(a.date)} • {fmtTime(a.startTime)}
                    </Text>
                  </View>
                  <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: st.soft }}>
                    <Text w="semi" className="text-xs" style={{ color: st.hex }}>
                      {st.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}

          <View className="mt-4">
            <Button label="حذف المريض" variant="danger" icon="trash-outline" onPress={confirmDelete} />
          </View>
        </View>
      )}

      {/* ---------------- الأسنان ---------------- */}
      {section === "teeth" && (
        <View className="mt-4">
          <Odontogram teeth={patient.teeth} selected={tooth} onSelect={setToothSel} birthYear={patient.birthYear} />

          <SectionHeader title={tooth ? `السن ${tooth}` : "اختر سنًا"} />
          {tooth ? (
            <View className="flex-row flex-wrap gap-2">
              <Chip
                label="سليم"
                selected={!patient.teeth[tooth]}
                color="#64748B"
                onPress={() => setTooth(patient.id, tooth, null)}
              />
              {(Object.keys(TOOTH_STATUS) as ToothStatus[]).map((s) => (
                <Chip
                  key={s}
                  label={TOOTH_STATUS[s].label}
                  selected={patient.teeth[tooth] === s}
                  color={TOOTH_STATUS[s].hex}
                  onPress={() => setTooth(patient.id, tooth, s)}
                />
              ))}
            </View>
          ) : (
            <Text className="text-muted">اضغط على أي سن في المخطط أعلاه ثم حدّد حالته.</Text>
          )}

          {tooth ? (
            <PressableScale
              className="mt-3 rounded-3xl p-4 flex-row items-center gap-3"
              style={{ backgroundColor: TYPE_META.private.soft }}
              onPress={() => {
                setSTooth(tooth);
                setSessionOpen(true);
                setSection("sessions");
              }}
            >
              <View className="w-12 h-12 rounded-2xl items-center justify-center" style={{ backgroundColor: TYPE_META.private.hex }}>
                <Text w="bold" style={{ color: TYPE_META.private.onSolid }}>
                  {tooth}
                </Text>
              </View>
              <View className="flex-1">
                <Text w="bold" style={{ color: TYPE_META.private.inkHex }}>
                  {patient.teeth[tooth] ? TOOTH_STATUS[patient.teeth[tooth]].label : "سليم"}
                </Text>
                <Text className="text-xs" style={{ color: TYPE_META.private.inkHex, opacity: 0.8 }}>
                  {sessions.filter((x) => x.tooth === tooth).length} جلسات مسجّلة على هذا السن
                </Text>
              </View>
              <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: TYPE_META.private.hex }}>
                <Ionicons name="add" size={24} color={TYPE_META.private.onSolid} />
              </View>
            </PressableScale>
          ) : null}

          {toothCount > 0 ? (
            <>
              <SectionHeader title="ملخص الحالات" />
              <View className="flex-row flex-wrap gap-2">
                {(Object.keys(TOOTH_STATUS) as ToothStatus[]).map((s) => {
                  const list = Object.entries(patient.teeth)
                    .filter(([, v]) => v === s)
                    .map(([k]) => k);
                  if (list.length === 0) return null;
                  return (
                    <View key={s} className="rounded-xl px-3 py-2" style={{ backgroundColor: TOOTH_STATUS[s].soft }}>
                      <Text w="bold" className="text-xs" style={{ color: TOOTH_STATUS[s].hex }}>
                        {TOOTH_STATUS[s].label}
                      </Text>
                      <Text className="text-sm" style={{ color: TOOTH_STATUS[s].hex }}>
                        {list.sort().join("، ")}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}
        </View>
      )}

      {/* ---------------- الجلسات ---------------- */}
      {section === "sessions" && (
        <View className="mt-4">
          <Button label="تسجيل جلسة" icon="add" type="private" onPress={() => setSessionOpen(true)} />
          <View className="mt-2">
            <QuickSession patientId={patient.id} />
          </View>
          <View className="mt-3">
            {sessions.length === 0 ? (
              <EmptyState icon="medkit-outline" title="لا جلسات مسجّلة" hint="سجّل كل علاج مع تكلفته لتُحسب الذمم تلقائيًا" />
            ) : (
              sessions.map((s) => (
                <Card key={s.id} className="mb-2">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <Text w="bold">{s.procedure}</Text>
                      <Text className="text-xs text-muted">
                        {fmtDateShort(s.date)}
                        {s.tooth ? ` • السن ${s.tooth}` : ""}
                      </Text>
                      {s.notes ? <Text className="text-sm mt-1">{s.notes}</Text> : null}
                    </View>
                    <View className="items-end gap-1">
                      <Text w="bold" className="text-hospital-ink">
                        {fmtMoney(s.cost, currency)}
                      </Text>
                      {s.foreign ? <Text className="text-xs text-muted">{foreignLabel(s.foreign)}</Text> : null}
                      <Pressable
                        hitSlop={8}
                        onPress={() =>
                          Alert.alert("حذف الجلسة", "هل تريد حذف هذه الجلسة؟", [
                            { text: "إلغاء", style: "cancel" },
                            { text: "حذف", style: "destructive", onPress: () => removeSession(s.id) },
                          ])
                        }
                      >
                        <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                      </Pressable>
                    </View>
                  </View>
                </Card>
              ))
            )}
          </View>
        </View>
      )}

      {/* ---------------- الدفعات ---------------- */}
      {/* ---------------- الوصفات ---------------- */}
      {section === "rx" && (
        <View className="mt-4">
          <Button
            label="وصفة جديدة"
            icon="document-text"
            type="private"
            onPress={() => router.push({ pathname: "/clinic/prescription-form", params: { patientId: patient.id } })}
          />
          <View className="mt-3">
            {prescriptions.length === 0 ? (
              <EmptyState icon="document-text-outline" title="لا وصفات" hint="أضف وصفة وشاركها مع المريض" />
            ) : (
              prescriptions.map((rx) => (
                <Card key={rx.id} className="mb-3">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text w="bold">{fmtDateShort(rx.date)}</Text>
                    <View className="flex-row gap-1">
                      <IconButton icon="share-social" onPress={() => shareRx(rx.id)} />
                      <IconButton
                        icon="trash-outline"
                        onPress={() =>
                          Alert.alert("حذف الوصفة", "سيتم حذف هذه الوصفة.", [
                            { text: "إلغاء", style: "cancel" },
                            { text: "حذف", style: "destructive", onPress: () => removePrescription(rx.id) },
                          ])
                        }
                      />
                    </View>
                  </View>
                  {rx.lines.map((l, i) => (
                    <View key={i} className="mb-1.5">
                      <Text w="semi">{i + 1}. {l.drug}</Text>
                      {l.dosage ? <Text className="text-sm text-muted">{l.dosage}</Text> : null}
                    </View>
                  ))}
                  {rx.notes ? <Text className="text-sm mt-1">ملاحظات: {rx.notes}</Text> : null}
                </Card>
              ))
            )}
          </View>
        </View>
      )}

      {section === "payments" && (
        <View className="mt-4">
          <View className="mb-3">
            <Button label="مشاركة كشف الحساب" icon="share-social" variant="soft" small onPress={shareStatement} />
          </View>
          <View className="rounded-2xl p-4 mb-3" style={{ backgroundColor: money.balance > 0 ? "#FEE2E2" : "#DCFCE7" }}>
            <Text className="text-sm" style={{ color: money.balance > 0 ? "#DC2626" : "#14532D" }}>
              {money.balance > 0 ? "المتبقي على المريض" : "الحساب مسدّد"}
            </Text>
            <Text w="bold" className="text-2xl" style={{ color: money.balance > 0 ? "#DC2626" : "#14532D" }}>
              {fmtMoney(Math.max(0, money.balance), currency)}
            </Text>
          </View>
          <Button label="تسجيل دفعة" icon="cash" type="private" onPress={() => setPayOpen(true)} />
          <View className="mt-3">
            {payments.length === 0 ? (
              <EmptyState icon="cash-outline" title="لا دفعات" />
            ) : (
              payments.map((p) => (
                <Card key={p.id} className="mb-2">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text w="bold" className="text-private-ink">
                        +{fmtMoney(p.amount, currency)}
                      </Text>
                      <Text className="text-xs text-muted">
                        {fmtDateShort(p.date)}
                        {p.foreign ? ` • ${foreignLabel(p.foreign)}` : ""}
                        {p.note ? ` • ${p.note}` : ""}
                      </Text>
                    </View>
                    <Pressable
                      hitSlop={8}
                      onPress={() =>
                        Alert.alert("حذف الدفعة", "هل تريد حذف هذه الدفعة؟", [
                          { text: "إلغاء", style: "cancel" },
                          { text: "حذف", style: "destructive", onPress: () => removePayment(p.id) },
                        ])
                      }
                    >
                      <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                    </Pressable>
                  </View>
                </Card>
              ))
            )}
          </View>
        </View>
      )}

      {/* نافذة الجلسة */}
      <Sheet visible={sessionOpen} onClose={() => setSessionOpen(false)} title="تسجيل جلسة">
        <DateField label="التاريخ" value={sDate} onChange={(v) => v && setSDate(v)} />
        <FieldRow label="الإجراء">
          <View className="flex-row flex-wrap gap-2">
            {procedures.map((p) => (
              <Chip key={p.name} label={p.name} selected={sProc === p.name} color={TYPE_META.private.hex} onPress={() => setSProc(p.name)} />
            ))}
          </View>
        </FieldRow>
        <Field value={sProc} onChangeText={setSProc} placeholder="أو اكتب الإجراء" />
        <Field label="رقم السن" value={sTooth} onChangeText={setSTooth} placeholder="36" keyboardType="number-pad" />
        <MoneyField label="التكلفة" m={sMoney} />
        <DictateField label="ملاحظات" value={sNotes} onChangeText={setSNotes} multiline />
        <Button label="حفظ الجلسة" icon="checkmark" type="private" onPress={saveSession} />
      </Sheet>

      {/* نافذة الدفعة */}
      <Sheet visible={payOpen} onClose={() => setPayOpen(false)} title="تسجيل دفعة">
        <DateField label="التاريخ" value={pDate} onChange={(v) => v && setPDate(v)} />
        <MoneyField label="المبلغ" m={pMoney} autoFocus />
        <Field label="ملاحظة" value={pNote} onChangeText={setPNote} placeholder="مثال: دفعة أولى" />
        <Button label="حفظ الدفعة" icon="checkmark" type="private" onPress={savePayment} />
      </Sheet>
    </Screen>
  );
}
