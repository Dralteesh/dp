import type { AlertFlag, Patient } from "@/types";

export const ALERT_META: Record<AlertFlag, { label: string; level: "high" | "mid" }> = {
  anesthesia_allergy: { label: "حساسية بنج", level: "high" },
  penicillin_allergy: { label: "حساسية بنسلين", level: "high" },
  nsaid_allergy: { label: "حساسية مضادات التهاب/أسبرين", level: "high" },
  latex_allergy: { label: "حساسية لاتكس", level: "high" },
  anticoagulant: { label: "يتناول مميّعًا للدم", level: "high" },
  bleeding: { label: "اضطراب نزف", level: "high" },
  pregnant: { label: "حامل/مرضع", level: "high" },
  infectious: { label: "مرض معدٍ", level: "high" },
  diabetes: { label: "سكري", level: "mid" },
  hypertension: { label: "ضغط", level: "mid" },
  heart: { label: "قلب", level: "mid" },
  asthma: { label: "ربو", level: "mid" },
  kidney: { label: "كلية", level: "mid" },
};

export const ALERT_ORDER = Object.keys(ALERT_META) as AlertFlag[];

/** يوحّد الألف والتاء المربوطة والتشكيل ليسهل المطابقة */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

const ALLERGY = /حساس|تحسس|allerg/;
const ASPIRIN = /اسبرين|aspirin/;

/** يستنتج التنبيهات من النص الحر الذي يكتبه الطبيب (مجرد اقتراح؛ لا يحلّ محل التصنيف اليدوي) */
export function detectFlags(text?: string): AlertFlag[] {
  if (!text?.trim()) return [];
  const t = norm(text);
  const allergic = ALLERGY.test(t);
  const out = new Set<AlertFlag>();
  if (allergic && /بنج|مخدر|ليدو|ارتيكاين|articaine|lidocaine/.test(t)) out.add("anesthesia_allergy");
  if (allergic && /بنسلين|اموكسي|اوغمنتين|اوغمانتين|penicillin|amoxi|augmentin/.test(t)) out.add("penicillin_allergy");
  if (allergic && /ايبوبروفين|بروفين|ديكلوفيناك|مضاد(ات)? (ال)?التهاب|nsaid|ibuprofen|diclofenac|ناب?روكسين/.test(t)) out.add("nsaid_allergy");
  if (allergic && ASPIRIN.test(t)) out.add("nsaid_allergy");
  if (allergic && /لاتكس|latex/.test(t)) out.add("latex_allergy");
  if (/مميع|سيوله|وارفارين|وارفرين|كلوبيدوجريل|بلافيكس|ريفاروكسابان|زارلتو|warfarin|clopidogrel|plavix|anticoag/.test(t)) out.add("anticoagulant");
  if (!allergic && ASPIRIN.test(t)) out.add("anticoagulant");
  if (/نزف|نزيف|هيموفيليا|نقص صفيحات|hemophil|bleeding/.test(t)) out.add("bleeding");
  if (/حامل|حمل|رضاع|مرضع|pregnan/.test(t)) out.add("pregnant");
  if (/سكري|سكر|diabet/.test(t)) out.add("diabetes");
  if (/ضغط|hypertens/.test(t)) out.add("hypertension");
  if (/قلب|صمام|جلطه|ذبحه|cardiac|heart/.test(t)) out.add("heart");
  if (/ربو|asthma/.test(t)) out.add("asthma");
  if (/(^|\s)كلي(\s|$)|كليه|كلوي|غسيل كلي|kidney|renal/.test(t)) out.add("kidney");
  if (/التهاب (ال)?كبد|كبد وبائي|hepatitis|hbv|hcv|hiv|ايدز|ايز(\s|$)/.test(t)) out.add("infectious");
  return [...out];
}

/** التنبيهات الفعلية للمريض: المصنّفة يدويًا + المستنتجة من النص، الأخطر أولًا */
export function patientFlags(p: Pick<Patient, "alertFlags" | "medicalAlerts">): AlertFlag[] {
  const set = new Set<AlertFlag>([...(p.alertFlags ?? []), ...detectFlags(p.medicalAlerts)]);
  return ALERT_ORDER.filter((f) => set.has(f)).sort((a, b) =>
    ALERT_META[a].level === ALERT_META[b].level ? 0 : ALERT_META[a].level === "high" ? -1 : 1,
  );
}

