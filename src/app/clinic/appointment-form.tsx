import { useTheme } from "@/hooks/useTheme";
import { TYPE_META } from "@/constants/shiftTypes";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DateField, TimeField } from "@/components/pickers";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { DictateField } from "@/components/DictateField";
import { MedicalAlertBar, WarningLines } from "@/components/clinic/MedicalAlertBar";
import { useEndoPlanPrompt } from "@/components/clinic/PlanWizard";
import { ApptTeethSection } from "@/components/clinic/ApptTeethSection";
import { ApptPlanSection, costFor } from "@/components/clinic/ApptPlanSection";
import { MoneyField, useMoneyInput } from "@/components/MoneyField";
import { ApptTypeSettings } from "@/components/clinic/ApptTypeSettings";
import { PatientStatusHeader } from "@/components/clinic/PatientStatusHeader";
import { usePatientTypes } from "@/hooks/usePatientTypes";
import { findOpenFor, isPlanProcedure, itemTeeth, itemsForTeeth, openItems, priceForProcedure, type OpenItem } from "@/lib/clinicLink";
import { hasOpenEndoPlan } from "@/lib/planWizard";
import { isEndoProcedure } from "@/lib/patientType";
import { Field, FieldRow } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { DURATIONS, STATUS_META } from "@/constants/clinic";
import { useAgendaInput } from "@/hooks/useAgenda";
import { describeClash, findClashes } from "@/lib/conflicts";
import { patientFlags, procedureWarnings } from "@/lib/alerts";
import { fmtTime, minutesToTime, toMinutes, todayISO } from "@/lib/dates";
import { initial } from "@/lib/format";
import { useClinic } from "@/store/useClinic";
import { useExtras } from "@/store/useExtras";
import { useSettings } from "@/store/useSettings";
import { useApptDraft } from "@/store/useApptDraft";
import type { ApptExtra, AppointmentStatus } from "@/types";
import { useProcedures } from "@/hooks/useProcedures";


