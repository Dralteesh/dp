// الأنواع الأربعة: ازرق / أصفر / أخضر / بنفسجي
export type ShiftType = "hospital" | "maxillo" | "private" | "personal";

export type Priority = "low" | "normal" | "high";

/** دوام أو مناوبة أو نشاط في التقويم */
export type PlannerEvent = {
  id: string;
  type: ShiftType;
  title: string;
  /** YYYY-MM-DD (تاريخ البداية، أو أول تكرار) */
  date: string;
  /** HH:mm */
  startTime: string;
  /** HH:mm */
  endTime: string;
  /** تنتهي في اليوم التالي (مناوبة 24 ساعة مثلًا) */
  endsNextDay: boolean;
  location?: string;
  notes?: string;
  repeat: "none" | "weekly";
  /** أيام التكرار الأسبوعي: 0=الأحد ... 6=السبت */
  weekdays?: number[];
  /** آخر يوم للتكرار (اختياري) */
  repeatUntil?: string;
  /** تذكير (إشعار) قبل البداية بعدد الدقائق، أو null بدون */
  reminderMinutes: number | null;
  /** منبّه إجباري قبل البداية بعدد الدقائق، أو null بدون */
  alarmMinutes: number | null;
  createdAt: number;
};

export type Task = {
  id: string;
  title: string;
  done: boolean;
  priority: Priority;
  type?: ShiftType;
  dueDate?: string;
  createdAt: number;
  doneAt?: number;
};

export type Note = {
  id: string;
  text: string;
  pinned: boolean;
  type?: ShiftType;
  createdAt: number;
  updatedAt: number;
};

/** منبّه إجباري */
export type AlarmItem = {
  id: string;
  label: string;
  /** HH:mm */
  time: string;
  /** أيام التكرار 0..6، فارغة = مرة واحدة */
  days: number[];
  /** لمنبّه المرة الواحدة: تاريخ التشغيل المتوقع */
  onceDate?: string;
  enabled: boolean;
  snoozeMinutes: number;
};

// ---------- العيادة الخاصة ----------

export type ToothStatus =
  | "caries"
  | "filling"
  | "rct"
  | "crown"
  | "implant"
  | "missing"
  | "extraction";

export type Patient = {
  id: string;
  name: string;
  phone?: string;
  birthYear?: number;
  gender?: "male" | "female";
  /** قيد المعالجة أم أنهى العلاج */
  status: "active" | "finished";
  /** تنبيهات طبية (حساسية، سكري، سيولة...) */
  medicalAlerts?: string;
  notes?: string;
  /** رمز السن (FDI) -> الحالة. غير المذكور = سليم */
  teeth: Record<string, ToothStatus>;
  createdAt: number;
};

export type AppointmentStatus =
  | "scheduled"
  | "arrived"
  | "done"
  | "no_show"
  | "postponed"
  | "cancelled";

export type Appointment = {
  id: string;
  patientId: string;
  /** YYYY-MM-DD */
  date: string;
  startTime: string;
  durationMin: number;
  procedure: string;
  status: AppointmentStatus;
  notes?: string;
  createdAt: number;
};

/** جلسة علاجية مع تكلفتها */
export type ClinicSession = {
  id: string;
  patientId: string;
  date: string;
  procedure: string;
  tooth?: string;
  notes?: string;
  cost: number;
  createdAt: number;
};

export type Payment = {
  id: string;
  patientId: string;
  date: string;
  amount: number;
  note?: string;
  createdAt: number;
};

// ---------- الإعدادات ----------

export type PrayerKey = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";

export type PrayerMethodKey =
  | "mwl"
  | "egyptian"
  | "umm_al_qura"
  | "karachi"
  | "turkey";

export type Settings = {
  doctorName: string;
  prayerMethod: PrayerMethodKey;
  madhab: "shafi" | "hanafi";
  /** تعديل يدوي بالدقائق لكل صلاة */
  prayerAdjust: Partial<Record<PrayerKey, number>>;
  /** تفعيل إشعار كل صلاة */
  prayerNotify: Record<PrayerKey, boolean>;
  /** تذكير افتراضي للأحداث الجديدة (دقائق) */
  defaultReminder: number;
  /** تذكير مواعيد العيادة قبل الموعد (دقائق) */
  appointmentReminder: number;
  currency: string;
  /** ألوان مخصّصة للأنواع الأربعة (hex)، والفراغ = الافتراضي */
  typeColors: Partial<Record<ShiftType, string>>;
  /** اسم التطبيق الظاهر في الرأسية (فارغ = Dentist Planner) */
  appName: string;
  /** شعار التطبيق كنص data:image (فارغ = الأيقونة الافتراضية) */
  logo: string;
  /** اسم العيادة الخاصة (للرأسية ورسائل واتساب) */
  clinicName: string;
  /** شعار العيادة الخاصة كنص data:image */
  clinicLogo: string;
};
