/** نوع المريض الذكي: دوال نقية (قابلة للاختبار) لا تعتمد على React ولا على المخازن */
import { addDays } from "@/lib/dates";
import type { Appointment, ClinicSession, Patient, TreatmentPlan } from "@/types";
import type { LabOrder, OrthoCase } from "@/types/extras";

export type PatientTypeKey = "ortho" | "crowns" | "implant" | "pedo" | "endo";
export type DentitionKind = "primary" | "mixed" | "permanent";

export const PATIENT_TYPES: Record<PatientTypeKey, { label: string; hex: string; icon: string }> = {
  ortho: { label: "تقويم", hex: "#7C3AED", icon: "git-compare-outline" },
  crowns: { label: "تيجان", hex: "#D97706", icon: "construct-outline" },
  implant: { label: "زرع", hex: "#0891B2", icon: "hardware-chip-outline" },
  pedo: { label: "أطفال", hex: "#DB2777", icon: "happy-outline" },
  endo: { label: "عصب", hex: "#EA580C", icon: "pulse-outline" },
};

export const ALL_TYPE_KEYS = Object.keys(PATIENT_TYPES) as PatientTypeKey[];

// ---------------------------------------------------------------- المخطط حسب العمر

/**
 * أقل من 6 سنوات: لبنية. من 6 إلى 12: مختلطة. 13 فما فوق: دائمة.
 * عند غياب سنة الميلاد: دائمة (ويغيّرها الطبيب يدويًا).
 */
export function dentitionByAge(birthYear: number | undefined, nowYear = new Date().getFullYear()): DentitionKind {
  if (!birthYear) return "permanent";
  const age = nowYear - birthYear;
  if (age < 6) return "primary";
  if (age <= 12) return "mixed";
  return "permanent";
}

/** المخطط الفعلي: الاختيار اليدوي المحفوظ أولًا، وإلا حسب العمر */
export function effectiveDentition(p: Pick<Patient, "birthYear" | "dentition">, nowYear = new Date().getFullYear()): DentitionKind {
  return p.dentition ?? dentitionByAge(p.birthYear, nowYear);
}

// ---------------------------------------------------------------- كشف النوع تلقائيًا

const RX: Record<Exclude<PatientTypeKey, "pedo">, RegExp> = {
  ortho: /تقويم|براكيت|اسلاك|أسلاك|ortho/i,
  crowns: /تاج|تيجان|جسر|تلبيس|تلبيسة|كراون|قشرة|فينير|crown|bridge/i,
  implant: /زرع|زرعة|غرسة|implant/i,
  endo: /عصب|لبية|لبيّة|قناة|قنوات|rct|endo/i,
};

/** هل اسم الإجراء معالجة لبية/عصب؟ */
export function isEndoProcedure(name: string | undefined): boolean {
  return !!name && RX.endo.test(name);
}

export type DetectInput = {
  patient: Patient;
  plans: TreatmentPlan[];
  sessions: ClinicSession[];
  appointments: Appointment[];
  labOrders: LabOrder[];
  orthoCases: OrthoCase[];
  nowYear?: number;
};

/** الأنواع المستنتَجة فقط (قبل تطبيق الإضافة/الإزالة اليدوية) */
export function detectTypes(i: DetectInput): PatientTypeKey[] {
  const { patient: p } = i;
  const pid = p.id;
  const texts: string[] = [];
  for (const pl of i.plans) if (pl.patientId === pid) for (const it of pl.items) texts.push(it.procedure);
  for (const s of i.sessions) if (s.patientId === pid) texts.push(s.procedure);
  for (const a of i.appointments) if (a.patientId === pid && a.status !== "cancelled") texts.push(a.procedure);
  for (const l of i.labOrders) if (l.patientId === pid) texts.push(l.work);
  const hit = (k: keyof typeof RX) => texts.some((t) => RX[k].test(t));
  const teeth = Object.values(p.teeth ?? {});

  const out: PatientTypeKey[] = [];
  if (i.orthoCases.some((o) => o.patientId === pid) || hit("ortho")) out.push("ortho");
  if (i.labOrders.some((l) => l.patientId === pid) || hit("crowns") || teeth.includes("crown")) out.push("crowns");
  if (hit("implant") || teeth.includes("implant")) out.push("implant");
  // العصب: وجود بند/جلسة عصب ما دام ليس كل بنود الخطة منجزة (أو لا خطة)
  const endoOpen = i.plans.some((pl) => pl.patientId === pid && pl.items.some((it) => !it.done && RX.endo.test(it.procedure)));
  const endoSessions = i.sessions.some((s) => s.patientId === pid && RX.endo.test(s.procedure));
  if (endoOpen || (endoSessions && !i.plans.some((pl) => pl.patientId === pid && pl.items.length && pl.items.every((it) => it.done)))) out.push("endo");
  if (p.birthYear && (i.nowYear ?? new Date().getFullYear()) - p.birthYear < 13) out.push("pedo");
  return out;
}

