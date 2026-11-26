import { useMemo, useState } from "react";
import { Alert, Linking, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { useRouter } from "expo-router";
import { Field } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { initial } from "@/lib/format";
import { activeTypes, PATIENT_TYPES } from "@/lib/patientType";
import { dueFollowUps, periodLabel, RULE_TEMPLATES, type RuleTemplate } from "@/lib/periodic";
import { uid } from "@/lib/id";
import { useExtras } from "@/store/useExtras";
import type { FollowUpRule, Patient } from "@/types";
import { Card } from "@/components/ui/Card";
import { Chip, Segmented } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { useTheme } from "@/hooks/useTheme";
import { addDays, fmtDateFull, fmtTime, todayISO } from "@/lib/dates";
import { appointmentsOn, recallCandidates } from "@/lib/followups";
import { whatsappLink } from "@/lib/phone";
import { useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";

type Tab = "remind" | "recall" | "periodic";

/** تذكير مواعيد يوم معيّن واستدعاء المرضى الغائبين، برسائل واتساب جاهزة */
export default function FollowupsScreen() {
  useTheme();
  const patients = useClinic((s) => s.patients);
  const appointments = useClinic((s) => s.appointments);
  const sessions = useClinic((s) => s.sessions);
  const updateAppointment = useClinic((s) => s.updateAppointment);
  const updatePatient = useClinic((s) => s.updatePatient);
  const clinicName = useSettings((s) => s.clinicName);

  const router = useRouter();
  const plans = useClinic((s) => s.plans);
  const labOrders = useExtras((s) => s.labOrders);
  const orthoCases = useExtras((s) => s.orthoCases);
  const [tab, setTab] = useState<Tab>("periodic");
  const [pWindow, setPWindow] = useState(14);
  const [pView, setPView] = useState<"due" | "all">("due");
  const [ruleFor, setRuleFor] = useState<Patient | null>(null);
  const [rq, setRq] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [customDays, setCustomDays] = useState("");
  const [offset, setOffset] = useState(1); // 0 اليوم، 1 غدًا، 2 بعد غد
  const [months, setMonths] = useState(6);

  const green = TYPE_META.private.hex;
  const sign = clinicName ? ` — ${clinicName}` : "";
  const date = addDays(todayISO(), offset);

  const appts = useMemo(() => appointmentsOn(appointments, date), [appointments, date]);
  const recall = useMemo(
    () => recallCandidates(patients, sessions, appointments, months),
    [patients, sessions, appointments, months],
  );
  const pat = (id: string) => patients.find((p) => p.id === id);

  const due = useMemo(
    () => dueFollowUps({ patients, sessions, appointments, today: todayISO(), windowDays: pWindow }),
    [patients, sessions, appointments, pWindow],
  );
  const allRules = useMemo(() => {
    const rows: { patient: Patient; rule: FollowUpRule }[] = [];
    for (const p of patients) for (const rule of p.followUps ?? []) rows.push({ patient: p, rule });
    return rows;
  }, [patients]);
  /** مرضى لهم نوع فعّال (تقويم/زرع/أطفال) بلا قاعدة متابعة مناسبة: اقتراح بضغطة */
  const suggestions = useMemo(() => {
    const out: { patient: Patient; tpl: RuleTemplate }[] = [];
    for (const p of patients) {
      if (p.status !== "active") continue;
      const types = activeTypes({ patient: p, plans, sessions, appointments, labOrders, orthoCases });
      for (const tpl of RULE_TEMPLATES) {
        if (!tpl.types || !tpl.types.some((t) => types.includes(t))) continue;
        if ((p.followUps ?? []).some((r) => r.label === tpl.label)) continue;
        out.push({ patient: p, tpl });
      }
    }
    return out.slice(0, 8);
  }, [patients, plans, sessions, appointments, labOrders, orthoCases]);

  const addRule = (p: Patient, label: string, everyDays: number, matchSource?: string) => {
    if (!label.trim() || !(everyDays > 0)) return Alert.alert("بيانات ناقصة", "اكتب اسم المتابعة والمدة بالأيام.");
    const rule: FollowUpRule = { id: uid(), label: label.trim(), everyDays: Math.round(everyDays), matchSource, anchor: todayISO(), active: true };
    updatePatient(p.id, { followUps: [...(p.followUps ?? []), rule] });
    setRuleFor(null);
    setRq("");
    setCustomLabel("");
    setCustomDays("");
  };
  const patchRule = (p: Patient, id: string, patch: Partial<FollowUpRule> | null) =>
    updatePatient(p.id, { followUps: (p.followUps ?? []).flatMap((r) => (r.id !== id ? [r] : patch ? [{ ...r, ...patch }] : [])) });

  const open = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("تعذّر فتح واتساب", "تأكد من تثبيت واتساب على الهاتف.");
    }
  };

  const sendReminder = (id: string) => {
    const a = appointments.find((x) => x.id === id);
    const p = a && pat(a.patientId);
    if (!a || !p?.phone) return;
    const text = `السلام عليكم ${p.name}، تذكير بموعدك في العيادة ${fmtDateFull(a.date)} الساعة ${fmtTime(a.startTime)} (${a.procedure}). نرجو التأكيد. شكرًا${sign}.`;
    updateAppointment(a.id, { remindedAt: Date.now() });
    open(whatsappLink(p.phone, text));
  };

  const sendRecall = (id: string) => {
    const p = pat(id);
    if (!p?.phone) return;
    const text = `السلام عليكم ${p.name}، نطمئن عليك ونذكّرك أن موعد فحصك الدوري قد حان. يسعدنا ترتيب موعد يناسبك. شكرًا${sign}.`;
    updatePatient(p.id, { recalledAt: Date.now() });
    open(whatsappLink(p.phone, text));
  };

  const nextUnsent = () => {
    const a = appts.find((x) => !x.remindedAt && pat(x.patientId)?.phone);
    if (!a) return Alert.alert("اكتمل", "لا مواعيد أخرى تنتظر التذكير.");
    sendReminder(a.id);
  };

  const pending = appts.filter((a) => !a.remindedAt && pat(a.patientId)?.phone).length;

  return (
    <Screen title="التذكير والمتابعة" subtitle="رسائل واتساب جاهزة" back>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "periodic", label: "متابعة دورية" },
          { value: "remind", label: "تذكير" },
          { value: "recall", label: "استدعاء" },
        ]}
      />

      {tab === "periodic" ? (
        <View className="mt-4">
          <View className="flex-row gap-2 mb-3">
            <Chip label="المستحقة" selected={pView === "due"} color={green} onPress={() => setPView("due")} />
            <Chip label={`كل القواعد (${allRules.length})`} selected={pView === "all"} color={green} onPress={() => setPView("all")} />
          </View>

          {pView === "due" ? (
            <View>
              <View className="flex-row gap-2 mb-3">
                {[7, 14, 30].map((d) => (
                  <Chip key={d} label={`${d} يومًا`} selected={pWindow === d} color={green} onPress={() => setPWindow(d)} />
                ))}
              </View>
              {due.length === 0 ? (
                <EmptyState icon="checkmark-circle-outline" title="لا متابعات مستحقة" hint={`لا شيء خلال ${pWindow} يومًا. أضف قواعد من «كل القواعد».`} />
              ) : (
                due.map((d) => (
                  <Card key={d.key} accent="private" className="mb-3">
                    <View className="flex-row items-center gap-3">
                      <View className="w-10 h-10 rounded-full bg-private-soft items-center justify-center">
                        <Text w="bold" className="text-private-ink">
                          {initial(d.patient.name)}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text w="bold">{d.patient.name}</Text>
                        <Text className="text-xs text-muted">
                          {d.rule.label} • {periodLabel(d.rule.everyDays)} • آخر مرة {d.last}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs mt-2" style={{ color: d.daysLeft < 0 ? "#DC2626" : "#64748B" }}>
                      {d.daysLeft < 0 ? `متأخر ${-d.daysLeft} يومًا` : d.daysLeft === 0 ? "مستحق اليوم" : `بعد ${d.daysLeft} أيام`}
                      {d.hasUpcoming ? " • لديه موعد قادم" : ""}
                    </Text>
                    <View className="flex-row flex-wrap gap-2 mt-3">
                      {!d.hasUpcoming ? (
                        <Chip
                          label="احجز"
                          icon="calendar"
                          color={green}
                          selected
                          onPress={() => router.push({ pathname: "/clinic/appointment-form", params: { patientId: d.patient.id, procedure: d.rule.label, date: d.due > todayISO() ? d.due : todayISO() } })}
                        />
                      ) : null}
                      {d.patient.phone ? (
                        <Chip
                          label="واتساب"
                          icon="logo-whatsapp"
                          color="#16A34A"
                          onPress={() => open(whatsappLink(d.patient.phone!, `السلام عليكم ${d.patient.name}، حان موعد ${d.rule.label}. يسعدنا ترتيب موعد يناسبك.${sign}`))}
                        />
                      ) : null}
                      <Chip label="تأجيل أسبوع" icon="time-outline" onPress={() => patchRule(d.patient, d.rule.id, { anchor: addDays(todayISO(), 7 - d.rule.everyDays) })} />
                    </View>
                  </Card>
                ))
              )}

              {suggestions.length ? (
                <View className="mt-2">
                  <Text w="semi" className="mb-2">
                    اقتراحات حسب نوع المريض
                  </Text>
                  {suggestions.map((x) => (
                    <View key={`${x.patient.id}:${x.tpl.label}`} className="flex-row items-center gap-3 bg-surface border border-line rounded-2xl px-3 py-2.5 mb-2">
                      <View className="flex-1">
                        <Text w="semi">{x.patient.name}</Text>
                        <Text className="text-xs text-muted">
                          {x.tpl.label} {periodLabel(x.tpl.everyDays)}
                        </Text>
                      </View>
                      <Chip label="تفعيل" icon="add" color={green} onPress={() => addRule(x.patient, x.tpl.label, x.tpl.everyDays, x.tpl.matchSource)} />
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : (
            <View>
              <Button label="قاعدة متابعة جديدة" icon="add" type="private" onPress={() => setRuleFor({ id: "", name: "", status: "active", teeth: {}, createdAt: 0 })} />
              <View className="mt-3">
                {allRules.length === 0 ? (
                  <EmptyState icon="repeat-outline" title="لا قواعد بعد" hint="مثال: تقويم كل 5 أسابيع، تنظيف كل 6 أشهر" />
                ) : (
                  allRules.map(({ patient, rule }) => (
                    <Card key={`${patient.id}:${rule.id}`} className="mb-2.5">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text w="bold">{patient.name}</Text>
                          <Text className="text-sm text-muted">
                            {rule.label} • {periodLabel(rule.everyDays)}
                            {rule.active ? "" : " • موقوفة"}
                          </Text>
                        </View>
                        <Chip label={rule.active ? "إيقاف" : "تفعيل"} onPress={() => patchRule(patient, rule.id, { active: !rule.active })} />
                        <Pressable
                          hitSlop={10}
                          className="ms-3"
                          onPress={() =>
                            Alert.alert("حذف القاعدة", "تُحذف القاعدة فقط، ولا يتأثر سجل المريض.", [
                              { text: "إلغاء", style: "cancel" },
                              { text: "حذف", style: "destructive", onPress: () => patchRule(patient, rule.id, null) },
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
        </View>
      ) : null}

      {tab === "remind" ? (
        <View className="mt-4">
          <View className="flex-row gap-2 mb-3">
            {[
              { v: 0, l: "اليوم" },
              { v: 1, l: "غدًا" },
              { v: 2, l: "بعد غد" },
            ].map((x) => (
              <Chip key={x.v} label={x.l} selected={offset === x.v} color={green} onPress={() => setOffset(x.v)} />
            ))}
          </View>
          <Text className="text-sm text-muted mb-3">{fmtDateFull(date)}</Text>

          {appts.length > 0 ? (
            <View className="mb-3">
              <Button
                label={pending > 0 ? `إرسال التالي (${pending} متبقٍ)` : "تم تذكير الجميع"}
                icon="logo-whatsapp"
                type="private"
                disabled={pending === 0}
                onPress={nextUnsent}
              />
              <Text className="text-xs text-muted mt-1.5">
                يفتح واتساب برسالة جاهزة للمريض التالي. أرسلها ثم ارجع للتطبيق واضغط التالي.
              </Text>
            </View>
          ) : null}

          {appts.length === 0 ? (
            <EmptyState icon="calendar-outline" title="لا مواعيد مجدولة" hint="لا مواعيد بحالة «مجدول» في هذا اليوم" />
          ) : (
            appts.map((a) => {
              const p = pat(a.patientId);
              return (
                <Card key={a.id} className="mb-2.5">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text w="bold">{p?.name ?? "—"}</Text>
                      <Text className="text-sm text-muted">
                        {fmtTime(a.startTime)} • {a.procedure}
                      </Text>
                      {!p?.phone ? <Text className="text-xs text-red-600">لا رقم هاتف</Text> : null}
                    </View>
                    {a.remindedAt ? (
                      <View className="flex-row items-center gap-1 me-2">
                        <Ionicons name="checkmark-done" size={18} color={green} />
                        <Text className="text-xs" style={{ color: green }}>
                          فُتحت المحادثة
                        </Text>
                      </View>
                    ) : null}
                    <Pressable
                      disabled={!p?.phone}
                      onPress={() => sendReminder(a.id)}
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{ backgroundColor: p?.phone ? TYPE_META.private.soft : "#F1F5F9" }}
                    >
                      <Ionicons name="logo-whatsapp" size={20} color={p?.phone ? green : "#94A3B8"} />
                    </Pressable>
                  </View>
                </Card>
              );
            })
          )}
        </View>
      ) : (
        <View className="mt-4">
          <Text className="text-sm text-muted mb-2">مرضى لم يزوروا منذ:</Text>
          <View className="flex-row gap-2 mb-3">
            {[3, 6, 12].map((m) => (
              <Chip key={m} label={`${m} أشهر`} selected={months === m} color={green} onPress={() => setMonths(m)} />
            ))}
          </View>
          <Text className="text-xs text-muted mb-3">
            يظهر من له رقم هاتف ولا موعد قادم له. من راسلته يختفي 30 يومًا حتى لا تكرر الرسالة.
          </Text>

          {recall.length === 0 ? (
            <EmptyState icon="happy-outline" title="لا أحد للاستدعاء" hint="كل مرضاك زاروك مؤخرًا أو لهم موعد قادم" />
          ) : (
            recall.map((r) => (
              <Card key={r.patient.id} className="mb-2.5">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text w="bold">{r.patient.name}</Text>
                    <Text className="text-sm text-muted">
                      آخر زيارة {r.last} • منذ {r.daysSince >= 60 ? `${Math.round(r.daysSince / 30)} أشهر` : `${r.daysSince} يومًا`}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => sendRecall(r.patient.id)}
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: TYPE_META.private.soft }}
                  >
                    <Ionicons name="logo-whatsapp" size={20} color={green} />
                  </Pressable>
                </View>
              </Card>
            ))
          )}
        </View>
      )}
      <Sheet visible={!!ruleFor} onClose={() => setRuleFor(null)} title="قاعدة متابعة جديدة">
        {ruleFor && !ruleFor.id ? (
          <View>
            <Field value={rq} onChangeText={setRq} placeholder="ابحث بالاسم أو الهاتف" />
            {patients
              .filter((p) => !rq.trim() || p.name.includes(rq.trim()) || (p.phone ?? "").includes(rq.trim()))
              .slice(0, 12)
              .map((p) => (
                <Pressable key={p.id} onPress={() => setRuleFor(p)} className="flex-row items-center gap-3 py-2 border-b border-line">
                  <View className="w-8 h-8 rounded-full bg-private-soft items-center justify-center">
                    <Text w="bold" className="text-private-ink">
                      {initial(p.name)}
                    </Text>
                  </View>
                  <Text w="semi">{p.name}</Text>
                </Pressable>
              ))}
          </View>
        ) : ruleFor ? (
          <View>
            <Text w="bold" className="mb-2">
              {ruleFor.name}
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {RULE_TEMPLATES.map((t) => (
                <Chip key={t.label} label={`${t.label} ${periodLabel(t.everyDays)}`} color={green} onPress={() => addRule(ruleFor, t.label, t.everyDays, t.matchSource)} />
              ))}
            </View>
            <Text className="text-xs text-muted mb-2">أو قاعدة مخصّصة:</Text>
            <Field label="اسم المتابعة" value={customLabel} onChangeText={setCustomLabel} placeholder="مثال: فحص زرعة" />
            <Field label="كل كم يومًا" value={customDays} onChangeText={setCustomDays} keyboardType="number-pad" placeholder="مثال: 90" />
            <Button label="إضافة" icon="checkmark" type="private" onPress={() => addRule(ruleFor, customLabel, Number(customDays), customLabel.trim() || undefined)} />
            <Text className="text-xs text-muted mt-2">
              أنواع المريض الفعّالة: {activeTypes({ patient: ruleFor, plans, sessions, appointments, labOrders, orthoCases }).map((k) => PATIENT_TYPES[k].label).join("، ") || "—"}
            </Text>
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}
