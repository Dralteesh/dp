import { agendaFor, type AgendaInput } from "@/lib/agenda";
import { ALERT_META, patientFlags, procedureWarnings } from "@/lib/alerts";
import { findClashes, itemInterval } from "@/lib/conflicts";
import { addDays, fmtDateShort, fmtTime, minutesToTime, toISO, toMinutes, weekdayOf } from "@/lib/dates";
import { recallCandidates, lastVisit } from "@/lib/followups";
import { fmtMoney } from "@/lib/format";
import { sporeStatus } from "@/lib/sterilization";
import { slotCandidates } from "@/lib/waitlist";
import type {
  AlarmItem,
  Appointment,
  ClinicSession,
  InventoryItem,
  Patient,
  Payment,
  PlannerEvent,
  Task,
  TreatmentPlan,
} from "@/types";
import type { InstallPlan, LabOrder, SterilCycle, WaitEntry } from "@/types/extras";

export type SmartLevel = "urgent" | "important" | "info";

export type SmartAction =
  | { kind: "route"; label: string; path: string; params?: Record<string, string> }
  | { kind: "alarm"; label: string; time: string; date: string; title: string }
  | { kind: "completeTask"; label: string; taskId: string };

export type Suggestion = {
  /** معرّف ثابت (يُستخدم لتجاهل الاقتراح لليوم) */
  id: string;
  level: SmartLevel;
  icon: string;
  title: string;
  detail?: string;
  action?: SmartAction;
};

export type SmartInput = {
  now: Date;
  currency: string;
  tasks: Task[];
  alarms: AlarmItem[];
  events: PlannerEvent[];
  appointments: Appointment[];
  patients: Patient[];
  sessions: ClinicSession[];
  payments: Payment[];
  inventory: InventoryItem[];
  plans: TreatmentPlan[];
  installPlans: InstallPlan[];
  labOrders: LabOrder[];
  sterilization: SterilCycle[];
  waitlist: WaitEntry[];
};

const LEVEL_ORDER: Record<SmartLevel, number> = { urgent: 0, important: 1, info: 2 };

const dayWord = (date: string, today: string) =>
  date === today ? "اليوم" : date === addDays(today, 1) ? "غدًا" : date === addDays(today, 2) ? "بعد غد" : fmtDateShort(date);

const names = (list: string[], max = 3) => (list.length <= max ? list.join("، ") : `${list.slice(0, max).join("، ")} و${list.length - max} آخرين`);

/** هل يغطي منبّهٌ فعّال يوم date في المجال [from, to] دقيقة؟ */
function alarmCovers(alarms: AlarmItem[], date: string, from: number, to: number): boolean {
  const wd = weekdayOf(date);
  return alarms.some((a) => {
    if (!a.enabled) return false;
    const ok = a.days.length === 0 ? a.onceDate === date : a.days.includes(wd);
    if (!ok) return false;
    const m = toMinutes(a.time);
    return m >= from && m <= to;
  });
}

