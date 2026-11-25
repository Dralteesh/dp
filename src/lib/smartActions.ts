import { addDays, fmtDateShort, fmtTime, minutesToTime, toISO, toMinutes } from "@/lib/dates";
import { findClashes, summarizeClashes } from "@/lib/conflicts";
import { patientFlags, procedureWarnings } from "@/lib/alerts";
import { matchProcedure } from "@/lib/procedures";
import { smartKindLabel, type SmartIntent } from "@/lib/smartParse";
import type { AgendaInput } from "@/lib/agenda";
import type { ProcedureDef, Settings } from "@/types";
import { useAlarms } from "@/store/useAlarms";
import { useClinic } from "@/store/useClinic";
import { usePlanner } from "@/store/usePlanner";

export type IntentPreview = {
  /** سطر ملخّص بالعربية: «موعد عيادة — سارة • غدًا 5:00 م» */
  summary: string;
  /** ما ينقص ليُنفَّذ (مثل الوقت) */
  missing: string[];
  /** تحذيرات: تعارض، تنبيه طبي */
  warnings: string[];
  /** يفتح نموذجًا جاهزًا بدل الإضافة المباشرة (مثل موعد بلا مريض) */
  needsForm: boolean;
};

export type IntentResult = { ok: boolean; message: string; route?: { pathname: string; params?: Record<string, string> } };

function dayLabel(date: string, today: string): string {
  if (date === today) return "اليوم";
  if (date === addDays(today, 1)) return "غدًا";
  if (date === addDays(today, 2)) return "بعد غد";
  return fmtDateShort(date);
}

/** يعدّل الإجراء المذكور إلى اسم الكتالوج، ويعيد المدة الافتراضية له */
function resolveProcedure(raw: string | undefined, list: ProcedureDef[]): { name: string; minutes?: number } {
  const m = matchProcedure(raw, list);
  if (m) return { name: m.name, minutes: m.minutes };
  return { name: raw || "كشف" };
}

/** معاينة قبل التنفيذ: ماذا سيحدث، وما الناقص، وهل هناك تعارض */
export function previewIntent(intent: SmartIntent, input: AgendaInput, procedures: ProcedureDef[], today = toISO(new Date())): IntentPreview {
  const missing: string[] = [];
  const warnings: string[] = [];
  let needsForm = false;
  const when = `${dayLabel(intent.date, today)}${intent.time ? ` ${fmtTime(intent.time)}` : ""}`;

  if (intent.kind === "alarm" && !intent.time) missing.push("وقت المنبّه");

  if (intent.kind === "appointment") {
    if (!intent.time) missing.push("وقت الموعد");
    if (!intent.patientId) needsForm = true;
    const proc = resolveProcedure(intent.procedure, procedures);
    const minutes = intent.durationMin && intent.durationMin !== 30 ? intent.durationMin : proc.minutes ?? intent.durationMin ?? 30;
    if (intent.time) {
      const clashes = findClashes(intent.date, intent.time, minutes, input);
      if (clashes.length) warnings.push(`تعارض مع:\n${summarizeClashes(clashes, 2)}`);
    }
    const p = input.patients.find((x) => x.id === intent.patientId);
    if (p) {
      for (const w of procedureWarnings(patientFlags(p), proc.name)) warnings.push(w);
    }
  }

  if (intent.kind === "event" && intent.time) {
    const clashes = findClashes(intent.date, intent.time, intent.durationMin ?? 60, input);
    if (clashes.length) warnings.push(`تعارض مع:\n${summarizeClashes(clashes, 2)}`);
  }

  let summary = `${smartKindLabel(intent.kind)} — ${intent.title}`;
  if (intent.kind === "appointment") {
    const proc = resolveProcedure(intent.procedure, procedures);
    summary = `موعد عيادة — ${intent.patientName ?? "اختر المريض"}${intent.procedure ? ` • ${proc.name}` : ""}`;
  }
  if (intent.kind === "alarm" && intent.repeatDays?.length) {
    summary += intent.repeatDays.length === 7 ? " • كل يوم" : " • أسبوعيًا";
  }
  if (intent.kind !== "note") summary += ` • ${when}`;
  if (intent.priority === "high") summary += " • مهم";
  return { summary, missing, warnings, needsForm };
}

/** ينفّذ النية فعليًا ويضيف العنصر في مكانه الصحيح */
export function applyIntent(intent: SmartIntent, procedures: ProcedureDef[], settings: Pick<Settings, "defaultReminder" | "appointmentReminder">): IntentResult {
  const planner = usePlanner.getState();
  switch (intent.kind) {
    case "task": {
      const title = intent.time && intent.dateExplicit ? `${intent.title} — ${fmtTime(intent.time)}` : intent.title;
      planner.addTask({ title, priority: intent.priority ?? "normal", dueDate: intent.dateExplicit ? intent.date : undefined });
      return { ok: true, message: "أُضيفت المهمة" };
    }
    case "note": {
      planner.addNote({ text: intent.title });
      return { ok: true, message: "حُفظت الملاحظة" };
    }
    case "alarm": {
      if (!intent.time) return { ok: false, message: "حدّد وقت المنبّه" };
      const days = intent.repeatDays ?? [];
      useAlarms.getState().addAlarm({
        label: intent.title === "منبّه" ? "منبّه" : intent.title,
        time: intent.time,
        days,
        onceDate: days.length === 0 ? intent.date : undefined,
        enabled: true,
        snoozeMinutes: 5,
        maxSnoozes: 2,
      });
      return { ok: true, message: "ضُبط المنبّه" };
    }
    case "event": {
      if (!intent.time) return { ok: false, message: "حدّد وقت الحدث" };
      const dur = intent.durationMin ?? 60;
      const endMin = toMinutes(intent.time) + dur;
      planner.addEvent({
        type: intent.eventType ?? "personal",
        title: intent.title,
        date: intent.date,
        startTime: intent.time,
        endTime: minutesToTime(endMin),
        endsNextDay: endMin >= 1440,
        repeat: "none",
        reminderMinutes: settings.defaultReminder,
        alarmMinutes: null,
      });
      return { ok: true, message: "أُضيف الحدث إلى التقويم" };
    }
    case "appointment": {
      const proc = resolveProcedure(intent.procedure, procedures);
      const minutes = intent.durationMin && intent.durationMin !== 30 ? intent.durationMin : proc.minutes ?? intent.durationMin ?? 30;
      if (!intent.patientId) {
        // نملأ النموذج الجاهز ويختار الطبيب المريض
        const params: Record<string, string> = { date: intent.date };
        if (intent.time) params.startTime = intent.time;
        if (intent.procedure) params.procedure = proc.name;
        return { ok: true, message: "اختر المريض لإكمال الموعد", route: { pathname: "/clinic/appointment-form", params } };
      }
      if (!intent.time) return { ok: false, message: "حدّد وقت الموعد" };
      useClinic.getState().addAppointment({
        patientId: intent.patientId,
        date: intent.date,
        startTime: intent.time,
        durationMin: minutes,
        procedure: proc.name,
      });
      return { ok: true, message: "حُجز الموعد" };
    }
  }
}
