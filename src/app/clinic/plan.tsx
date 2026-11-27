import { useState } from "react";
import { Alert, Linking, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DateField } from "@/components/pickers";
import { MoneyField, useMoneyInput } from "@/components/MoneyField";
import { PlanWizard } from "@/components/clinic/PlanWizard";
import { Odontogram } from "@/components/Odontogram";
import { itemTeeth, itemsForTeeth } from "@/lib/clinicLink";
import { useExtras } from "@/store/useExtras";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, FieldRow } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { useTheme } from "@/hooks/useTheme";
import { toISO } from "@/lib/dates";
import { fmtMoney, parseAmount } from "@/lib/format";
import { distributeDiscount, itemNet, patientPlanFinance, PAY_COLOR, PAY_LABEL } from "@/lib/planFinance";
import { whatsappLink } from "@/lib/phone";
import { EditMoneySheet, type MoneyTarget } from "@/components/clinic/EditMoneySheet";
import { sharePdf } from "@/lib/pdf";
import { priceForProcedure } from "@/lib/clinicLink";
import type { TreatmentPackage } from "@/types/extras";
import { statementHtml, type DocCtx } from "@/lib/pdfHtml";
import { EXPENSE_CATEGORIES } from "@/constants/clinic";
import { patientBalance, useClinic } from "@/store/useClinic";
import type { ExpenseCategory } from "@/types";
import { useSettings } from "@/store/useSettings";
import { useProcedures } from "@/hooks/useProcedures";

