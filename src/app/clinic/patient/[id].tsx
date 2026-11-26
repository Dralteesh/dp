import { useTheme } from "@/hooks/useTheme";
import { TYPE_META } from "@/constants/shiftTypes";
import { useMemo, useState } from "react";
import { Alert, Linking, Pressable, Share, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DictateField } from "@/components/DictateField";
import { MoneyField, useMoneyInput } from "@/components/MoneyField";
import { PatientStatusHeader } from "@/components/clinic/PatientStatusHeader";
import { openItems } from "@/lib/clinicLink";
import { MedicalAlertBar } from "@/components/clinic/MedicalAlertBar";
import { TagPills } from "@/components/clinic/TagPills";
import { PatientTypePanel } from "@/components/clinic/PatientTypePanel";
import { QuickSession } from "@/components/clinic/QuickSession";
import { AffectedTeethTable } from "@/components/clinic/AffectedTeethTable";
import { ToothPanel } from "@/components/clinic/ToothPanel";
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
import { STATUS_META, TOOTH_STATUS } from "@/constants/clinic";
import { foreignLabel, priceInBase } from "@/lib/currency";
import { fmtDateShort, fmtTime, toISO } from "@/lib/dates";
import { fmtMoney, initial, parseAmount } from "@/lib/format";
import { telLink, whatsappLink } from "@/lib/phone";
import { patientBalance, useClinic } from "@/store/useClinic";
import { useExtras } from "@/store/useExtras";
import { useSettings } from "@/store/useSettings";
import type { ToothStatus } from "@/types";
import { useProcedures } from "@/hooks/useProcedures";

