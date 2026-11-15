import { useMemo, useState } from "react";
import { Alert, Linking, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Odontogram } from "@/components/Odontogram";
import { DateField } from "@/components/pickers";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip, Segmented } from "@/components/ui/Chip";
import { EmptyState, SectionHeader } from "@/components/ui/EmptyState";
import { Field, FieldRow } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { PROCEDURES, STATUS_META, TOOTH_STATUS } from "@/constants/clinic";
import { fmtDateShort, fmtTime, toISO } from "@/lib/dates";
import { fmtMoney, initial, parseAmount } from "@/lib/format";
import { telLink, whatsappLink } from "@/lib/phone";
import { patientBalance, useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";
import type { ToothStatus } from "@/types";

type Section = "overview" | "teeth" | "sessions" | "payments";
const GREEN = "#16A34A";

export default function PatientScreen() {
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

  const patient = patients.find((p) => p.id === id);

  const [section, setSection] = useState<Section>("overview");
  const [tooth, setToothSel] = useState<string | undefined>();

  // نماذج الجلسة والدفعة
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sDate, setSDate] = useState(toISO(new Date()));
  const [sProc, setSProc] = useState("");
  const [sTooth, setSTooth] = useState("");
  const [sCost, setSCost] = useState("");
  const [sNotes, setSNotes] = useState("");

  const [payOpen, setPayOpen] = useState(false);
  const [pDate, setPDate] = useState(toISO(new Date()));
  const [pAmount, setPAmount] = useState("");
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

  if (!patient) {
    return (
      <Screen title="غير موجود" back>
        <Text>تعذّر العثور على هذا المريض.</Text>
      </Screen>
    );
  }

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
    addSession({
      patientId: patient.id,
      date: sDate,
      procedure: sProc.trim(),
      tooth: sTooth.trim() || undefined,
      cost: parseAmount(sCost),
      notes: sNotes.trim() || undefined,
    });
    setSessionOpen(false);
    setSProc("");
    setSTooth("");
    setSCost("");
    setSNotes("");
  };

  const savePayment = () => {
    const amount = parseAmount(pAmount);
    if (amount <= 0) {
      Alert.alert("المبلغ مطلوب", "اكتب مبلغًا أكبر من صفر.");
      return;
    }
    addPayment({ patientId: patient.id, date: pDate, amount, note: pNote.trim() || undefined });
    setPayOpen(false);
    setPAmount("");
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
      {patient.medicalAlerts ? (
        <View className="flex-row gap-2 bg-red-50 border border-red-200 rounded-2xl p-3 mb-3">
          <Ionicons name="warning" size={20} color="#DC2626" />
          <View className="flex-1">
            <Text w="bold" className="text-danger text-sm">
              تنبيه طبي
            </Text>
            <Text className="text-danger">{patient.medicalAlerts}</Text>
          </View>
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
                color={GREEN}
                onPress={() => updatePatient(patient.id, { status: patient.status === "active" ? "finished" : "active" })}
              />
            </View>
          </Card>

          <SectionHeader title="المواعيد" />
          {nextAppt ? (
            <Card accent="private" className="mb-2">
              <Text className="text-xs text-private-ink">الموعد القادم</Text>
              <Text w="bold">
                {fmtDateShort(nextAppt.date)} • {fmtTime(nextAppt.startTime)} • {nextAppt.procedure}
              </Text>
            </Card>
          ) : null}
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
          <Odontogram teeth={patient.teeth} selected={tooth} onSelect={setToothSel} />
          <Text className="text-xs text-muted mt-2">مرّر أفقيًا لرؤية كل الأسنان، واضغط سنًا لتحديده.</Text>

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
      {section === "payments" && (
        <View className="mt-4">
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
            {PROCEDURES.map((p) => (
              <Chip key={p.name} label={p.name} selected={sProc === p.name} color={GREEN} onPress={() => setSProc(p.name)} />
            ))}
          </View>
        </FieldRow>
        <Field value={sProc} onChangeText={setSProc} placeholder="أو اكتب الإجراء" />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="رقم السن" value={sTooth} onChangeText={setSTooth} placeholder="36" keyboardType="number-pad" />
          </View>
          <View className="flex-1">
            <Field label={`التكلفة (${currency})`} value={sCost} onChangeText={setSCost} placeholder="0" keyboardType="numeric" />
          </View>
        </View>
        <Field label="ملاحظات" value={sNotes} onChangeText={setSNotes} multiline />
        <Button label="حفظ الجلسة" icon="checkmark" type="private" onPress={saveSession} />
      </Sheet>

      {/* نافذة الدفعة */}
      <Sheet visible={payOpen} onClose={() => setPayOpen(false)} title="تسجيل دفعة">
        <DateField label="التاريخ" value={pDate} onChange={(v) => v && setPDate(v)} />
        <Field label={`المبلغ (${currency})`} value={pAmount} onChangeText={setPAmount} placeholder="0" keyboardType="numeric" autoFocus />
        <Field label="ملاحظة" value={pNote} onChangeText={setPNote} placeholder="مثال: دفعة أولى" />
        <Button label="حفظ الدفعة" icon="checkmark" type="private" onPress={savePayment} />
      </Sheet>
    </Screen>
  );
}