export function buildSuggestions(inp: SmartInput): Suggestion[] {
  const out: Suggestion[] = [];
  const { now, currency } = inp;
  const today = toISO(now);
  const tomorrow = addDays(today, 1);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const input: AgendaInput = { events: inp.events, appointments: inp.appointments, patients: inp.patients };
  const patientById = new Map(inp.patients.map((p) => [p.id, p]));

  // ───── المهام ─────
  const open = inp.tasks.filter((t) => !t.done);
  const overdue = open.filter((t) => t.dueDate && t.dueDate < today);
  if (overdue.length) {
    out.push({
      id: "tasks-overdue",
      level: "urgent",
      icon: "alert-circle",
      title: overdue.length === 1 ? "مهمة متأخرة" : `${overdue.length} مهام متأخرة`,
      detail: names(overdue.map((t) => t.title)),
      action:
        overdue.length === 1
          ? { kind: "completeTask", label: "تمّت", taskId: overdue[0].id }
          : { kind: "route", label: "افتح المهام", path: "/tasks" },
    });
  }
  const dueToday = open.filter((t) => t.dueDate === today && t.priority === "high");
  if (dueToday.length) {
    out.push({
      id: "tasks-high-today",
      level: "important",
      icon: "flag",
      title: dueToday.length === 1 ? "مهمة مهمة لليوم" : `${dueToday.length} مهام مهمة لليوم`,
      detail: names(dueToday.map((t) => t.title)),
      action: dueToday.length === 1 ? { kind: "completeTask", label: "تمّت", taskId: dueToday[0].id } : { kind: "route", label: "افتح المهام", path: "/tasks" },
    });
  }

  // ───── منبّه ذكي لأول التزام غدًا ─────
  const tomorrowItems = agendaFor(tomorrow, input).filter((i) => !i.continuation && !(i.status === "no_show"));
  const first = tomorrowItems[0];
  if (first) {
    const start = toMinutes(first.startTime);
    const ev = first.source === "event" ? inp.events.find((e) => e.id === first.refId) : undefined;
    const evHasAlarm = !!ev && ev.alarmMinutes != null;
    const lead = first.type === "hospital" ? 90 : 60;
    const wake = start - lead;
    if (!evHasAlarm && wake >= 0 && !alarmCovers(inp.alarms, tomorrow, Math.max(0, start - 240), start)) {
      const time = minutesToTime(wake);
      out.push({
        id: `alarm-${tomorrow}`,
        level: "important",
        icon: "alarm",
        title: `لا منبّه لـ«${first.title}» غدًا ${fmtTime(first.startTime)}`,
        detail: `أقترح منبّهًا ${fmtTime(time)}`,
        action: { kind: "alarm", label: `اضبط ${fmtTime(time)}`, time, date: tomorrow, title: first.title },
      });
    }
  }

  // ───── تعارضات الأسبوع القادم (مواعيد مع مواعيد أو أحداث) ─────
  const clashes: { date: string; a: string; b: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, i);
    const items = agendaFor(d, input).filter((x) => x.status !== "no_show");
    for (let x = 0; x < items.length; x++) {
      for (let y = x + 1; y < items.length; y++) {
        const A = items[x];
        const B = items[y];
        if (A.source === "event" && B.source === "event") continue;
        const ia = itemInterval(A);
        const ib = itemInterval(B);
        if (ia[0] < ib[1] && ib[0] < ia[1] && !(A.continuation && B.continuation)) {
          clashes.push({ date: d, a: A.title, b: B.title });
        }
      }
    }
  }
  if (clashes.length) {
    const c = clashes[0];
    out.push({
      id: "clashes",
      level: "urgent",
      icon: "git-compare",
      title: clashes.length === 1 ? "تعارض في جدولك" : `${clashes.length} تعارضات في جدولك`,
      detail: `${dayWord(c.date, today)}: «${c.a}» يتقاطع مع «${c.b}»`,
      action: { kind: "route", label: "افتح التقويم", path: "/calendar" },
    });
  }

  // ───── تنبيهات طبية قبل مواعيد اليوم والغد ─────
  for (const day of [today, tomorrow]) {
    for (const a of inp.appointments) {
      if (a.date !== day || a.status !== "scheduled") continue;
      if (day === today && toMinutes(a.startTime) + a.durationMin < nowMin) continue;
      const p = patientById.get(a.patientId);
      if (!p) continue;
      const flags = patientFlags(p);
      if (!flags.length) continue;
      const warns = procedureWarnings(flags, a.procedure);
      if (!warns.length) continue;
      out.push({
        id: `med-${a.id}`,
        level: "urgent",
        icon: "medkit",
        title: `${p.name} (${dayWord(day, today)} ${fmtTime(a.startTime)}): ${ALERT_META[flags[0]].label}`,
        detail: warns[0],
        action: { kind: "route", label: "ملف المريض", path: "/clinic/patient/[id]", params: { id: p.id } },
      });
    }
  }

  // ───── خطر عدم الحضور ─────
  const noShows = new Map<string, number>();
  for (const a of inp.appointments) if (a.status === "no_show") noShows.set(a.patientId, (noShows.get(a.patientId) ?? 0) + 1);
  const risky = inp.appointments.filter(
    (a) => (a.date === today || a.date === tomorrow) && a.status === "scheduled" && (noShows.get(a.patientId) ?? 0) >= 2 && !a.remindedAt,
  );
  if (risky.length) {
    out.push({
      id: "no-show-risk",
      level: "important",
      icon: "person-remove",
      title: risky.length === 1 ? "مريض اعتاد التغيّب" : `${risky.length} مرضى اعتادوا التغيّب`,
      detail: `${names(risky.map((a) => patientById.get(a.patientId)?.name ?? "مريض"))} — ذكّر${risky.length === 1 ? "ه" : "هم"} قبل الموعد`,
      action: { kind: "route", label: "أرسل تذكيرًا", path: "/clinic/followups" },
    });
  }

  // ───── مواعيد الغد بلا تذكير ─────
  const unreminded = inp.appointments.filter(
    (a) => a.date === tomorrow && a.status === "scheduled" && !a.remindedAt && !!patientById.get(a.patientId)?.phone?.trim(),
  );
  if (unreminded.length) {
    out.push({
      id: "remind-tomorrow",
      level: "important",
      icon: "chatbubbles",
      title: `${unreminded.length} ${unreminded.length === 1 ? "مريض" : "مرضى"} غدًا لم يُذكَّروا بالموعد`,
      detail: names(unreminded.map((a) => patientById.get(a.patientId)?.name ?? "مريض")),
      action: { kind: "route", label: "أرسل التذكيرات", path: "/clinic/followups" },
    });
  }

  // ───── موعد شاغر يناسب قائمة الانتظار ─────
  if (inp.waitlist.length) {
    for (const a of inp.appointments) {
      if (a.status !== "cancelled" && a.status !== "postponed") continue;
      if (a.date < today || a.date > addDays(today, 7)) continue;
      if (a.date === today && toMinutes(a.startTime) <= nowMin) continue;
      if (findClashes(a.date, a.startTime, a.durationMin, input).length) continue;
      const cands = slotCandidates(inp.waitlist, inp.patients, { date: a.date, startTime: a.startTime, excludePatientId: a.patientId }, today);
      if (!cands.length) continue;
      out.push({
        id: `slot-${a.id}`,
        level: "important",
        icon: "hourglass",
        title: `موعد شاغر ${dayWord(a.date, today)} ${fmtTime(a.startTime)} يناسب ${cands[0].patient.name}`,
        detail: cands.length > 1 ? `و${cands.length - 1} آخرين في قائمة الانتظار` : undefined,
        action: { kind: "route", label: "قائمة الانتظار", path: "/clinic/waitlist" },
      });
      break;
    }
  }

  // ───── طلبات المخبر ─────
  const labLate = inp.labOrders.filter((o) => o.status === "sent" && o.dueOn && o.dueOn <= today);
  if (labLate.length) {
    out.push({
      id: "lab-late",
      level: "important",
      icon: "flask",
      title: labLate.length === 1 ? "عمل المخبر حان موعده" : `${labLate.length} أعمال مخبر حان موعدها`,
      detail: names(labLate.map((o) => `${o.work}${patientById.get(o.patientId) ? ` (${patientById.get(o.patientId)!.name})` : ""}`)),
      action: { kind: "route", label: "طلبات المخبر", path: "/clinic/lab" },
    });
  }
  const upcomingByPatient = new Set(inp.appointments.filter((a) => a.date >= today && a.status === "scheduled").map((a) => a.patientId));
  const labReady = inp.labOrders.filter((o) => o.status === "received" && !upcomingByPatient.has(o.patientId));
  if (labReady.length) {
    out.push({
      id: "lab-ready",
      level: "important",
      icon: "call",
      title: labReady.length === 1 ? "وصل عمل من المخبر ولا موعد للتركيب" : `وصلت ${labReady.length} أعمال ولا مواعيد للتركيب`,
      detail: names(labReady.map((o) => patientById.get(o.patientId)?.name ?? o.work)),
      action: { kind: "route", label: "طلبات المخبر", path: "/clinic/lab" },
    });
  }

  // ───── أقساط متأخرة ─────
  let lateInst = 0;
  let lateInstSum = 0;
  for (const pl of inp.installPlans) {
    for (const it of pl.items) {
      if (!it.paidOn && it.due < today) {
        lateInst++;
        lateInstSum += it.amount;
      }
    }
  }
  if (lateInst) {
    out.push({
      id: "install-late",
      level: "important",
      icon: "card",
      title: `${lateInst} ${lateInst === 1 ? "قسط متأخر" : "أقساط متأخرة"} (${fmtMoney(lateInstSum, currency)})`,
      action: { kind: "route", label: "الأقساط", path: "/clinic/installments" },
    });
  }

  // ───── ذمم قديمة ─────
  const debts: { p: Patient; bal: number }[] = [];
  for (const p of inp.patients) {
    const charged = inp.sessions.filter((s) => s.patientId === p.id).reduce((n, s) => n + s.cost, 0);
    const paid = inp.payments.filter((x) => x.patientId === p.id).reduce((n, x) => n + x.amount, 0);
    const bal = charged - paid;
    if (bal <= 0) continue;
    const last = lastVisit(p, inp.sessions, inp.appointments, today);
    if (last <= addDays(today, -30)) debts.push({ p, bal });
  }
  if (debts.length) {
    debts.sort((a, b) => b.bal - a.bal);
    const sum = debts.reduce((n, d) => n + d.bal, 0);
    out.push({
      id: "old-debts",
      level: "info",
      icon: "cash",
      title: `${debts.length === 1 ? "مريض عليه" : `${debts.length} مرضى عليهم`} ذمم قديمة (${fmtMoney(sum, currency)})`,
      detail: `الأعلى: ${debts[0].p.name} ${fmtMoney(debts[0].bal, currency)}`,
      action: { kind: "route", label: "الذمم", path: "/clinic", params: { tab: "money" } },
    });
  }

  // ───── المخزون ─────
  const low = inp.inventory.filter((i) => i.active && i.quantity <= i.minQuantity);
  if (low.length) {
    out.push({
      id: "stock-low",
      level: "important",
      icon: "cube",
      title: low.length === 1 ? "مادة قاربت على النفاد" : `${low.length} مواد قاربت على النفاد`,
      detail: names(low.map((i) => i.name)),
      action: { kind: "route", label: "المخزون", path: "/clinic/inventory" },
    });
  }

  // ───── التعقيم ─────
  if (inp.sterilization.length) {
    const sp = sporeStatus(inp.sterilization, today);
    if (sp.overdue) {
      out.push({
        id: "spore-overdue",
        level: "important",
        icon: "shield-checkmark",
        title: "اختبار الأبواغ البيولوجي متأخر",
        detail: sp.daysSince != null ? `آخر اختبار قبل ${sp.daysSince} يومًا` : "لم يُسجَّل أي اختبار بعد",
        action: { kind: "route", label: "سجل التعقيم", path: "/clinic/sterilization" },
      });
    }
  }

  // ───── خطط علاج بلا موعد ─────
  const stalled = new Set<string>();
  for (const pl of inp.plans) {
    if (pl.items.some((i) => !i.done) && !upcomingByPatient.has(pl.patientId) && patientById.get(pl.patientId)?.status === "active") {
      stalled.add(pl.patientId);
    }
  }
  if (stalled.size) {
    out.push({
      id: "plans-stalled",
      level: "info",
      icon: "clipboard",
      title: `${stalled.size === 1 ? "مريض لديه" : `${stalled.size} مرضى لديهم`} خطة علاج غير مكتملة وبلا موعد قادم`,
      detail: names([...stalled].map((id) => patientById.get(id)?.name ?? "مريض")),
      action: { kind: "route", label: "خطط العلاج", path: "/clinic/plan" },
    });
  }

  // ───── استدعاء المرضى ─────
  const recall = recallCandidates(inp.patients, inp.sessions, inp.appointments, 6, now);
  if (recall.length) {
    out.push({
      id: "recall",
      level: "info",
      icon: "megaphone",
      title: `${recall.length === 1 ? "مريض لم يزر" : `${recall.length} مرضى لم يزوروا`} منذ 6 أشهر`,
      detail: "حان وقت الاطمئنان عليهم وتذكيرهم بالفحص الدوري",
      action: { kind: "route", label: "الاستدعاء", path: "/clinic/followups" },
    });
  }

  // ───── يوم مزدحم ─────
  for (let i = 0; i < 3; i++) {
    const d = addDays(today, i);
    const items = agendaFor(d, input).filter((x) => x.source === "appointment" && x.status !== "no_show");
    const mins = items.reduce((n, x) => n + (itemInterval(x)[1] - itemInterval(x)[0]), 0);
    if (items.length >= 8 || mins >= 600) {
      out.push({
        id: `busy-${d}`,
        level: "info",
        icon: "speedometer",
        title: `${dayWord(d, today)} مزدحم: ${items.length} مواعيد (${Math.round(mins / 60)} ساعات)`,
        detail: "خذ استراحة بين المرضى وجهّز المواد مسبقًا",
        action: { kind: "route", label: "افتح العيادة", path: "/clinic", params: { tab: "day" } },
      });
      break;
    }
  }

  return out.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}

/** جملة موجزة عن اليوم: عدد المواعيد وأولها ومتبقي المهام */
export function daySummary(inp: Pick<SmartInput, "now" | "events" | "appointments" | "patients" | "tasks">): string {
  const today = toISO(inp.now);
  const nowMin = inp.now.getHours() * 60 + inp.now.getMinutes();
  const items = agendaFor(today, { events: inp.events, appointments: inp.appointments, patients: inp.patients }).filter((i) => !i.continuation);
  const appts = items.filter((i) => i.source === "appointment" && i.status !== "no_show");
  const next = items.find((i) => toMinutes(i.startTime) >= nowMin);
  const tasksLeft = inp.tasks.filter((t) => !t.done && t.dueDate === today).length;
  const parts: string[] = [];
  if (appts.length) parts.push(`${appts.length} ${appts.length === 1 ? "موعد" : "مواعيد"} في العيادة`);
  if (next) parts.push(`التالي: ${next.title} ${fmtTime(next.startTime)}`);
  if (tasksLeft) parts.push(`${tasksLeft} ${tasksLeft === 1 ? "مهمة" : "مهام"} لليوم`);
  return parts.length ? parts.join(" • ") : "يوم هادئ حتى الآن";
}
