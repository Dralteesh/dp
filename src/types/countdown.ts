/** أنواع ميزة «لحظاتي»: عدّادات تنازلية وتصاعدية */

export type CdDirection = "down" | "up";
export type CdUnitMode = "auto" | "full" | "seconds" | "minutes" | "hours" | "days" | "weeks" | "months" | "years";
export type CdRepeatType = "none" | "daily" | "weekly" | "monthly" | "yearly" | "days";
export type CdRepeat = { type: CdRepeatType; /** لنوع «كل N يوم» */ every?: number };
export type CdBgKind = "color" | "gradient" | "image" | "video";
export type CdTextPos = "top" | "center" | "bottom";
export type CdFont = "cairo" | "amiri";
export type CdReminder = { id: string; /** دقائق قبل الحدث */ minutes: number };

export type CdBackground = {
  kind: CdBgKind;
  /** معرّف تدرّج جاهز (لنوع gradient) */
  gradient?: string;
  /** مسار ملف محلي (image/video) */
  uri?: string;
  /** تعتيم فوق الصورة/الفيديو 0..0.8 لقراءة النص */
  dim?: number;
};

export type CdTextStyle = { pos: CdTextPos; /** 0.7..1.5 */ scale: number; /** 0.4..1 */ opacity: number; font: CdFont };

export type Countdown = {
  id: string;
  title: string;
  description?: string;
  emoji: string;
  direction: CdDirection;
  /** YYYY-MM-DD بتوقيت الجهاز (وقت الجدار) */
  date: string;
  /** HH:mm */
  time: string;
  /** إن وُجد: لحظة مطلقة ثابتة مهما تغيّرت المنطقة الزمنية (رحلة طيران مثلًا) */
  instantMs?: number;
  repeat: CdRepeat;
  unit: CdUnitMode;
  color: string;
  bg: CdBackground;
  text: CdTextStyle;
  reminders: CdReminder[];
  notifyAtEvent: boolean;
  favorite: boolean;
  pinned: boolean;
  /** بداية الفترة لحساب نسبة التقدّم (الافتراضي: وقت الإنشاء) */
  startAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type CdSort = "nearest" | "newest" | "favorite" | "name";
export type CdFilter = "all" | "upcoming" | "past" | "favorite" | "repeating";
export type CdThemeMode = "auto" | "light" | "dark";