/** خطط علاج المريض: بنود مرتبة بتكلفة، وإنجاز البند يضيف جلسة لحساب المريض */
export default function PlanScreen() {
  const procedures = useProcedures();
  useTheme();
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const currency = useSettings((s) => s.currency);
  const patient = useClinic((s) => s.patients.find((p) => p.id === patientId));
  const allPlans = useClinic((s) => s.plans);
  const plans = allPlans.filter((p) => p.patientId === patientId);
  const addPlan = useClinic((s) => s.addPlan);
  const removePlan = useClinic((s) => s.removePlan);
  const addPlanItem = useClinic((s) => s.addPlanItem);
  const removePlanItem = useClinic((s) => s.removePlanItem);
  const completePlanItem = useClinic((s) => s.completePlanItem);
  const undoPlanItem = useClinic((s) => s.undoPlanItem);
  const patchPlanItem = useClinic((s) => s.patchPlanItem);
  const sessions = useClinic((s) => s.sessions);
  const payments = useClinic((s) => s.payments);
  const addPayment = useClinic((s) => s.addPayment);
  const removePayment = useClinic((s) => s.removePayment);

  // المالية داخل الخطة: دفعة لخطة محددة، وتعديل تكلفة بند
  const [payFor, setPayFor] = useState<string | null>(null);
  const [payDate, setPayDate] = useState(toISO(new Date()));
  const [payNote, setPayNote] = useState("");
  const pm = useMoneyInput();
  const [editMoney, setEditMoney] = useState<MoneyTarget>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const packages = useExtras((s) => s.packages);
  const addPlanItems = useClinic((s) => s.addPlanItems);
  const [pkgFor, setPkgFor] = useState<string | null>(null);
  const [costEdit, setCostEdit] = useState<{ itemId: string; text: string; disc: string; note: string; done: boolean } | null>(null);
  const [discFor, setDiscFor] = useState<string | null>(null);
  const [discMode, setDiscMode] = useState<"percent" | "amount">("percent");
  const [discVal, setDiscVal] = useState("");
  const [discNote, setDiscNote] = useState("");
  const [expFor, setExpFor] = useState<string | null>(null);
  const [expCat, setExpCat] = useState<ExpenseCategory>("lab");
  const [expNote, setExpNote] = useState("");
  const em = useMoneyInput();
  const expenses = useClinic((s) => s.expenses);
  const addExpense = useClinic((s) => s.addExpense);
  const clinicName = useSettings((s) => s.clinicName);
  const doctorName = useSettings((s) => s.doctorName);
  const clinicLogo = useSettings((s) => s.clinicLogo);

  const [newOpen, setNewOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [title, setTitle] = useState("");

  const [itemFor, setItemFor] = useState<string | null>(null);
  const [proc, setProc] = useState("");
  const [teethSel, setTeethSel] = useState<string[]>([]);
  const priceList = useExtras((s) => s.priceList);
  const usdRate = useSettings((s) => s.usdRate);
  const updatePatient = useClinic((s) => s.updatePatient);
  const [cost, setCost] = useState("");

  const [doneFor, setDoneFor] = useState<{ planId: string; itemId: string } | null>(null);
  const [doneDate, setDoneDate] = useState(toISO(new Date()));

  const green = TYPE_META.private.hex;

  if (!patient) {
    return (
      <Screen title="خطة العلاج" back>
        <Text>المريض غير موجود.</Text>
      </Screen>
    );
  }

  const bal = patientBalance(patient.id, sessions, payments);
  const fin = patientPlanFinance(allPlans, payments, expenses, patient.id);
  const finOf = new Map(fin.plans.map((f) => [f.plan.id, f]));
  const plansTotal = fin.plans.reduce((a, f) => a + f.net, 0);
  const remindWhatsapp = () => {
    if (!patient.phone) return Alert.alert("لا رقم هاتف", "أضف رقم المريض من ملفه.");
    const txt = `السلام عليكم ${patient.name}، المتبقي لك من حساب العلاج ${fmtMoney(bal.balance, currency)}${clinicName ? ` لدى ${clinicName}` : ""}. شكرًا لك.`;
    Linking.openURL(whatsappLink(patient.phone, txt));
  };

  const shareStatement = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    const ctx: DocCtx = { clinicName, doctorName, logo: clinicLogo || undefined, currency, dateISO: toISO(new Date()) };
    const err = await sharePdf(
      statementHtml(ctx, patient, sessions.filter((x) => x.patientId === patient.id), payments.filter((x) => x.patientId === patient.id), fin.plans),
      `كشف-حساب-${patient.name}`,
    );
    setPdfBusy(false);
    if (err) Alert.alert("PDF", err);
  };

  /** يضيف حزمة للخطة كبنود: سعر كل إجراء من القائمة، والفرق عن سعر الحزمة يُوزَّع خصمًا بالتناسب */
  const addPackageToPlan = (pk: TreatmentPackage) => {
    if (!pkgFor) return;
    const n = pk.procedures.length;
    const list = pk.procedures.map((name) => priceForProcedure(name, priceList, usdRate));
    const L = list.reduce((a, x) => a + x, 0);
    const save = L > pk.price ? L - pk.price : 0;
    let used = 0;
    const items = pk.procedures.map((name, i) => {
      const base = L > 0 ? list[i] : pk.price / n;
      const scaled = L > 0 && L <= pk.price ? (base * pk.price) / L : base;
      const d = save > 0 ? (i === n - 1 ? Math.round(save - used) : Math.round((save * base) / L)) : 0;
      used += d;
      return {
        procedure: name,
        cost: Math.round(scaled),
        ...(d > 0 ? { discount: Math.min(Math.round(scaled), d), discountNote: `حزمة: ${pk.name}` } : { discountNote: undefined }),
      };
    });
    addPlanItems(patient.id, items, pkgFor);
    setPkgFor(null);
  };

  const saveExpense = () => {
    if (!expFor) return;
    const r = em.result();
    if (!r) return Alert.alert("أدخل المبلغ", "المبلغ مطلوب (وسعر الدولار إن كان بالدولار).");
    addExpense({ date: toISO(new Date()), category: expCat, amount: r.amount, foreign: r.foreign, note: expNote.trim() || undefined, planId: expFor });
    setExpFor(null);
  };

  const applyPlanDiscount = () => {
    const plan = plans.find((x) => x.id === discFor);
    const v = parseAmount(discVal);
    if (!plan || v <= 0) return Alert.alert("اكتب قيمة الخصم");
    const map = distributeDiscount(plan.items, discMode, v, discNote.trim());
    if (!map.size) return Alert.alert("لا بنود مفتوحة", "الخصم يُطبَّق على البنود غير المنجزة فقط.");
    for (const [id, d] of map) patchPlanItem(id, d);
    setDiscFor(null);
  };

  const savePayment = () => {
    if (!payFor) return;
    const r = pm.result();
    if (!r) return Alert.alert("أدخل المبلغ", "المبلغ مطلوب (وسعر الدولار إن كان بالدولار).");
    addPayment({ patientId: patient.id, date: payDate, amount: r.amount, foreign: r.foreign, note: payNote.trim() || undefined, planId: payFor });
    setPayFor(null);
  };

  const createPlan = () => {
    const id = addPlan(patient.id, title.trim() || "خطة علاج", []);
    setNewOpen(false);
    setTitle("");
    setItemFor(id);
    setProc("");
    setTeethSel([]);
    setCost("");
  };

  const saveItem = () => {
    if (!itemFor) return;
    if (!proc.trim()) return Alert.alert("اكتب الإجراء");
    // بند لكل سن؛ التكلفة المكتوبة تُطبَّق على كل سن، وإن تُركت فارغة تُؤخذ من قائمة الأسعار
    const typed = parseAmount(cost);
    for (const it of itemsForTeeth(proc.trim(), teethSel, priceList, usdRate)) addPlanItem(itemFor, { ...it, cost: typed > 0 ? typed : it.cost });
    setItemFor(null);
  };

  return (
    <Screen title="خطط العلاج" subtitle={patient.name} back>
      <Card className="mb-3">
        <Text w="bold" className="mb-2">
          حساب المريض
        </Text>
        <View className="flex-row flex-wrap gap-y-2">
          {[
            { label: "تكلفة الخطط (بعد الخصم)", value: plansTotal, color: "#0F172A" },
            { label: "المنجز (مستحق)", value: bal.charged, color: "#0F172A" },
            { label: "المدفوع", value: bal.paid, color: "#16A34A" },
            { label: "المتبقي عليه", value: bal.balance, color: bal.balance > 0 ? "#DC2626" : "#16A34A" },
          ].map((x) => (
            <View key={x.label} style={{ width: "50%" }}>
              <Text className="text-xs text-muted">{x.label}</Text>
              <Text w="bold" style={{ color: x.color }}>
                {fmtMoney(x.value, currency)}
              </Text>
            </View>
          ))}
        </View>
        {fin.credit > 0 ? <Text className="text-xs mt-2" style={{ color: "#166534" }}>رصيد دائن غير موزَّع على الخطط: {fmtMoney(fin.credit, currency)}</Text> : null}
        <View className="flex-row flex-wrap gap-2 mt-3">
          <Button small label="كشف حساب PDF" icon="document-text-outline" variant="soft" type="private" disabled={pdfBusy} onPress={shareStatement} />
          {bal.balance > 0 ? <Button small label="تذكير واتساب بالمتبقي" icon="logo-whatsapp" variant="soft" onPress={remindWhatsapp} /> : null}
        </View>
      </Card>
      <Button label="خطة جديدة" icon="add" type="private" onPress={() => { setTitle(""); setNewOpen(true); }} />
      <View className="h-2" />
      <Button label="خطة معالجة لبية بالأسئلة" icon="pulse-outline" variant="soft" type="private" onPress={() => setWizardOpen(true)} />

      <View className="mt-3">
        {plans.length === 0 ? (
          <EmptyState icon="clipboard-outline" title="لا خطط" hint="أنشئ خطة وأضف بنودها بتكلفتها التقديرية" />
        ) : (
          plans.map((plan) => {
            const f = finOf.get(plan.id);
            const total = f?.net ?? 0;
            const done = plan.items.filter((i) => i.done);
            const doneCost = f?.doneNet ?? 0;
            const pct = plan.items.length ? Math.round((done.length / plan.items.length) * 100) : 0;
            const planPays = payments.filter((x) => x.planId === plan.id);
            const planPaid = f?.paid ?? 0;
            return (
              <Card key={plan.id} className="mb-4">
                <View className="flex-row items-center justify-between">
                  <Text w="bold" className="flex-1">
                    {plan.title}
                  </Text>
                  <Pressable
                    hitSlop={10}
                    onPress={() =>
                      Alert.alert("حذف الخطة", "تُحذف الخطة فقط، أما الجلسات التي أُنجزت منها فتبقى في حساب المريض.", [
                        { text: "إلغاء", style: "cancel" },
                        { text: "حذف", style: "destructive", onPress: () => removePlan(plan.id) },
                      ])
                    }
                  >
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </Pressable>
                </View>
                <Text className="text-xs text-muted mt-1">
                  {done.length}/{plan.items.length} منجز • الصافي {fmtMoney(total, currency)}{f && f.discount > 0 ? ` (خصم ${fmtMoney(f.discount, currency)})` : ""} • المنجز {fmtMoney(doneCost, currency)}
                </Text>
                <View className="h-2 rounded-full bg-slate-100 mt-2 mb-3 overflow-hidden">
                  <View style={{ width: `${pct}%`, height: 8, backgroundColor: green }} />
                </View>
                <View className="flex-row items-center gap-3 mb-2">
                  <View className="flex-1">
                    <Text className="text-xs text-muted">
                      المدفوع لهذه الخطة <Text w="bold" className="text-xs" style={{ color: "#16A34A" }}>{fmtMoney(planPaid, currency)}</Text> • المتبقي من قيمتها{" "}
                      <Text w="bold" className="text-xs" style={{ color: total - planPaid > 0 ? "#DC2626" : "#16A34A" }}>{fmtMoney(Math.max(0, total - planPaid), currency)}</Text>
                    </Text>
                  </View>
                  <Button
                    small
                    label="دفعة"
                    icon="cash-outline"
                    variant="soft"
                    type="private"
                    onPress={() => {
                      setPayDate(toISO(new Date()));
                      setPayNote("");
                      pm.reset();
                      setPayFor(plan.id);
                    }}
                  />
                </View>
                {f && f.expenses > 0 ? (
                  <Text className="text-xs text-muted mb-1">
                    مصاريف الخطة {fmtMoney(f.expenses, currency)} • الربح {fmtMoney(f.profit, currency)}
                  </Text>
                ) : null}
                <View className="flex-row flex-wrap gap-2 mb-2">
                  <Button
                    small
                    label="خصم"
                    icon="pricetag-outline"
                    variant="outline"
                    onPress={() => {
                      setDiscMode("percent");
                      setDiscVal("");
                      setDiscNote("");
                      setDiscFor(plan.id);
                    }}
                  />
                  <Button
                    small
                    label="مصروف"
                    icon="flask-outline"
                    variant="outline"
                    onPress={() => {
                      em.reset();
                      setExpNote("");
                      setExpCat("lab");
                      setExpFor(plan.id);
                    }}
                  />
                  {f && f.remaining > 0 ? (
                    <Button
                      small
                      label="تقسيط المتبقي"
                      icon="calendar-outline"
                      variant="outline"
                      onPress={() => router.push({ pathname: "/clinic/installments", params: { patientId: patient.id, planId: plan.id, amount: String(Math.round(f.remaining)), title: plan.title } } as never)}
                    />
                  ) : null}
                  <Button small label="حزمة" icon="gift-outline" variant="outline" onPress={() => setPkgFor(plan.id)} />
                  <Button small label="فاتورة" icon="receipt-outline" variant="outline" onPress={() => router.push({ pathname: "/clinic/invoices", params: { patientId: patient.id, planId: plan.id } } as never)} />
                </View>
                {planPays.map((x) => (
                  <Pressable
                    key={x.id}
                    onPress={() => setEditMoney({ kind: "payment", id: x.id })}
                    className="flex-row items-center justify-between py-1"
                  >
                    <Text className="text-xs text-muted">
                      {x.date}
                      {x.note ? ` • ${x.note}` : ""}
                    </Text>
                    <Text w="semi" className="text-xs" style={{ color: "#16A34A" }}>
                      +{fmtMoney(x.amount, currency)}
                    </Text>
                  </Pressable>
                ))}

                {plan.items.map((it, n) => (
                  <View key={it.id} className="flex-row items-center gap-3 py-2 border-t border-line">
                    <Pressable
                      onPress={() => {
                        if (it.done) {
                          Alert.alert("التراجع عن الإنجاز", "ستُحذف الجلسة التي أُنشئت لهذا البند من حساب المريض.", [
                            { text: "إلغاء", style: "cancel" },
                            { text: "تراجع", style: "destructive", onPress: () => undoPlanItem(plan.id, it.id) },
                          ]);
                        } else {
                          setDoneDate(toISO(new Date()));
                          setDoneFor({ planId: plan.id, itemId: it.id });
                        }
                      }}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={it.done ? "checkmark-circle" : "ellipse-outline"}
                        size={26}
                        color={it.done ? green : "#94A3B8"}
                      />
                    </Pressable>
                    <View className="flex-1">
                      <Text w="semi" style={{ textDecorationLine: it.done ? "line-through" : "none", opacity: it.done ? 0.6 : 1 }}>
                        {n + 1}. {it.procedure}
                        {itemTeeth(it).length ? ` • سن ${itemTeeth(it).join("،")}` : it.tooth ? ` • سن ${it.tooth}` : ""}
                      </Text>
                      <Pressable
                        disabled={it.done}
                        onPress={() => setCostEdit({ itemId: it.id, text: it.cost ? String(Math.round(it.cost)) : "", disc: it.discount ? String(Math.round(it.discount)) : "", note: it.discountNote ?? "", done: it.done })}
                        hitSlop={6}
                      >
                        <Text className="text-xs text-muted">
                          {it.discount ? `${fmtMoney(it.cost, currency)} − ${fmtMoney(it.discount, currency)} = ` : ""}
                          {fmtMoney(itemNet(it), currency)}
                          {!it.done ? " ✎" : ""}
                          {it.dueOn && !it.done ? ` • مستهدف ${it.dueOn}` : ""}
                          {it.discountNote ? ` • ${it.discountNote}` : ""}
                        </Text>
                      </Pressable>
                      {(() => {
                        const st = f?.items.get(it.id);
                        if (!st || itemNet(it) <= 0) return null;
                        return (
                          <View className="self-start rounded-full px-2 py-0.5 mt-1" style={{ backgroundColor: PAY_COLOR[st.status].bg }}>
                            <Text w="semi" className="text-[11px]" style={{ color: PAY_COLOR[st.status].fg }}>
                              {PAY_LABEL[st.status]}
                              {st.status === "partial" ? ` ${fmtMoney(st.paid, currency)}` : ""}
                            </Text>
                          </View>
                        );
                      })()}
                    </View>
                    {!it.done ? (
                      <Pressable
                        hitSlop={10}
                        onPress={() => router.push({ pathname: "/clinic/appointment-form", params: { patientId: patient.id, planItemIds: it.id, teeth: itemTeeth(it).join(","), procedure: it.procedure, ...(it.dueOn ? { date: it.dueOn } : {}) } })}
                      >
                        <Ionicons name="calendar-outline" size={20} color={green} />
                      </Pressable>
                    ) : null}
                    {!it.done ? (
                      <Pressable hitSlop={10} onPress={() => removePlanItem(plan.id, it.id)}>
                        <Ionicons name="close" size={18} color="#94A3B8" />
                      </Pressable>
                    ) : null}
                  </View>
                ))}
                <View className="mt-2">
                  <Button
                    label="إضافة بند"
                    icon="add"
                    variant="soft"
                    small
                    onPress={() => {
                      setItemFor(plan.id);
                      setProc("");
                      setTeethSel([]);
                      setCost("");
                    }}
                  />
                </View>
              </Card>
            );
          })
        )}
      </View>

      <Sheet visible={newOpen} onClose={() => setNewOpen(false)} title="خطة جديدة">
        <Field label="عنوان الخطة" value={title} onChangeText={setTitle} placeholder="مثال: تأهيل الفك العلوي" />
        <Button label="إنشاء وإضافة البنود" icon="arrow-forward" type="private" onPress={createPlan} />
      </Sheet>

      <Sheet visible={!!itemFor} onClose={() => setItemFor(null)} title="بند جديد">
        <FieldRow label="إجراء شائع">
          <View className="flex-row flex-wrap gap-2">
            {procedures.slice(0, 10).map((p) => (
              <Chip key={p.name} label={p.name} selected={proc === p.name} color={green} onPress={() => setProc(p.name)} />
            ))}
          </View>
        </FieldRow>
        <Field label="الإجراء" value={proc} onChangeText={setProc} />
        <Odontogram
          teeth={patient.teeth}
          selected={teethSel[teethSel.length - 1]}
          highlight={teethSel}
          onSelect={(t) => setTeethSel((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))}
          birthYear={patient.birthYear}
          dentition={patient.dentition}
          onDentitionChange={(d) => updatePatient(patient.id, { dentition: d })}
          marks={patient.toothMarks}
          bridges={patient.bridges}
        />
        <Text className="text-xs text-muted my-2">
          {teethSel.length ? `الأسنان: ${teethSel.join("،")} — يُنشأ بند لكل سن` : "اختر الأسنان من المخطط (اختياري)"}
        </Text>
        <Field label={`التكلفة لكل سن (${currency}) — فارغ = من قائمة الأسعار`} value={cost} onChangeText={setCost} keyboardType="decimal-pad" />
        <Button label="إضافة" icon="checkmark" type="private" onPress={saveItem} />
      </Sheet>

      <Sheet visible={!!doneFor} onClose={() => setDoneFor(null)} title="إنجاز البند">
        <Text className="text-sm text-muted mb-3">
          سيُضاف هذا البند كجلسة في حساب المريض بتكلفته، ويُحتسب في المستحق.
        </Text>
        <DateField label="تاريخ الجلسة" value={doneDate} onChange={setDoneDate} />
        <Button
          label="تأكيد الإنجاز"
          icon="checkmark-done"
          type="private"
          onPress={() => {
            if (doneFor) completePlanItem(doneFor.planId, doneFor.itemId, doneDate);
            setDoneFor(null);
          }}
        />
      </Sheet>
      <EditMoneySheet target={editMoney} onClose={() => setEditMoney(null)} />

      <Sheet visible={!!payFor} onClose={() => setPayFor(null)} title="دفعة لهذه الخطة">
        <MoneyField label="المبلغ" m={pm} autoFocus />
        <DateField label="تاريخ الدفعة" value={payDate} onChange={setPayDate} />
        <Field label="ملاحظة" value={payNote} onChangeText={setPayNote} />
        <Button label="حفظ الدفعة" icon="checkmark" type="private" onPress={savePayment} />
      </Sheet>

      <Sheet visible={!!pkgFor} onClose={() => setPkgFor(null)} title="إضافة حزمة للخطة">
        {packages.length === 0 ? (
          <Text className="text-xs text-muted leading-5">لا حزم بعد. أنشئها من الأسعار ← «حزمة جديدة».</Text>
        ) : (
          packages.map((pk) => (
            <Pressable key={pk.id} onPress={() => addPackageToPlan(pk)} className="flex-row items-center justify-between py-3 border-b border-line">
              <View className="flex-1 pe-2">
                <Text w="semi">{pk.name}</Text>
                <Text className="text-xs text-muted">{pk.procedures.join(" + ")}</Text>
              </View>
              <Text w="bold" style={{ color: green }}>{fmtMoney(pk.price, currency)}</Text>
            </Pressable>
          ))
        )}
      </Sheet>

      <Sheet visible={!!discFor} onClose={() => setDiscFor(null)} title="خصم على الخطة">
        <Text className="text-xs text-muted mb-2">يُوزَّع بالتناسب على البنود غير المنجزة فقط، ويظهر على كل بند.</Text>
        <View className="flex-row gap-2 mb-3">
          <Chip label="نسبة ٪" selected={discMode === "percent"} color={green} onPress={() => setDiscMode("percent")} />
          <Chip label={`مبلغ (${currency})`} selected={discMode === "amount"} color={green} onPress={() => setDiscMode("amount")} />
        </View>
        <Field label={discMode === "percent" ? "النسبة ٪" : `المبلغ (${currency})`} value={discVal} onChangeText={setDiscVal} keyboardType="decimal-pad" autoFocus />
        <Field label="سبب الخصم" value={discNote} onChangeText={setDiscNote} placeholder="مثال: زميل / قريب / عرض" />
        <Button label="تطبيق الخصم" icon="checkmark" type="private" onPress={applyPlanDiscount} />
      </Sheet>

      <Sheet visible={!!expFor} onClose={() => setExpFor(null)} title="مصروف على هذه الخطة">
        <FieldRow label="النوع">
          <View className="flex-row flex-wrap gap-2">
            {(Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).map((k) => (
              <Chip key={k} label={EXPENSE_CATEGORIES[k]} selected={expCat === k} color={green} onPress={() => setExpCat(k)} />
            ))}
          </View>
        </FieldRow>
        <MoneyField label="المبلغ" m={em} />
        <Field label="ملاحظة" value={expNote} onChangeText={setExpNote} placeholder="مثال: أجرة مخبر تاج" />
        <Button label="حفظ المصروف" icon="checkmark" type="private" onPress={saveExpense} />
      </Sheet>

      <Sheet visible={!!costEdit} onClose={() => setCostEdit(null)} title="تكلفة البند">
        <Field label={`التكلفة (${currency})`} value={costEdit?.text ?? ""} onChangeText={(v) => setCostEdit((c) => (c ? { ...c, text: v } : c))} keyboardType="decimal-pad" autoFocus />
        <Field label={`خصم على البند (${currency}) — اختياري`} value={costEdit?.disc ?? ""} onChangeText={(v) => setCostEdit((c) => (c ? { ...c, disc: v } : c))} keyboardType="decimal-pad" />
        <Field label="سبب الخصم" value={costEdit?.note ?? ""} onChangeText={(v) => setCostEdit((c) => (c ? { ...c, note: v } : c))} />
        <Button
          label="حفظ"
          icon="checkmark"
          type="private"
          onPress={() => {
            if (costEdit) {
              const cost = parseAmount(costEdit.text);
              const disc = Math.min(cost, parseAmount(costEdit.disc));
              patchPlanItem(costEdit.itemId, { cost, discount: disc > 0 ? disc : undefined, discountNote: disc > 0 && costEdit.note.trim() ? costEdit.note.trim() : undefined });
            }
            setCostEdit(null);
          }}
        />
      </Sheet>
      <PlanWizard visible={wizardOpen} patientId={patient.id} onClose={() => setWizardOpen(false)} />
    </Screen>
  );
}
