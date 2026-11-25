import type { Appointment, AppointmentStatus, ClinicSession, Patient, Payment, ToothStatus } from "@/types";
import { LOWER_PRIMARY, LOWER_TEETH, UPPER_PRIMARY, UPPER_TEETH } from "@/constants/clinic";

/**
 * استيراد ملف JSON مُصدَّر من البرنامج السابق للعيادة (جداول patients / appointments / invoices ...).
 * منطق نقي بلا اعتماد على React Native ليسهل اختباره.
 */

type Row = Record<string, any>;

export type LegacyPlan = {
  patients: Patient[];
  appointments: Appointment[];
  sessions: ClinicSession[];
  payments: Payment[];
  /** تحديثات أسنان لمرضى موجودين مسبقًا في التطبيق */
  teethForExisting: { patientId: string; tooth: string; status: ToothStatus }[];
  /** ملاحظات تُلحق بمرضى موجودين */
  notesForExisting: { patientId: string; text: string }[];
  clinic?: { name?: string; phone?: string };
  stats: {
    patientsNew: number;
    patientsExisting: number;
    appointments: number;
    appointmentsSkipped: number;
    sessions: number;
    payments: number;
    teeth: number;
    sessionNotes: number;
  };
  warnings: string[];
  /** عيّنة مبالغ للتأكيد على العملة */
  moneySample?: { total: number; paid: number };
};

// الدائمة (11–48) واللبنية (51–85)
const VALID_TEETH = new Set([...UPPER_TEETH, ...LOWER_TEETH, ...UPPER_PRIMARY, ...LOWER_PRIMARY]);
const DAMASCUS_OFFSET_MS = 3 * 3600 * 1000; // سوريا UTC+3 دائمًا منذ 2022

const pad = (n: number) => String(n).padStart(2, "0");

/** تحويل طابع UTC إلى تاريخ ووقت بتوقيت دمشق */
function toLocal(ts: string | null | undefined): { date: string; time: string; ms: number } | null {
  if (!ts) return null;
  const ms = Date.parse(ts);
  if (Number.isNaN(ms)) return null;
  const d = new Date(ms + DAMASCUS_OFFSET_MS);
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
    ms,
  };
}

const digits = (s: string | null | undefined) =>
  (s ?? "")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\D/g, "");

const normName = (s: string) =>
  s
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

function mapStatus(s: unknown): AppointmentStatus {
  const v = String(s ?? "").toLowerCase();
  if (["arrived", "checked_in", "in_progress", "waiting"].includes(v)) return "arrived";
  if (["done", "completed", "complete", "finished"].includes(v)) return "done";
  if (["no_show", "noshow", "missed"].includes(v)) return "no_show";
  if (["postponed", "rescheduled"].includes(v)) return "postponed";
  if (["cancelled", "canceled"].includes(v)) return "cancelled";
  return "scheduled";
}

function mapTooth(condition: string | null | undefined): ToothStatus | null {
  const c = (condition ?? "").toLowerCase();
  if (/زرع|implant/.test(c)) return "implant";
  if (/نخر|تسوس|caries|decay/.test(c)) return "caries";
  if (/عصب|لب|rct|root/.test(c)) return "rct";
  if (/تاج|جسر|crown|bridge/.test(c)) return "crown";
  if (/حشو|ترميم|filling/.test(c)) return "filling";
  if (/مفقود|غائب|missing/.test(c)) return "missing";
  if (/قلع|extract/.test(c)) return "extraction";
  return null;
}

function medicalAlerts(r: Row): string | undefined {
  const parts: string[] = [];
  if (r.allergies) parts.push(`حساسية: ${r.allergies}`);
  if (r.chronic_diseases) parts.push(`أمراض مزمنة: ${r.chronic_diseases}`);
  if (r.surgeries) parts.push(`عمليات سابقة: ${r.surgeries}`);
  if (r.current_medications) parts.push(`أدوية: ${r.current_medications}`);
  if (r.blood_thinners) parts.push("يتناول مميّعات دم");
  if (r.is_pregnant) parts.push("حامل");
  return parts.length ? parts.join(" • ") : undefined;
}

