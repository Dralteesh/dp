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
