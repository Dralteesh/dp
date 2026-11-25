/** صيغة النسخة الاحتياطية والتحقق منها (منطق نقي بلا اعتماد على React Native) */

export const BACKUP_APP = "dentist-planner";
export const BACKUP_VERSION = 1;

export const PLANNER_KEYS = ["events", "tasks", "notes"] as const;
export const CLINIC_KEYS = [
  "patients",
  "appointments",
  "sessions",
  "payments",
  "drugs",
  "prescriptions",
  "inventory",
  "stockMoves",
  "plans",
  "expenses",
] as const;

/** بيانات العيادة الإضافية (store منفصل: useExtras) */
export const EXTRAS_KEYS = ["priceList", "waitlist", "sterilization", "orthoCases", "consents", "installPlans", "labOrders", "perioCharts", "dentalExams", "invoices"] as const;

export type BackupData = {
  planner: Record<(typeof PLANNER_KEYS)[number], unknown[]>;
  clinic: Record<(typeof CLINIC_KEYS)[number], unknown[]>;
  /** قد يغيب في نسخ قديمة */
  extras: Record<(typeof EXTRAS_KEYS)[number], unknown[]>;
  alarms: unknown[];
  settings: Record<string, unknown>;
};

export type Backup = { app: string; version: number; exportedAt: string; data: BackupData };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** مصفوفة عناصرها كائنات لها id نصي (وإلا نتجاهل العنصر الفاسد) */
function items(v: unknown): unknown[] {
  return Array.isArray(v) ? v.filter((x) => isObj(x) && typeof x.id === "string" && x.id) : [];
}

export function makeBackup(
  planner: Partial<Record<string, unknown>>,
  clinic: Partial<Record<string, unknown>>,
  alarms: unknown,
  settings: Record<string, unknown>,
  extras: Partial<Record<string, unknown>> = {},
  now: Date = new Date(),
): Backup {
  const p = {} as BackupData["planner"];
  for (const k of PLANNER_KEYS) p[k] = items(planner[k]);
  const c = {} as BackupData["clinic"];
  for (const k of CLINIC_KEYS) c[k] = items(clinic[k]);
  const x = {} as BackupData["extras"];
  for (const k of EXTRAS_KEYS) x[k] = items(extras[k]);
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data: { planner: p, clinic: c, extras: x, alarms: items(alarms), settings },
  };
}

/** يحلّل نص ملف ويتحقق منه. يعيد النسخة المنظّفة أو رسالة خطأ. */
export function parseBackup(text: string): { ok: true; backup: Backup } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "الملف ليس نسخة احتياطية صالحة (ليس JSON)." };
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP) return { ok: false, error: "هذا الملف ليس نسخة من Dentist Planner." };
  if (typeof raw.version !== "number" || raw.version > BACKUP_VERSION)
    return { ok: false, error: "النسخة أحدث من هذا التطبيق. حدّث التطبيق أولًا." };
  const d = raw.data;
  if (!isObj(d) || !isObj(d.planner) || !isObj(d.clinic)) return { ok: false, error: "بنية الملف ناقصة." };
  const at = new Date(String(raw.exportedAt));
  return {
    ok: true,
    backup: makeBackup(d.planner, d.clinic, d.alarms, isObj(d.settings) ? d.settings : {}, isObj(d.extras) ? d.extras : {}, isNaN(at.getTime()) ? new Date(0) : at),
  };
}

export function backupCounts(b: Backup): { label: string; n: number }[] {
  return [
    { label: "مرضى", n: b.data.clinic.patients.length },
    { label: "مواعيد عيادة", n: b.data.clinic.appointments.length },
    { label: "جلسات", n: b.data.clinic.sessions.length },
    { label: "دفعات", n: b.data.clinic.payments.length },
    { label: "وصفات", n: b.data.clinic.prescriptions.length },
    { label: "سجلات تعقيم", n: b.data.extras.sterilization.length },
    { label: "ملفات تقويم", n: b.data.extras.orthoCases.length },
    { label: "نماذج موافقة", n: b.data.extras.consents.length },
    { label: "خطط تقسيط", n: b.data.extras.installPlans.length },
    { label: "طلبات مخبر", n: b.data.extras.labOrders.length },
    { label: "فحوصات لثة", n: b.data.extras.perioCharts.length },
    { label: "فحوصات تشخيصية", n: b.data.extras.dentalExams.length },
    { label: "فواتير", n: b.data.extras.invoices.length },
    { label: "أحداث", n: b.data.planner.events.length },
    { label: "مهام", n: b.data.planner.tasks.length },
  ];
}