function birthYear(dob: string | null | undefined, nowYear: number): number | undefined {
  if (!dob) return undefined;
  const y = Number(String(dob).slice(0, 4));
  if (!Number.isFinite(y) || y < 1900 || y > nowYear) return undefined;
  // تاريخ ميلاد في آخر سنتين غالبًا خطأ إدخال (مثل تاريخ اليوم)
  if (nowYear - y < 2) return undefined;
  return y;
}

export function isLegacyExport(raw: unknown): boolean {
  return !!raw && typeof raw === "object" && !!(raw as Row).tables && Array.isArray((raw as Row).tables.patients);
}

export function buildLegacyPlan(
  raw: Row,
  existing: Patient[],
  existingAppts: Appointment[],
  existingSessions: ClinicSession[],
  existingPayments: Payment[],
  uid: () => string,
  now = Date.now(),
): LegacyPlan {
  const T: Record<string, Row[]> = raw.tables ?? {};
  const nowYear = new Date(now).getFullYear();
  const warnings: string[] = [];
  const plan: LegacyPlan = {
    patients: [],
    appointments: [],
    sessions: [],
    payments: [],
    teethForExisting: [],
    notesForExisting: [],
    stats: { patientsNew: 0, patientsExisting: 0, appointments: 0, appointmentsSkipped: 0, sessions: 0, payments: 0, teeth: 0, sessionNotes: 0 },
    warnings,
  };

  // ---------- المرضى ----------
  const idMap = new Map<string, string>(); // legacy id -> app id
  const newById = new Map<string, Patient>();
  const existingIds = new Set(existing.map((p) => p.id));
  const keyOf = (name: string, phone: string) => `${normName(name)}|${digits(phone)}`;
  const existingKey = new Map(existing.map((p) => [keyOf(p.name, p.phone ?? ""), p.id]));
  const existingLegacy = new Map(existing.filter((p) => p.legacyId).map((p) => [p.legacyId as string, p.id]));
  const phoneOwners = new Map<string, Set<string>>();
  let badDob = 0;

  for (const r of T.patients ?? []) {
    const name = String(r.full_name ?? "").trim();
    if (!r.id || !name) continue;
    const phone = String(r.phone ?? "").trim();
    const found = existingLegacy.get(r.id) ?? existingKey.get(keyOf(name, phone));
    const d = digits(phone);
    if (d) {
      const set = phoneOwners.get(d) ?? new Set<string>();
      set.add(normName(name));
      phoneOwners.set(d, set);
    }
    if (found) {
      idMap.set(r.id, found);
      plan.stats.patientsExisting++;
      continue;
    }
    // تكرار داخل نفس الملف
    const dupKey = keyOf(name, phone);
    const dup = [...newById.values()].find((p) => keyOf(p.name, p.phone ?? "") === dupKey && (d || false));
    if (dup) {
      idMap.set(r.id, dup.id);
      continue;
    }
    const by = birthYear(r.date_of_birth, nowYear);
    if (r.date_of_birth && by === undefined) badDob++;
    const notes = [r.medical_notes, r.address ? `العنوان: ${String(r.address).replace(/\n+/g, "، ")}` : null, r.referral_source ? `المصدر: ${r.referral_source}` : null]
      .filter(Boolean)
      .join("\n");
    const p: Patient = {
      id: uid(),
      name,
      phone: phone || undefined,
      birthYear: by,
      gender: r.gender === "male" || r.gender === "female" ? r.gender : undefined,
      status: r.treatment_status === "completed" || r.is_active === false ? "finished" : "active",
      fileNumber: r.file_number ? String(r.file_number) : undefined,
      legacyId: r.id,
      medicalAlerts: medicalAlerts(r),
      notes: notes || undefined,
      teeth: {},
      createdAt: Date.parse(r.created_at) || now,
    };
    plan.patients.push(p);
    newById.set(p.id, p);
    idMap.set(r.id, p.id);
    plan.stats.patientsNew++;
  }
  plan.stats.patientsNew = plan.patients.length;
  if (badDob) warnings.push(`${badDob} تاريخ ميلاد يبدو خاطئًا (حديث جدًا أو مستقبلي) فتم تجاهله.`);
  const sharedPhones = [...phoneOwners.values()].filter((s) => s.size > 1).length;
  if (sharedPhones) warnings.push(`${sharedPhones} رقم هاتف مشترك بين مرضى بأسماء مختلفة (قد يكونون من عائلة واحدة) — استُوردوا كمرضى منفصلين.`);

  // ---------- المواعيد ----------
  const apptKey = (a: { patientId: string; date: string; startTime: string }) => `${a.patientId}|${a.date}|${a.startTime}`;
  const haveAppt = new Set(existingAppts.map(apptKey));
  const apptByLegacy = new Map<string, Appointment>();
  const skippedAppt = new Set<string>();
  for (const r of T.appointments ?? []) {
    const pid = idMap.get(r.patient_id);
    const s = toLocal(r.starts_at);
    if (!pid || !s) {
      plan.stats.appointmentsSkipped++;
      skippedAppt.add(r.id);
      continue;
    }
    const e = toLocal(r.ends_at);
    const dur = e ? Math.min(480, Math.max(5, Math.round((e.ms - s.ms) / 60000))) : 30;
    const a: Appointment = {
      id: uid(),
      patientId: pid,
      date: s.date,
      startTime: s.time,
      durationMin: dur,
      procedure: String(r.reason ?? "").trim() || "موعد",
      status: mapStatus(r.status),
      notes: r.notes ? String(r.notes) : undefined,
      createdAt: Date.parse(r.created_at) || now,
    };
    if (haveAppt.has(apptKey(a))) {
      plan.stats.appointmentsSkipped++;
      skippedAppt.add(r.id);
      continue;
    }
    haveAppt.add(apptKey(a));
    plan.appointments.push(a);
    apptByLegacy.set(r.id, a);
  }
  plan.stats.appointments = plan.appointments.length;
  if (plan.stats.appointmentsSkipped && plan.patients.length)
    warnings.push(`${plan.stats.appointmentsSkipped} موعد لم يُستورد (مكرّر في نفس الوقت لنفس المريض أو بلا مريض).`);

  // ---------- ملاحظات الجلسات ----------
  for (const r of T.session_notes ?? []) {
    const text = String(r.note ?? "").trim();
    if (!text) continue;
    if (skippedAppt.has(r.appointment_id)) continue; // الموعد موجود مسبقًا: لا نكرّر ملاحظته
    const a = apptByLegacy.get(r.appointment_id);
    if (a) {
      a.notes = a.notes ? `${a.notes}\n${text}` : text;
      plan.stats.sessionNotes++;
      continue;
    }
    const pid = idMap.get(r.patient_id);
    if (!pid) continue;
    const np = newById.get(pid);
    if (np) np.notes = np.notes ? `${np.notes}\nملاحظة جلسة: ${text}` : `ملاحظة جلسة: ${text}`;
    else {
      const ex = existing.find((x) => x.id === pid);
      if (ex?.notes?.includes(text)) continue;
      plan.notesForExisting.push({ patientId: pid, text: `ملاحظة جلسة: ${text}` });
    }
    plan.stats.sessionNotes++;
  }

  // ---------- مخطط الأسنان ----------
  let unknownTeeth = 0;
  for (const r of T.dental_chart_entries ?? []) {
    const pid = idMap.get(r.patient_id);
    const tooth = String(r.tooth_number ?? "");
    const st = mapTooth(`${r.condition ?? ""} ${r.treatment ?? ""}`);
    if (!pid || !VALID_TEETH.has(tooth) || !st) {
      unknownTeeth++;
      continue;
    }
    const np = newById.get(pid);
    if (np) np.teeth[tooth] = st;
    else {
      // لا نستبدل حالة سنٍّ عدّلتَها يدويًا في التطبيق
      const ex = existing.find((x) => x.id === pid);
      if (ex?.teeth?.[tooth]) continue;
      plan.teethForExisting.push({ patientId: pid, tooth, status: st });
    }
    plan.stats.teeth++;
  }
  if (unknownTeeth) warnings.push(`${unknownTeeth} سجل أسنان لم يُفهم (رقم أو حالة غير معروفة) فتم تجاهله.`);

  // ---------- الفواتير والدفعات ----------
  const haveSession = new Set(existingSessions.map((x) => `${x.patientId}|${x.date}|${x.cost}|${x.procedure}`));
  const havePayment = new Set(existingPayments.map((x) => `${x.patientId}|${x.date}|${x.amount}`));
  const paysByInvoice = new Map<string, Row[]>();
  for (const r of T.payments ?? []) {
    const list = paysByInvoice.get(r.invoice_id) ?? [];
    list.push(r);
    paysByInvoice.set(r.invoice_id, list);
  }
  for (const inv of T.invoices ?? []) {
    const pid = idMap.get(inv.patient_id);
    if (!pid) continue;
    const date = String(inv.issued_at ?? inv.created_at ?? "").slice(0, 10) || new Date(now).toISOString().slice(0, 10);
    const total = Number(inv.total) || 0;
    if (!plan.moneySample) plan.moneySample = { total, paid: Number(inv.paid) || 0 };
    if (total > 0) {
      const sess: ClinicSession = {
        id: uid(),
        patientId: pid,
        date,
        procedure: `فاتورة ${inv.invoice_number ?? ""}`.trim(),
        notes: inv.notes ? String(inv.notes) : undefined,
        cost: total,
        createdAt: Date.parse(inv.created_at) || now,
      };
      const k = `${sess.patientId}|${sess.date}|${sess.cost}|${sess.procedure}`;
      if (!haveSession.has(k)) {
        haveSession.add(k);
        plan.sessions.push(sess);
      }
    }
    let sum = 0;
    for (const pr of paysByInvoice.get(inv.id) ?? []) {
      const amount = Number(pr.amount) || 0;
      if (amount <= 0) continue;
      sum += amount;
      const l = toLocal(pr.paid_at);
      const pay: Payment = { id: uid(), patientId: pid, date: l?.date ?? date, amount, note: pr.method ? `طريقة الدفع: ${pr.method}` : undefined, createdAt: Date.parse(pr.paid_at) || now };
      const k = `${pay.patientId}|${pay.date}|${pay.amount}`;
      if (!havePayment.has(k)) {
        havePayment.add(k);
        plan.payments.push(pay);
      }
    }
    const rest = (Number(inv.paid) || 0) - sum;
    if (rest > 0) {
      const pay: Payment = { id: uid(), patientId: pid, date, amount: rest, note: "دفعة من البرنامج السابق", createdAt: now };
      const k = `${pay.patientId}|${pay.date}|${pay.amount}`;
      if (!havePayment.has(k)) {
        havePayment.add(k);
        plan.payments.push(pay);
      }
    }
  }
  plan.stats.sessions = plan.sessions.length;
  plan.stats.payments = plan.payments.length;

  // ---------- العيادة ----------
  const cs = (T.clinic_settings ?? []).find((c) => c.clinic_name);
  if (cs) plan.clinic = { name: cs.clinic_name, phone: cs.phone };

  const unused = Object.entries(T)
    .filter(([k, v]) => v.length && !["patients", "appointments", "invoices", "payments", "session_notes", "dental_chart_entries", "clinic_settings", "profiles", "user_roles", "audit_log", "assistant_messages", "assistant_settings", "finance_settings", "exchange_rates", "chairs"].includes(k))
    .map(([k]) => k);
  if (unused.length) warnings.push(`جداول لم تُستورد (غير مدعومة بعد): ${unused.join("، ")}`);
  void existingIds;
  return plan;
}
