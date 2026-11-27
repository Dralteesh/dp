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
  /** عدد الأيام بعد يوم البداية الذي تنتهي فيه (مناوبة 48 ساعة فأكثر). فارغ = endsNextDay ? 1 : 0 */
  extraDays?: number;
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
  /** أحداث أُنشئت معًا من «جدولة الدوامات»: تُحذف دفعة واحدة */
  seriesId?: string;
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
  /** إعدادات التحدّي (الكود المسجّل، الموقع، عدد الخطوات) */
  challengeData?: AlarmChallengeData;
  /** ربط المنبّه بالطقس: يُقدَّم الرنين shiftMin دقيقة إن توقّع الطقس الحالة خلال 3 ساعات بعده */
  weatherLink?: { mode: "rain" | "heat" | "cold"; shiftMin: number };
};

export type AlarmChallenge =
  | "none"
  | "math"
  | "hold"
  | "phrase"
  | "memory"
  | "shake"
  | "steps"
  | "qr"
  | "photo"
  | "location";

export type AlarmChallengeData = {
  /** محتوى الباركود/QR المسجّل */
  qr?: string;
  /** الموقع المطلوب الوصول إليه */
  lat?: number;
  lng?: number;
  /** نصف القطر بالأمتار */
  radius?: number;
  /** عدد الخطوات المطلوبة */
  steps?: number;
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

/** علامات رسم إضافية على السن (من Toothmap): تُجمع مع حالة السن */
export type ToothMark = "x" | "slash" | "pin" | "circle" | "mesial" | "distal" | "two" | "dot";

/** تنبيهات طبية مصنّفة: تظهر بشريط بارز وتفحص الوصفات والإجراءات */
export type AlertFlag =
  | "anesthesia_allergy"
  | "penicillin_allergy"
  | "nsaid_allergy"
  | "latex_allergy"
  | "anticoagulant"
  | "bleeding"
  | "pregnant"
  | "diabetes"
  | "hypertension"
  | "heart"
  | "asthma"
  | "kidney"
  | "infectious";

/** مبلغ بعملة أجنبية: الحقل amount في الكيان يبقى بعملة العيادة الأساسية، وهذا يحفظ أصل المبلغ وسعر الصرف وقت التسجيل */
export type ForeignAmount = { currency: "USD"; amount: number; rate: number };

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
  /** تنبيهات طبية مصنّفة (تُضاف لما يُستنتج من نص medicalAlerts) */
  alertFlags?: AlertFlag[];
  /** وسوم ملوّنة حرة (VIP، تقويم، يحتاج تخديراً حذراً...) */
  tags?: string[];
  /** مخطط الأسنان المختار يدويًا (يتقدّم على الاختيار حسب العمر) */
  dentition?: "primary" | "mixed" | "permanent";
  /** أنواع المريض المضافة/المُزالة يدويًا فوق الكشف التلقائي (تقويم، تيجان، زرع، أطفال، عصب) */
  typeAdd?: ("ortho" | "crowns" | "implant" | "pedo" | "endo")[];
  typeRemove?: ("ortho" | "crowns" | "implant" | "pedo" | "endo")[];
  /** علامات المواعيد المقترحة تلقائيًا التي أُنشئت سابقًا (لمنع إعادة إنشاء موعد حذفه الطبيب) */
  autoDone?: string[];
  notes?: string;
  /** رمز السن (FDI) -> الحالة. غير المذكور = سليم */
  teeth: Record<string, ToothStatus>;
  /** ملاحظة سريرية لكل سن (FDI -> نص). غير المذكور = بلا ملاحظة */
  toothNotes?: Record<string, string>;
  /** علامات رسم على الأسنان (FDI -> علامات). غير المذكور = بلا علامات */
  toothMarks?: Record<string, ToothMark[]>;
  /** جسور/تجبير: كل جسر قائمة أسنان مرتّبة (FDI) */
  bridges?: string[][];
  createdAt: number;
  /** آخر مرة أُرسلت له رسالة استدعاء (متابعة) */
  recalledAt?: number;
  /** قواعد المتابعة الدورية (تقويم كل 5 أسابيع، تنظيف كل 6 أشهر...) — انظر src/lib/periodic.ts */
  followUps?: FollowUpRule[];
};

/** قاعدة متابعة دورية لمريض: تستحق بعد everyDays من آخر زيارة مطابقة (أو من anchor) */
export type FollowUpRule = {
  id: string;
  label: string;
  everyDays: number;
  /** نص تعبير نمطي يطابق إجراء الزيارة التي تُعيد ضبط العدّاد؛ إن غاب فأي زيارة تُعيد ضبطه */
  matchSource?: string;
  /** تاريخ بداية العدّ (YYYY-MM-DD) إن لم توجد زيارة مطابقة */
  anchor: string;
  active: boolean;
};