const PENICILLIN = /اموكسي|اوغمنتين|اوغمانتين|بنسلين|امبيسلين|كلافوكس|كلاموكس|ampicillin|amoxi|augmentin|penicillin|clavulan/;
const NSAID = /ايبوبروفين|بروفين|ديكلوفيناك|فولتارين|اسبرين|نابروكسين|ناربوكسين|كيتورولاك|ibuprofen|brufen|diclofenac|voltaren|aspirin|naproxen|ketorolac|مضاد التهاب/;
const PREGNANCY_RISK = /تتراسيكلين|دوكسيسيكلين|ميترونيدازول|فلاجيل|سيبروفلوكساسين|كلاريثروميسين|tetracycline|doxycycline|metronidazole|flagyl|ciprofloxacin|clarithro|ibuprofen|ايبوبروفين|ديكلوفيناك|diclofenac/;

/** تحذيرات عند وصف دواء لمريض لديه تنبيهات. مساعدة للتذكير فقط ولا تغني عن تقديرك. */
export function drugWarnings(flags: AlertFlag[], drugName: string): string[] {
  const d = norm(drugName);
  if (!d.trim()) return [];
  const f = new Set(flags);
  const out: string[] = [];
  if (f.has("penicillin_allergy") && PENICILLIN.test(d)) out.push("حساسية بنسلين: هذا الدواء من عائلة البنسلين.");
  if (f.has("nsaid_allergy") && NSAID.test(d)) out.push("حساسية مضادات الالتهاب/الأسبرين: هذا الدواء منها.");
  if (f.has("anticoagulant") && NSAID.test(d)) out.push("يتناول مميّعًا للدم: مضادات الالتهاب ترفع خطر النزف.");
  if (f.has("kidney") && NSAID.test(d)) out.push("مرض كلوي: تجنّب مضادات الالتهاب أو راجع الجرعة.");
  if (f.has("asthma") && NSAID.test(d)) out.push("ربو: الأسبرين ومضادات الالتهاب قد تحرّض نوبة.");
  if (f.has("pregnant") && PREGNANCY_RISK.test(d)) out.push("حمل/إرضاع: تحقّق من أمان هذا الدواء.");
  return out;
}

const SURGICAL = /قلع|جراح|زرع|لثه|خراج|قطب|surg|extract|implant/;

/** تحذيرات قبل إجراء معيّن */
export function procedureWarnings(flags: AlertFlag[], procedure: string): string[] {
  const p = norm(procedure);
  const f = new Set(flags);
  const out: string[] = [];
  if (f.has("latex_allergy")) out.push("حساسية لاتكس: استخدم قفازات وأدوات خالية من اللاتكس.");
  if (f.has("infectious")) out.push("مرض معدٍ: طبّق احتياطات التعقيم الإضافية.");
  if (f.has("anticoagulant") && SURGICAL.test(p)) out.push("يتناول مميّعًا: تحقّق من INR واحتياطات النزف قبل الإجراء.");
  if (f.has("bleeding") && SURGICAL.test(p)) out.push("اضطراب نزف: راجع الطبيب المعالج قبل أي إجراء جراحي.");
  if (f.has("diabetes") && SURGICAL.test(p)) out.push("سكري: تأكد من ضبط السكر وأنه تناول وجبته.");
  if (f.has("heart") && SURGICAL.test(p)) out.push("مريض قلب: قد يحتاج استشارة طبيب القلب قبل الإجراء.");
  if (f.has("pregnant") && /اشعه|تبييض|زرع|xray|x-ray|bleach/.test(p)) out.push("حمل: تجنّب الأشعة والإجراءات الاختيارية.");
  if (f.has("anesthesia_allergy") && /قلع|حشو|معالجه|لبي|جراح|زرع|بنج|filling|rct|extract/.test(p))
    out.push("حساسية بنج: تأكد من نوع المخدّر المناسب.");
  return out;
}
