// الأنواع الأربعة الأساسية + حتى 8 أماكن عمل مخصّصة (w1..w8) يضيفها المستخدم من الإعدادات
export type CustomSlot = "w1" | "w2" | "w3" | "w4" | "w5" | "w6" | "w7" | "w8";
export type ShiftType = "hospital" | "maxillo" | "private" | "personal" | CustomSlot;

/** إعدادات نوع/مكان عمل قابلة للتعديل (تُدمج فوق القيم الافتراضية) */
export type WorkplaceConfig = {
  label: string;
  short: string;
  icon: string;
  defaultTitle: string;
  start: string;
  end: string;
  endsNextDay: boolean;
  /** المكان الافتراضي الذي يُملأ تلقائيًا عند إنشاء حدث من هذا النوع */
  place: string;
  /** منبّه إجباري افتراضي قبل البداية بالدقائق، أو null */
  alarmMinutes: number | null;
  /** إخفاء النوع الأساسي من القوائم */
  hidden: boolean;
  /** نوع مضاف من المستخدم (وليس أحد الأربعة الأساسية) */
  custom: boolean;
};

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
  title?: string;
  /** لون البطاقة (hex) أو فارغ للافتراضي */
  color?: string;
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
  /** تحدٍّ يجب إتمامه قبل إيقاف الرنين (الافتراضي: بدون) */
  challenge?: AlarmChallenge;
  /** أقصى عدد غفوات مسموح (الافتراضي 2) */
  maxSnoozes?: number;
};

export type AlarmChallenge = "none" | "math" | "hold" | "phrase";

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
  /** رقم الملف الورقي/القديم (من البرنامج السابق) */
  fileNumber?: string;
  /** معرّف المريض في البرنامج السابق (لمنع التكرار عند إعادة الاستيراد) */
  legacyId?: string;
  /** تنبيهات طبية (حساسية، سكري، سيولة...) */
  medicalAlerts?: string;
  notes?: string;
  /** رمز السن (FDI) -> الحالة. غير المذكور = سليم */
  teeth: Record<string, ToothStatus>;
  createdAt: number;
  /** آخر مرة أُرسلت له رسالة استدعاء (متابعة) */
  recalledAt?: number;
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
  /** وقت إرسال تذكير الموعد للمريض */
  remindedAt?: number;
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

export type ExpenseCategory = "rent" | "materials" | "lab" | "salary" | "utilities" | "maintenance" | "other";

/** مصروف للعيادة (يُطرح من المقبوض لحساب الربح الصافي في التقارير) */
export type Expense = {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  note?: string;
  createdAt: number;
};

export type PlanItem = {
  id: string;
  procedure: string;
  tooth?: string;
  cost: number;
  done: boolean;
  /** الجلسة التي أُنشئت عند إنجاز البند (للتراجع) */
  sessionId?: string;
};

/** خطة علاج: بنود مرتّبة بتكلفة تقديرية، وإنجاز البند ينشئ جلسة تلقائيًا */
export type TreatmentPlan = {
  id: string;
  patientId: string;
  title: string;
  items: PlanItem[];
  createdAt: number;
};

export type DrugForm =
  | "tablet" | "capsule" | "ampoule" | "syrup" | "suspension" | "gel"
  | "ointment" | "spray" | "mouthwash" | "toothpaste" | "powder";

/** دواء في دليل الأدوية: يولّد نص الجرعة تلقائيًا في الوصفة */
export type Drug = {
  id: string;
  name: string;
  doseMg?: number;
  timesPerDay: number;
  unitsPerTime: number;
  form: DrugForm;
  notes?: string;
  active: boolean;
  createdAt: number;
};

export type PrescriptionLine = { drug: string; dosage: string };

/** وصفة واحدة بعدة أدوية */
export type Prescription = {
  id: string;
  patientId: string;
  date: string;
  lines: PrescriptionLine[];
  notes?: string;
  createdAt: number;
};

export type InventoryItem = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  /** عند هذه الكمية أو أقل يظهر تنبيه نقص */
  minQuantity: number;
  unitCost: number;
  active: boolean;
  createdAt: number;
};

export type StockMoveKind = "in" | "out" | "adjust";

export type StockMove = {
  id: string;
  itemId: string;
  kind: StockMoveKind;
  /** وارد/صرف: الكمية المتحركة. جرد: الكمية الفعلية الجديدة */
  quantity: number;
  /** الكمية بعد الحركة (للسجل) */
  after: number;
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
  /** تخصيص أنواع/أماكن العمل (الاسم، الأيقونة، الساعات، المكان الافتراضي) */
  workplaces: Partial<Record<ShiftType, Partial<WorkplaceConfig>>>;
  /** قائمة أماكن العمل المعروفة (تظهر كخيارات سريعة في الحدث) */
  places: string[];
  /** إظهار مهام اليوم في الشاشة الرئيسية */
  homeShowTasks: boolean;
  /** تحدٍّ الإيقاف الافتراضي لمنبّهات الأحداث (المناوبات) */
  defaultAlarmChallenge: AlarmChallenge;
  /** اسم التطبيق الظاهر في الرأسية (فارغ = Dentist Planner) */
  appName: string;
  /** شعار التطبيق كنص data:image (فارغ = الأيقونة الافتراضية) */
  logo: string;
  /** اسم العيادة الخاصة (للرأسية ورسائل واتساب) */
  clinicName: string;
  /** شعار العيادة الخاصة كنص data:image */
  clinicLogo: string;
};