export default function AppointmentFormScreen() {
  const procedures = useProcedures();
  useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    patientId?: string;
    date?: string;
    procedure?: string;
    startTime?: string;
    waitId?: string;
    /** معرّفات بنود الخطة مفصولة بفواصل (من «يحتاجون موعدًا» أو شاشة الخطة) */
    planItemIds?: string;
    /** أسنان مفصولة بفواصل */
    teeth?: string;
  }>();

  const patients = useClinic((s) => s.patients);
  const appointments = useClinic((s) => s.appointments);
  const plans = useClinic((s) => s.plans);
  const addAppointment = useClinic((s) => s.addAppointment);
  const updateAppointment = useClinic((s) => s.updateAppointment);
  const removeAppointment = useClinic((s) => s.removeAppointment);
  const addWait = useExtras((s) => s.addWait);
  const priceList = useExtras((s) => s.priceList);
  const usdRate = useSettings((s) => s.usdRate);
  const endoPrompt = useEndoPlanPrompt();
  const setWaitStatus = useExtras((s) => s.setWaitStatus);

  const existing = params.id ? appointments.find((a) => a.id === params.id) : undefined;

  const [patientId, setPatientId] = useState<string | undefined>(existing?.patientId ?? params.patientId);
  // التاريخ والوقت يُحدَّدان صراحةً عند تثبيت الموعد (لا قيم افتراضية)
  const [date, setDate] = useState<string | undefined>(existing?.date ?? params.date);
  const [startTime, setStartTime] = useState<string | undefined>(existing?.startTime ?? params.startTime);
  const [duration, setDuration] = useState(existing?.durationMin ?? 30);
  const [procedure, setProcedure] = useState(existing?.procedure ?? params.procedure ?? "كشف واستشارة");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [status, setStatus] = useState<AppointmentStatus>(existing?.status ?? "scheduled");
  const [pickOpen, setPickOpen] = useState(false);
  const [q, setQ] = useState("");
  const [teeth, setTeeth] = useState<string[]>(existing?.teeth ?? (params.teeth ? params.teeth.split(",").filter(Boolean) : []));
  const [linked, setLinked] = useState<string[]>(existing?.planItemIds ?? (params.planItemIds ? params.planItemIds.split(",").filter(Boolean) : []));
  const [extra, setExtra] = useState<ApptExtra>(existing?.extra ?? {});
  const currency = useSettings((s) => s.currency);
  /** الخطة المستهدفة للبنود الجديدة: معرّف خطة أو "new"؛ الافتراضي أحدث خطة للمريض */
  const [planChoice, setPlanChoice] = useState<string | undefined>();
  /** تكلفة يدوية لكل سن (تتقدّم على قائمة الأسعار) */
  const [costs, setCosts] = useState<Record<string, string>>({});
  /** دفعة مقدّمة اختيارية عند الحجز */
  const advance = useMoneyInput();

  // مسودة الحجز: تُحفظ أثناء الكتابة (موعد جديد فقط) وتُعرض للاستعادة عند فتح نموذج فارغ
  const draft = useApptDraft((s) => s.draft);
  const setDraft = useApptDraft((s) => s.setDraft);
  const clearDraft = useApptDraft((s) => s.clearDraft);
  const draftReady = useRef(false);
  useEffect(() => {
    const plain = !existing && !params.patientId && !params.planItemIds && !params.teeth && !params.date && !params.procedure && !params.waitId;
    const fresh = draft && Date.now() - draft.savedAt < 36 * 3600 * 1000;
    if (!plain || !fresh || !draft) {
      draftReady.current = true;
      return;
    }
    Alert.alert("مسودة حجز غير محفوظة", "هل تريد استعادة آخر حجز لم تكمله؟", [
      { text: "تجاهل", style: "destructive", onPress: () => { clearDraft(); draftReady.current = true; } },
      {
        text: "استعادة",
        onPress: () => {
          setPatientId(draft.patientId);
          setDate(draft.date);
          setStartTime(draft.startTime);
          setDuration(draft.duration);
          setProcedure(draft.procedure);
          setNotes(draft.notes);
          setStatus(draft.status);
          setTeeth(draft.teeth);
          setLinked(draft.linked);
          setExtra(draft.extra);
          setPlanChoice(draft.planChoice);
          setCosts(draft.costs);
          draftReady.current = true;
        },
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (existing || !draftReady.current) return;
    if (!patientId && !teeth.length && !notes.trim() && !linked.length) return;
    const t = setTimeout(() => setDraft({ savedAt: Date.now(), patientId, date, startTime, duration, procedure, notes, status, teeth, linked, extra, planChoice, costs }), 600);
    return () => clearTimeout(t);
  }, [existing, patientId, date, startTime, duration, procedure, notes, status, teeth, linked, extra, planChoice, costs, setDraft]);

  const patient = patients.find((p) => p.id === patientId);
  const list = useMemo(
    () => patients.filter((p) => !q.trim() || p.name.includes(q.trim()) || (p.phone ?? "").includes(q.trim())),
    [patients, q],
  );

  const endTime = startTime ? minutesToTime(toMinutes(startTime) + duration) : undefined;

  const agendaInput = useAgendaInput();
  /** تعارضات مع المواعيد والدوام والمناوبات */
  const findConflicts = () => (!date || !startTime ? [] : findClashes(date, startTime, duration, agendaInput, { appointmentId: existing?.id }));

  const doSave = () => {
    const proc = procOf();
    const st = useClinic.getState();
    const done = !!existing && (existing.status === "done" || !!existing.visitDone);
    const changed = !existing || existing.procedure !== proc || (existing.teeth ?? []).join() !== teeth.join();
    const wizardNeeded = isEndoProcedure(proc) && !hasOpenEndoPlan(st.plans, patientId!, isEndoProcedure);

    // 1) بنود الخطة: ما اختاره المستخدم + بند لكل سن محدد لا بند مفتوحًا له (التكلفة المكتوبة وإلا من قائمة الأسعار)
    const ids = new Set(linked);
    const unit = priceForProcedure(proc, priceList, usdRate);
    const hasPlans = st.plans.some((p) => p.patientId === patientId);
    let target: string | undefined = planSel !== "new" ? planSel : undefined;
    if (planSel === "new" && hasPlans) target = st.addPlan(patientId!, "خطة علاج", []);
    if (!done && changed && isPlanProcedure(proc) && !wizardNeeded) {
      const fresh = openItems(st.plans, patientId!);
      const toCreate: ReturnType<typeof itemsForTeeth> = [];
      for (const t of teeth) {
        const ex = findOpenFor(fresh, proc, t);
        if (ex) ids.add(ex.item.id);
        else if (!linked.some((id) => fresh.some((o) => o.item.id === id && itemTeeth(o.item).includes(t)))) toCreate.push(...itemsForTeeth(proc, [t], priceList, usdRate).map((it) => ({ ...it, cost: costFor(t, costs, unit) })));
      }
      if (!teeth.length && ids.size === 0 && !existing && !st.plans.some((p) => p.patientId === patientId) && !/كشف|استشار|مراجعة|متابعة|فحص/.test(proc)) {
        toCreate.push(...itemsForTeeth(proc, [], priceList, usdRate));
      }
      if (toCreate.length) for (const id of st.addPlanItems(patientId!, toCreate, target)) ids.add(id);
    }

    const payload = {
      patientId: patientId!,
      date: date!,
      startTime: startTime!,
      durationMin: duration,
      procedure: proc,
      notes: notes.trim() || undefined,
      planItemIds: ids.size ? [...ids] : undefined,
      teeth: teeth.length ? teeth : undefined,
      extra: Object.keys(extra).length ? extra : undefined,
    };
    let apptId: string;
    if (existing) {
      updateAppointment(existing.id, { ...payload, status });
      apptId = existing.id;
    } else {
      apptId = addAppointment(payload);
      clearDraft();
      // دفعة مقدّمة (إن كُتبت): تُربط بخطة العلاج التي ضُمّت إليها بنود الموعد
      const adv = advance.value > 0 ? advance.result() : null;
      if (adv) {
        const first = [...ids][0];
        const planOfFirst = first ? useClinic.getState().plans.find((p) => p.items.some((i) => i.id === first))?.id : undefined;
        useClinic.getState().addPayment({
          patientId: patientId!,
          date: todayISO(),
          amount: adv.amount,
          foreign: adv.foreign,
          note: "دفعة عند الحجز",
          planId: planOfFirst ?? target,
        });
      }
      // حُجز من قائمة الانتظار: يُعلَّم محجوزًا الآن فقط (بعد حفظ الموعد فعلًا)
      if (params.waitId) setWaitStatus(params.waitId, "booked");
    }
    // معالجة لبية بلا خطة مفتوحة: معالج الأسئلة يبني الخطة، ثم نربط الموعد بها ونرجع
    if (changed && endoPrompt.check(payload.patientId, proc, teeth[0], () => { linkEndoAfterWizard(apptId, payload.patientId); router.back(); })) return;
    router.back();
  };

  const { detected, types } = usePatientTypes(patientId);
  const opens = useMemo(() => (patientId ? openItems(plans, patientId) : []), [plans, patientId]);
  const patientPlans = useMemo(() => plans.filter((p) => p.patientId === patientId), [plans, patientId]);
  const planSel = planChoice && (planChoice === "new" || patientPlans.some((p) => p.id === planChoice)) ? planChoice : patientPlans[0]?.id ?? "new";
  const procOf = () => procedure.trim() || "كشف واستشارة";

  const toggleTooth = (t: string) => setTeeth((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  const toggleItem = (o: OpenItem) => {
    if (linked.includes(o.item.id)) {
      setLinked(linked.filter((x) => x !== o.item.id));
      return;
    }
    setLinked([...linked, o.item.id]);
    const tt = itemTeeth(o.item);
    setTeeth((cur) => [...cur, ...tt.filter((t) => !cur.includes(t))]);
    if (!linked.length) {
      setProcedure(o.item.procedure);
      const def = procedures.find((p) => p.name === o.item.procedure);
      if (def) setDuration(def.minutes);
    }
  };

  /** بنود ستُنشأ في الخطة عند الحفظ (سنّ لكل بند) — تُعرض كمعاينة ولا تتكرر إن وُجد بند مفتوح مطابق */
  const willCreate = useMemo(() => {
    const proc = procOf();
    if (!patientId || !isPlanProcedure(proc) || !teeth.length) return [];
    if (isEndoProcedure(proc) && !hasOpenEndoPlan(plans, patientId, isEndoProcedure)) return [];
    const linkedTeeth = new Set(linked.flatMap((id) => opens.filter((o) => o.item.id === id).flatMap((o) => itemTeeth(o.item))));
    return teeth.filter((t) => !linkedTeeth.has(t) && !findOpenFor(opens, proc, t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, procedure, teeth, linked, opens, plans]);
  const unitCost = priceForProcedure(procOf(), priceList, usdRate);

  /** يربط الموعد بعد معالج العصب ببند العصب المفتوح الناتج عنه */
  const linkEndoAfterWizard = (apptId: string, pid: string) => {
    const st = useClinic.getState();
    const cand = openItems(st.plans, pid).filter((o) => isEndoProcedure(o.item.procedure));
    const pick = cand.find((o) => itemTeeth(o.item).some((t) => teeth.includes(t))) ?? cand[0];
    if (pick) st.updateAppointment(apptId, { planItemIds: [pick.item.id], teeth: teeth.length ? teeth : itemTeeth(pick.item) });
  };

  /** تحذيرات قبل التثبيت: تعارض وقت، وتركيب تاج قبل وصول طلب المخبر */
  const warnings = (): { title: string; msg: string; ok: string }[] => {
    const out: { title: string; msg: string; ok: string }[] = [];
    const c = findConflicts();
    if (c.length) out.push({ title: "تعارض في الوقت", msg: c.slice(0, 3).map((x) => `• ${describeClash(x)}`).join("\n"), ok: "حجز رغم التعارض" });
    const proc = procOf();
    const fitting = /تركيب/.test(proc) && /تاج|جسر|تلبيس|تيجان/.test(proc);
    if (fitting && patientId) {
      const labs = useExtras.getState().labOrders.filter((l) => l.patientId === patientId && l.status !== "fitted");
      if (!labs.some((l) => l.status === "received")) {
        out.push({
          title: "المخبر",
          msg: labs.length ? "طلب المخبر لم يصل بعد، ولا يُنصح بحجز التركيب قبل وصوله." : "لا يوجد طلب مخبر لهذا المريض. هل أرسلت العمل للمخبر؟",
          ok: "حجز رغم ذلك",
        });
      }
    }
    return out;
  };

  const save = () => {
    if (!patientId) {
      Alert.alert("اختر المريض", "حدّد المريض صاحب الموعد.");
      return;
    }
    if (!date || !startTime) {
      Alert.alert("حدّد التاريخ والوقت", "لتثبيت الموعد يلزم اختيار اليوم والوقت. يمكنك بدلًا من ذلك حفظ المريض في قائمة الانتظار.");
      return;
    }
    if (!existing && advance.value > 0 && !advance.result()) {
      Alert.alert("سعر الدولار", "اكتب سعر الدولار ليُحسب مبلغ الدفعة.");
      return;
    }
    const list = warnings();
    const step = (i: number) => {
      if (i >= list.length) return doSave();
      const w = list[i];
      Alert.alert(w.title, `${w.msg}\n\nهل تريد المتابعة؟`, [
        { text: "تعديل", style: "cancel" },
        { text: w.ok, onPress: () => step(i + 1) },
      ]);
    };
    step(0);
  };

  /** يضع المريض في قائمة الانتظار: اليوم والوقت اختياريان هنا */
  const saveToWaitlist = () => {
    if (!patientId) {
      Alert.alert("اختر المريض", "حدّد المريض لإضافته إلى قائمة الانتظار.");
      return;
    }
    addWait({
      patientId,
      procedure: procedure.trim() || "كشف واستشارة",
      part: "any",
      date,
      time: startTime,
      notes: notes.trim() || undefined,
    });
    Alert.alert("أُضيف للانتظار", "يمكنك تثبيت موعده لاحقًا من قائمة الانتظار.");
    router.back();
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert("حذف الموعد", "هل تريد حذف هذا الموعد؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: () => {
          removeAppointment(existing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen title={existing ? "تعديل الموعد" : "موعد جديد"} subtitle="العيادة الخاصة" back>
      <Card accent="private">
        <FieldRow label="المريض">
          <Pressable
            onPress={() => setPickOpen(true)}
            className="flex-row items-center gap-3 bg-slate-50 border border-line rounded-xl px-3.5 py-3"
          >
            <View className="w-8 h-8 rounded-full bg-private-soft items-center justify-center">
              <Text w="bold" className="text-private-ink">
                {patient ? initial(patient.name) : "؟"}
              </Text>
            </View>
            <Text className="flex-1" w={patient ? "semi" : "regular"} style={{ color: patient ? "#0F172A" : "#94A3B8" }}>
              {patient?.name ?? "اختر مريضًا"}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#94A3B8" />
          </Pressable>
        </FieldRow>
        {patient ? <MedicalAlertBar patient={patient} /> : null}
        <WarningLines lines={patient ? procedureWarnings(patientFlags(patient), procedure) : []} />
      </Card>

      {patient ? <PatientStatusHeader patientId={patient.id} /> : null}

      {patient ? (
        <ApptTypeSettings
          patient={patient}
          types={types}
          detected={detected}
          extra={extra}
          onExtra={(patch) => setExtra((cur) => ({ ...cur, ...patch }))}
          onProcedure={(name, minutes) => {
            setProcedure(name);
            if (minutes) setDuration(minutes);
          }}
          teeth={teeth}
        />
      ) : null}

      {patient ? (
        <ApptTeethSection patient={patient} teeth={teeth} onToggleTooth={toggleTooth} opens={[]} linked={linked} onToggleItem={toggleItem} />
      ) : (
        <Card className="mt-3">
          <Text w="bold" className="mb-1">
            ١. المخطط السني
          </Text>
          <Text className="text-xs text-muted">اختر المريض أولًا ليظهر مخطط أسنانه؛ ثم حدّد السن ونوع الإجراء وخطة العلاج.</Text>
        </Card>
      )}

      <Card className="mt-3">
        <Text w="bold" className="mb-2">
          ٢. نوع الإجراء
        </Text>
        <FieldRow label="الإجراء">
          <View className="flex-row flex-wrap gap-2">
            {procedures.map((p) => (
              <Chip
                key={p.name}
                label={p.name}
                selected={procedure === p.name}
                color={TYPE_META.private.hex}
                onPress={() => {
                  setProcedure(p.name);
                  setDuration(p.minutes);
                }}
              />
            ))}
          </View>
        </FieldRow>
        <Field label="أو اكتب إجراءً آخر" value={procedure} onChangeText={setProcedure} />
        <Pressable onPress={() => router.push("/clinic/procedures" as never)} className="self-start mb-2" hitSlop={8}>
          <Text w="semi" className="text-xs" style={{ color: TYPE_META.private.hex }}>
            تعديل الإجراءات ›
          </Text>
        </Pressable>
      </Card>

      {patient ? (
        <ApptPlanSection
          procedure={procOf()}
          teeth={teeth}
          opens={opens}
          linked={linked}
          onToggleItem={toggleItem}
          plans={patientPlans}
          planId={planSel}
          onPlanId={setPlanChoice}
          willCreate={willCreate}
          unitCost={unitCost}
          costs={costs}
          onCost={(t, v) => setCosts((cur) => ({ ...cur, [t]: v }))}
          currency={currency}
        />
      ) : null}

      <Card className="mt-3">
        <DateField label={existing ? "التاريخ" : "التاريخ (يلزم عند التثبيت)"} value={date} onChange={(v) => v && setDate(v)} placeholder="اختر التاريخ" />
        <TimeField label={endTime ? `الوقت (ينتهي ${fmtTime(endTime)})` : "الوقت (يلزم عند التثبيت)"} value={startTime} onChange={setStartTime} />
        <FieldRow label="المدة بالدقائق">
          <View className="flex-row flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <Chip key={d} label={`${d}`} selected={duration === d} color={TYPE_META.private.hex} onPress={() => setDuration(d)} />
            ))}
          </View>
        </FieldRow>
      </Card>

      <Card className="mt-3">
        <DictateField label="ملاحظات" value={notes} onChangeText={setNotes} multiline />
        {existing ? (
          <FieldRow label="الحالة">
            <View className="flex-row flex-wrap gap-2">
              {(Object.keys(STATUS_META) as AppointmentStatus[]).map((s) => (
                <Chip key={s} label={STATUS_META[s].label} selected={status === s} color={STATUS_META[s].hex} onPress={() => setStatus(s)} />
              ))}
            </View>
          </FieldRow>
        ) : null}
      </Card>

      {!existing && patient ? (
        <Card className="mt-3">
          <Text w="bold" className="mb-1">
            دفعة مقدّمة (اختياري)
          </Text>
          <Text className="text-xs text-muted mb-2">تُسجَّل في حساب المريض وتُربط بخطة العلاج أعلاه.</Text>
          <MoneyField label="المبلغ" m={advance} />
        </Card>
      ) : null}

      <View className="flex-row gap-3 mt-5">
        <View className="flex-1">
          <Button label="حفظ الموعد" icon="checkmark" type="private" onPress={save} />
        </View>
        {existing ? <Button label="حذف" variant="danger" icon="trash-outline" onPress={confirmDelete} /> : null}
      </View>
      {!existing ? (
        <View className="mt-3">
          <Button label="حفظ في قائمة الانتظار" icon="hourglass-outline" variant="soft" onPress={saveToWaitlist} />
        </View>
      ) : null}

      <Sheet visible={pickOpen} onClose={() => setPickOpen(false)} title="اختر المريض">
        <Field value={q} onChangeText={setQ} placeholder="بحث بالاسم أو الهاتف" />
        {list.length === 0 ? (
          <EmptyState icon="people-outline" title="لا يوجد مرضى" hint="أضف مريضًا من شاشة العيادة" />
        ) : (
          list.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => {
                setPatientId(p.id);
                setPickOpen(false);
              }}
              className="flex-row items-center gap-3 py-2.5 border-b border-line"
            >
              <View className="w-9 h-9 rounded-full bg-private-soft items-center justify-center">
                <Text w="bold" className="text-private-ink">
                  {initial(p.name)}
                </Text>
              </View>
              <Text w="semi" className="flex-1">
                {p.name}
              </Text>
              {patientId === p.id ? <Ionicons name="checkmark-circle" size={20} color={TYPE_META.private.hex} /> : null}
            </Pressable>
          ))
        )}
      </Sheet>
      {endoPrompt.node}
    </Screen>
  );
}