/** حقول خاصة بنوع المريض تُحفظ مع الموعد (تُملأ في نموذج الموعد وتُستعمل عند إنهاء الزيارة) */
export type ApptExtra = {
  ortho?: { work?: string; wire?: string; elastics?: string; nextWeeks?: number };
  implant?: { stage?: string; system?: string; size?: string };
  endo?: { stage?: string; canals?: string };
  crowns?: { stage?: string; labOrderId?: string };
  pedo?: { work?: string };
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
  /** بنود خطة العلاج المرتبطة بهذا الموعد (التنفيذ عند إنهاء الزيارة) */
  planItemIds?: string[];
  /** الأسنان التي يُعمل عليها في هذا الموعد (FDI) */
  teeth?: string[];
  /** إعدادات خاصة بنوع المريض (تقويم/زرع/عصب/تيجان/أطفال) */
  extra?: ApptExtra;
  /** اكتملت الزيارة عبر completeVisit (لمنع التنفيذ المزدوج) */
  visitDone?: boolean;
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
  /** إن سُجّلت التكلفة بالدولار */
  foreign?: ForeignAmount;
  createdAt: number;
};

export type Payment = {
  id: string;
  patientId: string;
  date: string;
  amount: number;
  /** إن دُفعت بالدولار: amount = المبلغ بالدولار × سعر الصرف وقت الدفع */
  foreign?: ForeignAmount;
  note?: string;
  /** خطة العلاج التي دُفعت لها (اختياري؛ الدفعات القديمة بلا خطة تُحسب على حساب المريض عمومًا) */
  planId?: string;
  createdAt: number;
};

export type ExpenseCategory = "rent" | "materials" | "lab" | "salary" | "utilities" | "maintenance" | "other";

