import type { ForeignAmount } from "@/types";

/** بند في قائمة أسعار الإجراءات */
export type PriceItem = {
  id: string;
  name: string;
  /** السعر بالعملة المحددة في currency */
  price: number;
  currency: "base" | "USD";
  /** المدة الافتراضية بالدقائق (اختياري) */
  minutes?: number;
  active: boolean;
  createdAt: number;
};

export type PartOfDay = "any" | "morning" | "afternoon" | "evening";
export type WaitStatus = "waiting" | "notified" | "booked" | "dropped";

/** مريض يريد موعدًا أبكر */
export type WaitEntry = {
  id: string;
  patientId: string;
  procedure: string;
  /** نطاق الأيام المناسب له (اختياري) */
  from?: string;
  to?: string;
  part: PartOfDay;
  notes?: string;
  status: WaitStatus;
  notifiedAt?: number;
  createdAt: number;
};

/** دورة تعقيم أو اختبار بيولوجي (spore test) */
export type SterilCycle = {
  id: string;
  kind: "cycle" | "spore";
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm */
  time: string;
  device: string;
  /** محتوى الحمولة (مثال: قبضات، أدوات جراحة) */
  load: string;
  tempC?: number;
  minutes?: number;
  /** نجح المؤشر الكيميائي/البيولوجي */
  passed: boolean;
  /** مدة صلاحية الأدوات المعقّمة بالأيام */
  validDays: number;
  notes?: string;
  createdAt: number;
};

export type { ForeignAmount };

/** زيارة تقويم */
export type OrthoVisit = {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** ما أُجري (تبديل سلك، ربط، ...) */
  done: string;
  /** خطة الزيارة القادمة */
  next?: string;
};

/** ملف حالة التقويم لمريض (واحد لكل مريض) */
export type OrthoCase = {
  id: string;
  patientId: string;
  /** I / II-1 / II-2 / III */
  angleClass?: "I" | "II-1" | "II-2" | "III";
  /** القاطع: overjet / overbite بالملم */
  overjet?: string;
  overbite?: string;
  /** ازدحام (+) أو فراغات (−) بالملم في الفك العلوي والسفلي */
  spaceUpper?: string;
  spaceLower?: string;
  /** الفحص السريري والمشاكل */
  exam?: string;
  problems?: string;
  /** خطة المعالجة والأجهزة */
  plan?: string;
  appliance?: string;
  startDate?: string;
  endDate?: string;
  visits: OrthoVisit[];
  createdAt: number;
};

/** نموذج موافقة مستنيرة مملوء لمريض */
export type ConsentRecord = {
  id: string;
  patientId: string;
  templateId: string;
  title: string;
  /** النص النهائي بعد ملء الاسم والتاريخ، يمكن تعديله قبل الحفظ */
  body: string;
  /** YYYY-MM-DD */
  date: string;
  /** وُقّع على الورق/الشاشة */
  signed: boolean;
  createdAt: number;
};

export type InstallmentItem = {
  id: string;
  /** YYYY-MM-DD */
  due: string;
  amount: number;
  /** تاريخ السداد، وغيابه = غير مسدد */
  paidOn?: string;
  /** الدفعة المسجلة في حساب المريض عند السداد (للتراجع) */
  paymentId?: string;
};

/** خطة تقسيط لمريض */
export type InstallPlan = {
  id: string;
  patientId: string;
  title: string;
  items: InstallmentItem[];
  note?: string;
  createdAt: number;
};

export type LabStatus = "sent" | "received" | "fitted";

/** طلب لمخبر الأسنان */
export type LabOrder = {
  id: string;
  patientId: string;
  /** العمل المطلوب: تاج زركون، طقم... */
  work: string;
  tooth?: string;
  labName?: string;
  labPhone?: string;
  /** YYYY-MM-DD */
  sentOn: string;
  dueOn?: string;
  status: LabStatus;
  /** أجرة المخبر */
  cost?: number;
  paid: boolean;
  notes?: string;
  createdAt: number;
};