type Section = "overview" | "teeth" | "sessions" | "payments";

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
  const [addFile, setAddFile] = useState(false);
  const orthoCases = useExtras((s) => s.orthoCases);
  const perioCharts = useExtras((s) => s.perioCharts);
  const labOrders = useExtras((s) => s.labOrders);
  const hasOrtho = orthoCases.some((o) => o.patientId === id);
  const hasPerio = perioCharts.some((o) => o.patientId === id);
  const hasLab = labOrders.some((o) => o.patientId === id);
  const [tooth, setToothSel] = useState<string | undefined>();

  // نماذج الجلسة والدفعة
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sDate, setSDate] = useState(toISO(new Date()));
  const [sProc, setSProc] = useState("");
  const [sTooth, setSTooth] = useState("");
  const sMoney = useMoneyInput();
  /** ما يدفعه المريض الآن عند الجلسة (اختياري): الباقي يُدفع لاحقًا على دفعات أو بنهاية العمل */
  const sPaid = useMoneyInput();
  const [sNotes, setSNotes] = useState("");
  const priceList = useExtras((s) => s.priceList);
  const usdRate = useSettings((s) => s.usdRate);

  /** اختيار إجراء: يعبّئ المبلغ من قائمة الأسعار إن وُجد (يبقى قابلًا للتعديل لكل مريض) */
  const pickProcedure = (name: string) => {
    setSProc(name);
    const item = priceList.find((x) => x.active && x.name.trim() === name.trim());
    if (!item) return;
    if (item.currency === "USD") {
      sMoney.setCur("usd");
      sMoney.setRateText(usdRate ? String(usdRate) : "");
      sMoney.setText(String(item.price));
    } else {
      const v = priceInBase(item, usdRate);
      sMoney.setCur("base");
      sMoney.setText(v === null ? "" : String(v));
    }
  };

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
    // المبلغ المطلوب من المريض يُسجَّل مع كل معالجة؛ إن كُتب بالدولار فلا بد من سعر الصرف
    if (!(sMoney.value > 0)) {
      Alert.alert("المبلغ مطلوب", "اكتب المبلغ المراد تحصيله من المريض لهذه المعالجة.");
      return;
    }
    const m = sMoney.result();
    if (!m) {
      Alert.alert("سعر الدولار مطلوب", "اكتب سعر الدولار اليوم.");
      return;
    }
    const paid = sPaid.value > 0 ? sPaid.result() : null;
    if (sPaid.value > 0 && !paid) {
      Alert.alert("سعر الدولار مطلوب", "اكتب سعر الدولار للمبلغ المدفوع.");
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
    if (paid) {
      addPayment({
        patientId: patient.id,
        date: sDate,
        amount: paid.amount,
        foreign: paid.foreign,
        note: `دفعة عند الجلسة: ${sProc.trim()}`,
      });
    }
    setSessionOpen(false);
    setSProc("");
    setSTooth("");
    sMoney.reset();
    sPaid.reset();
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
      {patient.tags?.length ? (
        <View className="mb-3">
          <TagPills tags={patient.tags} />
        </View>
      ) : null}

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
          { value: "payments", label: "الدفعات" },
        ]}
      />

      {/* ---------------- نظرة عامة ---------------- */}
      {section === "overview" && (
        <View className="mt-4">
          <PatientStatusHeader patientId={patient.id} />
          {openItems(allPlans, patient.id).length ? (
            <View className="mt-3">
              <Button
                label="احجز موعدًا لبنود الخطة"
                icon="calendar"
                type="private"
                onPress={() => {
                  const o = openItems(allPlans, patient.id);
                  router.push({
                    pathname: "/clinic/appointment-form",
                    params: { patientId: patient.id, planItemIds: o.map((x) => x.item.id).join(","), teeth: [...new Set(o.flatMap((x) => (x.item.teeth ?? (x.item.tooth ? [x.item.tooth] : []))))].join(","), procedure: o[0].item.procedure },
                  });
                }}
              />
            </View>
          ) : null}
          <PatientTypePanel patientId={patient.id} />
          <View className="flex-row flex-wrap gap-2 mb-3">
            {[
              { l: "التقويم", i: "git-compare-outline", h: "/clinic/ortho", on: hasOrtho },
              { l: "اللثة", i: "pulse-outline", h: "/clinic/perio", on: hasPerio },
              { l: "المخبر والتعويضات", i: "construct-outline", h: "/clinic/lab", on: hasLab },
            ]
              .filter((x) => x.on)
              .map((x) => (
                <Chip
                  key={x.h}
                  label={x.l}
                  icon={x.i as never}
                  color={TYPE_META.private.hex}
                  onPress={() => router.push({ pathname: x.h as never, params: { patientId: patient.id } })}
                />
              ))}
            {!(hasOrtho && hasPerio && hasLab) ? (
              <Chip label="إضافة ملف" icon="add" color="#64748B" onPress={() => setAddFile(true)} />
            ) : null}
          </View>
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

          <View className="mt-4 flex-row gap-2">
            <View className="flex-1">
              <Button
                label="مستندات PDF"
                icon="document-text"
                variant="soft"
                type="private"
                onPress={() => router.push({ pathname: "/clinic/patient-docs", params: { patientId: patient.id } })}
              />
            </View>
            <View className="flex-1">
              <Button label="حذف المريض" variant="danger" icon="trash-outline" onPress={confirmDelete} />
            </View>
          </View>
        </View>
      )}

      {/* ---------------- الأسنان ---------------- */}
      {section === "teeth" && (
        <View className="mt-4">
          <Odontogram
            teeth={patient.teeth}
            selected={tooth}
            onSelect={setToothSel}
            birthYear={patient.birthYear}
            dentition={patient.dentition}
            onDentitionChange={(d) => updatePatient(patient.id, { dentition: d })}
            marks={patient.toothMarks}
            bridges={patient.bridges}
            onBridgesChange={(b) => updatePatient(patient.id, { bridges: b })}
          />

          {tooth ? (
            <ToothPanel
              patient={patient}
              tooth={tooth}
              sessions={sessions}
              onSetStatus={(st) => setTooth(patient.id, tooth, st)}
              onToggleMark={(mk) => {
                const all = { ...(patient.toothMarks ?? {}) };
                const cur = all[tooth] ?? [];
                const next = cur.includes(mk) ? cur.filter((x) => x !== mk) : [...cur, mk];
                if (next.length) all[tooth] = next;
                else delete all[tooth];
                updatePatient(patient.id, { toothMarks: all });
              }}
              onSaveNote={(note) => {
                const notes = { ...(patient.toothNotes ?? {}) };
                if (note) notes[tooth] = note;
                else delete notes[tooth];
                updatePatient(patient.id, { toothNotes: notes });
              }}
              onAddSession={() => {
                setSTooth(tooth);
                setSessionOpen(true);
                setSection("sessions");
              }}
            />
          ) : (
            <>
              <SectionHeader title="اختر سنًا" />
              <Text className="text-muted">اضغط على أي سن في المخطط أعلاه لعرض حالته وسجل علاجه وملاحظاته.</Text>
            </>
          )}

          <AffectedTeethTable patient={patient} onPick={setToothSel} />

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
          <View className="flex-row gap-2 mt-3">
            {[
              { l: "المطلوب", v: money.charged, c: "#0B4F73" },
              { l: "المدفوع", v: money.paid, c: "#16A34A" },
              { l: "المتبقي", v: Math.max(0, money.balance), c: money.balance > 0 ? "#DC2626" : "#64748B" },
            ].map((x) => (
              <View key={x.l} className="flex-1 rounded-2xl p-3 bg-slate-50">
                <Text className="text-xs text-muted">{x.l}</Text>
                <Text w="bold" style={{ color: x.c }}>
                  {fmtMoney(x.v, currency)}
                </Text>
              </View>
            ))}
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

          <SectionHeader title="الفحص والتخطيط" />
          <View className="flex-row flex-wrap gap-2 mb-3">
            <Chip label="خطط العلاج" icon="clipboard" color={TYPE_META.private.hex} onPress={() => router.push({ pathname: "/clinic/plan", params: { patientId: patient.id } })} />
            <Chip label="الفحوصات والتشخيص" icon="clipboard-outline" color={TYPE_META.private.hex} onPress={() => router.push({ pathname: "/clinic/exams", params: { patientId: patient.id } })} />
            <Chip label="الموافقات" icon="document-attach-outline" color={TYPE_META.private.hex} onPress={() => router.push({ pathname: "/clinic/consents", params: { patientId: patient.id } })} />
          </View>
          <SectionHeader title="الوصفات" />
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

      {/* ---------------- الدفعات ---------------- */}
      {section === "payments" && (
        <View className="mt-4">
          <View className="mb-3">
            <Button label="مشاركة كشف الحساب" icon="share-social" variant="soft" small onPress={shareStatement} />
          </View>
          <View className="flex-row flex-wrap gap-2 mb-3">
            <Chip label="الفواتير" icon="receipt-outline" color={TYPE_META.private.hex} onPress={() => router.push({ pathname: "/clinic/invoices", params: { patientId: patient.id } })} />
            <Chip label="الأقساط" icon="calendar-outline" color={TYPE_META.private.hex} onPress={() => router.push({ pathname: "/clinic/installments", params: { patientId: patient.id } })} />
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
              <Chip key={p.name} label={p.name} selected={sProc === p.name} color={TYPE_META.private.hex} onPress={() => pickProcedure(p.name)} />
            ))}
          </View>
        </FieldRow>
        <Field value={sProc} onChangeText={pickProcedure} placeholder="أو اكتب الإجراء" />
        <Field label="رقم السن" value={sTooth} onChangeText={setSTooth} placeholder="36" keyboardType="number-pad" />
        <MoneyField label="المبلغ المطلوب من المريض" m={sMoney} />
        <MoneyField label="المدفوع الآن (اختياري — الباقي لاحقًا)" m={sPaid} />
        {sMoney.value > 0 && sPaid.value > 0 && sMoney.cur === "base" && sPaid.cur === "base" ? (
          <Text className="text-sm text-muted mb-3">
            المتبقي بعد هذه الجلسة: {fmtMoney(Math.max(0, sMoney.value - sPaid.value), currency)}
          </Text>
        ) : null}
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

      <Sheet visible={addFile} onClose={() => setAddFile(false)} title="إضافة ملف للمريض">
        {[
          { l: "ملف تقويم", d: "فحص وخطة وسجل زيارات", h: "/clinic/ortho", show: !hasOrtho },
          { l: "قياسات لثة", d: "عمق الجيوب والنزف", h: "/clinic/perio", show: !hasPerio },
          { l: "طلب مخبر / تعويضات", d: "ثابتة، متحركة، فوق الزرع", h: "/clinic/lab", show: !hasLab },
        ]
          .filter((x) => x.show)
          .map((x) => (
            <Pressable
              key={x.h}
              className="py-3.5 border-b border-line"
              onPress={() => {
                setAddFile(false);
                router.push({ pathname: x.h as never, params: { patientId: patient.id } });
              }}
            >
              <Text w="semi">{x.l}</Text>
              <Text className="text-xs text-muted">{x.d}</Text>
            </Pressable>
          ))}
      </Sheet>
    </Screen>
  );
}