/** الأنواع النهائية = المستنتَج + المضاف يدويًا − المُزال يدويًا */
export function activeTypes(i: DetectInput): PatientTypeKey[] {
  const removed = new Set(i.patient.typeRemove ?? []);
  const set = new Set<PatientTypeKey>([...detectTypes(i), ...(i.patient.typeAdd ?? [])]);
  for (const r of removed) if (!(i.patient.typeAdd ?? []).includes(r)) set.delete(r);
  return ALL_TYPE_KEYS.filter((k) => set.has(k));
}

/** تبديل نوع يدويًا: يحدّد ما يُضاف أو يُزال ليصبح النوع فعّالًا/غير فعّال، دون المساس بالبيانات */
export function toggleTypePatch(
  p: Pick<Patient, "typeAdd" | "typeRemove">,
  key: PatientTypeKey,
  detected: boolean,
  makeActive: boolean,
): { typeAdd: PatientTypeKey[]; typeRemove: PatientTypeKey[] } {
  const add = new Set(p.typeAdd ?? []);
  const rem = new Set(p.typeRemove ?? []);
  add.delete(key);
  rem.delete(key);
  if (makeActive && !detected) add.add(key);
  if (!makeActive && detected) rem.add(key);
  return { typeAdd: [...add], typeRemove: [...rem] };
}

// ---------------------------------------------------------------- التقويم

/** الزيارة القادمة المقترحة: بعد 4 إلى 6 أسابيع من آخر زيارة (نقترح 5 أسابيع في المنتصف) */
export function orthoNextVisit(lastVisitISO: string, weeks = 5): { date: string; from: string; to: string } {
  return { date: addDays(lastVisitISO, weeks * 7), from: addDays(lastVisitISO, 4 * 7), to: addDays(lastVisitISO, 6 * 7) };
}

/** آخر زيارة تقويم معروفة: من سجل زيارات الحالة أو جلسات التقويم */
export function lastOrthoVisit(oc: OrthoCase | undefined, sessions: ClinicSession[], patientId: string): string | undefined {
  const dates = [
    ...(oc?.visits.map((v) => v.date) ?? []),
    ...sessions.filter((s) => s.patientId === patientId && RX.ortho.test(s.procedure)).map((s) => s.date),
  ].sort();
  return dates[dates.length - 1];
}

// ---------------------------------------------------------------- المخبر (التيجان)

export type LabAlert = { order: LabOrder; daysLate: number };

/** أعمال لم تصل بعد وتجاوزت موعدها */
export function overdueLabOrders(orders: LabOrder[], patientId: string | null, today: string): LabAlert[] {
  const t = new Date(today + "T00:00:00").getTime();
  return orders
    .filter((o) => (patientId ? o.patientId === patientId : true) && o.status === "sent" && o.dueOn && o.dueOn < today)
    .map((o) => ({ order: o, daysLate: Math.round((t - new Date(o.dueOn! + "T00:00:00").getTime()) / 86_400_000) }))
    .sort((a, b) => b.daysLate - a.daysLate);
}

/** وصل العمل ولم يُحجز موعد تركيب بعد */
export function needsFittingBooking(order: LabOrder, appointments: Appointment[], today: string): boolean {
  if (order.status !== "received") return false;
  return !appointments.some((a) => a.patientId === order.patientId && a.status === "scheduled" && a.date >= today);
}

// ---------------------------------------------------------------- الزرع

/** مواعيد ما بعد الزرع الافتراضية (بالأيام): أسبوع، أسبوعان، 3 أشهر، 6 أشهر */
export const IMPLANT_SCHEDULE: { days: number; label: string }[] = [
  { days: 7, label: "متابعة زرع — أسبوع" },
  { days: 14, label: "متابعة زرع — أسبوعان" },
  { days: 90, label: "مراجعة زرع — 3 أشهر" },
  { days: 180, label: "مراجعة زرع — 6 أشهر" },
];

/** مواعيد الزرع المقترحة بدءًا من تاريخ الجراحة */
export function implantFollowUps(surgeryISO: string): { date: string; procedure: string }[] {
  return IMPLANT_SCHEDULE.map((s) => ({ date: addDays(surgeryISO, s.days), procedure: s.label }));
}

/** آخر جلسة/موعد منجز لزرع (تاريخ الجراحة) */
export function lastImplantSurgery(sessions: ClinicSession[], patientId: string): string | undefined {
  const d = sessions
    // الجراحة فقط: مراحل ما بعدها (طبعة/اندماج/تركيب/متابعة) لا تُعدّ تاريخ جراحة جديدًا
    .filter((s) => s.patientId === patientId && RX.implant.test(s.procedure) && !IMPLANT_NON_SURGERY.test(s.procedure))
    .map((s) => s.date)
    .sort();
  return d[d.length - 1];
}