/** مصروف للعيادة (يُطرح من المقبوض لحساب الربح الصافي في التقارير) */
export type Expense = {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  foreign?: ForeignAmount;
  note?: string;
  /** خطة العلاج التي يخصّها المصروف (مخبر/مواد) لحساب ربح الخطة */
  planId?: string;
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
  /** الأسنان (FDI). السجلات الجديدة سنّ واحد لكل بند؛ tooth يبقى للتوافق مع القديم */
  teeth?: string[];
  /** التاريخ المستهدف لتنفيذ البند (يُحسب من مراحل العلاج) — يغذّي «يحتاجون موعدًا» */
  dueOn?: string;
  /** المرحلة ضمن مسار علاج (انظر src/lib/workflows.ts) */
  flow?: { id: string; step: number };
  /** خصم على البند بعملة العيادة؛ الصافي = cost − discount (انظر src/lib/planFinance.ts) */
  discount?: number;
  /** سبب الخصم */
  discountNote?: string;
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
  | "turkey"
  | "dubai"
  | "kuwait"
  | "qatar"
  | "north_america"
  | "singapore";

/** موقع حساب الأوقات (null = حماه الافتراضي) */
export type PrayerLocation = { name: string; lat: number; lng: number };

/** مسجد محلي: الإقامة بعد الأذان بالدقائق لكل صلاة */
export type MosqueProfile = { name: string; iqama: Partial<Record<PrayerKey, number>> };

/** تذكيرات الصلاة: قبل الصلاة، عند الأذان، وتكرار بعد الأذان حتى الصلاة التالية */
export type PrayerReminders = {
  before: { enabled: boolean; minutes: number };
  atAdhan: { enabled: boolean; /** صوت الأذان الكامل بدل نغمة الإشعار */ sound: boolean };
  repeat: { enabled: boolean; everyMin: number; quietFrom: string; quietTo: string };
  /** وضع «عدم الإزعاج» الذكي: تُرسَل إشعارات المواعيد والمهام بصمت داخل نافذة الصلاة (من الأذان حتى بعده بـ minutes) */
  quiet: { enabled: boolean; minutes: number };
};

/** تذكير الأذكار على مدار اليوم */
export type DhikrSettings = {
  enabled: boolean;
  mode: "interval" | "count";
  everyMin: number;
  countPerDay: number;
  from: string;
  to: string;
  avoidPrayerMin: number;
  texts: string[];
};

/** عنصر في نافذة الإضافة السريعة (قابل للتخصيص والترتيب) */
export type QuickAddItem = {
  /** معرّف ثابت */
  id: string;
  /** نوع حدث (دوام/مناوبة...) أو وجهة شاشة */
  kind: "event-type" | "route";
  /** عند kind="event-type" */
  type?: ShiftType;
  /** النص (فارغ لنوع حدث = اسم النوع الحالي) */
  label: string;
  /** اسم أيقونة Ionicons (فارغ لنوع حدث = أيقونة النوع) */
  icon: string;
  /** اللون hex (اختياري: الافتراضي لون النوع أو لون التطبيق) */
  hex?: string;
  /** عند kind="route" مثل "/tasks" */
  route?: string;
  visible: boolean;
};

/** ضبط الجدول الأسبوعي في الرئيسية */
export type TimelinePrefs = {
  /** عدد الأيام (3 أو 5 أو 7) واليوم المحدّد في المنتصف */
  days: number;
  /** ارتفاع كل 15 دقيقة فيها مواعيد (بكسل) */
  densePx: number;
  /** ارتفاع كل 15 دقيقة فارغة أو فيها دوام فقط (بكسل) */
  basePx: number;
  /** أقصى ارتفاع مفضّل للجدول (بكسل) */
  maxH: number;
  /** أدنى ارتفاع لبطاقة موعد (بكسل) */
  minCardH: number;
  /** ما طوله هذا العدد من الساعات فأكثر يُعدّ دوامًا/مناوبة (خلفية لا توسّع الوقت) */
  longHours: number;
};

export type Settings = {
  doctorName: string;
  prayerMethod: PrayerMethodKey;
  madhab: "shafi" | "hanafi";
  /** تعديل يدوي بالدقائق لكل صلاة */
  prayerAdjust: Partial<Record<PrayerKey, number>>;
  /** تفعيل إشعار كل صلاة */
  prayerNotify: Record<PrayerKey, boolean>;
  /** تقسيم الدخل في الإحصاءات: نسبة الطبيب ونسبة المواد (%)، والباقي للعيادة */
  incomeSplit: { doctorPct: number; materialsPct: number };
  /** موقع الصلاة والقبلة؛ null = حماه */
  location: PrayerLocation | null;
  /** مسجدي: أوقات الإقامة */
  mosque: MosqueProfile | null;
  /** ترجمة القرآن: none أو معرّف إصدار alquran.cloud مثل en.sahih */
  quranTranslation: string;
  /** تذكيرات الصلاة (قبل/أذان/تكرار) */
  prayerReminders: PrayerReminders;
  /** تذكير الأذكار */
  dhikr: DhikrSettings;
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
  /** إظهار «المستندات الأخيرة» في الشاشة الرئيسية */
  homeShowDocs: boolean;
  /** بنود الإضافة السريعة بترتيب المستخدم (null = القائمة الافتراضية) */
  quickAdd: QuickAddItem[] | null;
  /** أدوات نافذة الصلاة (ضغط مطوّل على تبويب الصلاة) بترتيب المستخدم؛ null = الافتراضي */
  prayerTools: string[] | null;
  /** أدوات نافذة العيادة (ضغط مطوّل على تبويب العيادة)؛ null = الكل بالترتيب الافتراضي */
  clinicTools: string[] | null;
  /** الواجهة المعتمدة عند فتح التطبيق: الجديدة (planner) أو الكلاسيكية (classic) */
  uiMode: "planner" | "classic";
  /** true: تحوّل التطبيق تلقائيًا للواجهة الاحتياطية بعد عطل، ويُعاد المحاولة مع الفتح التالي */
  uiFallback: boolean;
  /** ضبط الجدول الأسبوعي في الرئيسية */
  timeline: TimelinePrefs;
  /** كتالوج الإجراءات القابل للتعديل؛ null = الافتراضي */
  procedures: ProcedureDef[] | null;
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
  /** سعر الدولار بعملة العيادة (0 = غير مضبوط) */
  usdRate: number;
  /** أجر المناوبة/الدوام الواحد لكل نوع (بعملة العيادة) */
  payRates: Partial<Record<ShiftType, number>>;
  /** راتب شهري ثابت (المشفى) */
  monthlySalary: number;
};

/** أيقونة إجراء علاجي: مرسلة مع التطبيق، أو من Ionicons، أو صورة اختارها المستخدم (data:image) */
export type ProcedureIcon =
  | { kind: "asset"; key: string }
  | { kind: "ionicon"; name: string }
  | { kind: "image"; uri: string };

export type ProcedureDef = {
  id: string;
  name: string;
  /** المدة الافتراضية بالدقائق */
  minutes: number;
  icon: ProcedureIcon;
  /** كلمات تُطابق الأسماء الحرة (مثل: عصب، لبية، RCT) */
  keywords: string[];
};