const IMPLANT_NON_SURGERY = /تركيب|طبعة|اندماج|متابعة|مراجعة|كشف|تاج|دعامة/;

/** هل أُنشئت مواعيد المتابعة لهذه الجراحة؟ (علامة في ملاحظات الموعد لمنع التكرار) */
export const implantTag = (surgeryISO: string) => `[auto:implant:${surgeryISO}]`;
export const orthoTag = (visitISO: string) => `[auto:ortho:${visitISO}]`;
export const pedoTag = (kind: string, year: number) => `[auto:pedo:${kind}:${year}]`;

// ---------------------------------------------------------------- الأطفال والعصب

/** تذكير الفلورايد والسدّ الوقائي: كل 6 أشهر من آخر جلسة فلورايد/سدّ، أو من اليوم إن لم توجد */
export function pedoReminderDate(sessions: ClinicSession[], patientId: string, today: string): string {
  const d = sessions
    .filter((s) => s.patientId === patientId && /فلورايد|فلوريد|سد|سدّ|sealant|fluoride/i.test(s.procedure))
    .map((s) => s.date)
    .sort();
  const last = d[d.length - 1];
  return addDays(last ?? today, 180);
}

/** جلسات العصب المسجلة وهل وصل الحشو النهائي (جلسة تحوي «حشو نهائي/حشوة نهائية») */
export function endoProgress(sessions: ClinicSession[], patientId: string): { count: number; finalDone: boolean } {
  const s = sessions.filter((x) => x.patientId === patientId && RX.endo.test(x.procedure));
  const finalDone = sessions.some((x) => x.patientId === patientId && /حشو(ة)? نهائي|final/i.test(`${x.procedure} ${x.notes ?? ""}`));
  return { count: s.length, finalDone };
}

// ---------------------------------------------------------------- مواعيد تُنشأ تلقائيًا

export type AutoAppt = { tag: string; date: string; procedure: string; durationMin: number; notes: string };

const AUTO_NOTE = "موعد مقترح تلقائيًا — يمكنك تعديل الوقت أو حذفه.";

/**
 * المواعيد التي يجب إنشاؤها الآن (نقية وغير مكرِّرة: ما سبق إنشاؤه موجود في patient.autoDone فلا يُعاد حتى لو حُذف).
 * زرع: بعد الجراحة بأسبوع/أسبوعين/3/6 أشهر. تقويم: بعد 5 أسابيع من آخر زيارة. أطفال: فلورايد/سدّ كل 6 أشهر.
 */
export function planAutoAppointments(i: {
  patient: Patient;
  types: PatientTypeKey[];
  sessions: ClinicSession[];
  appointments: Appointment[];
  orthoCase?: OrthoCase;
  today: string;
}): AutoAppt[] {
  const { patient: p, types, today } = i;
  const done = new Set(p.autoDone ?? []);
  const mine = i.sessions.filter((s) => s.patientId === p.id);
  const upcoming = i.appointments.filter((a) => a.patientId === p.id && a.status === "scheduled" && a.date >= today);
  const out: AutoAppt[] = [];

  if (types.includes("implant")) {
    const surgery = lastImplantSurgery(mine, p.id);
    if (surgery) {
      IMPLANT_SCHEDULE.forEach((st) => {
        const tag = `${implantTag(surgery)}+${st.days}`;
        const date = addDays(surgery, st.days);
        if (done.has(tag) || date < today) return;
        out.push({ tag, date, procedure: st.label, durationMin: 15, notes: `${AUTO_NOTE} ${tag}` });
      });
    }
  }

  if (types.includes("ortho")) {
    const last = lastOrthoVisit(i.orthoCase, mine, p.id);
    const tag = last ? orthoTag(last) : "";
    const hasFuture = upcoming.some((a) => RX.ortho.test(a.procedure));
    if (last && !done.has(tag) && !hasFuture) {
      const suggested = orthoNextVisit(last).date;
      out.push({ tag, date: suggested < today ? addDays(today, 7) : suggested, procedure: "تقويم - مراجعة", durationMin: 20, notes: `${AUTO_NOTE} ${tag}` });
    }
  }

  if (types.includes("pedo") && mine.length > 0) {
    const due = pedoReminderDate(mine, p.id, today);
    const tag = pedoTag("fluoride", Number(due.slice(0, 4)));
    const hasFuture = upcoming.some((a) => /فلورايد|سد|sealant/i.test(a.procedure));
    if (!done.has(tag) && !hasFuture) {
      out.push({ tag, date: due < today ? addDays(today, 7) : due, procedure: "فلورايد وسدّ وقائي", durationMin: 20, notes: `${AUTO_NOTE} ${tag}` });
    }
  }
  return out;
}
