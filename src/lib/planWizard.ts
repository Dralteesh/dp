import { priceInBase } from "@/lib/currency";
import type { PriceItem } from "@/types/extras";
import type { TreatmentPlan } from "@/types";

export type CrownType = "zirconia" | "pfm" | "metal";

export const CROWN_LABEL: Record<CrownType, string> = {
  zirconia: "زيركون",
  pfm: "خزف على معدن",
  metal: "معدن",
};

/** إجابات معالج المعالجة اللبية */
export type EndoAnswers = {
  tooth: string;
  /** حالة عفنة (نخر/التهاب) تستدعي ضمادات قبل الحشو */
  infected: boolean;
  /** عدد جلسات الضماد (2 أو 3) */
  dressings: 2 | 3;
  /** تورم أو ألم شديد: جلسة تصريف وعلاج طارئ أولًا */
  swelling: boolean;
  /** إعادة معالجة لعصب سابق */
  retreatment: boolean;
  post: boolean;
  crown: boolean;
  crownType: CrownType;
  /** بناء السن (Core) قبل التتويج — يسأل فقط إن لم يُوضع وتد (الوتد يتضمن البناء) */
  core: boolean;
  /** أشعة قبل وبعد الحشو */
  xray: boolean;
};

export const DEFAULT_ENDO: EndoAnswers = {
  tooth: "",
  infected: false,
  dressings: 2,
  swelling: false,
  retreatment: false,
  post: false,
  crown: false,
  crownType: "zirconia",
  core: false,
  xray: true,
};

export type DraftItem = { procedure: string; tooth?: string; cost: number };

export type PriceBook = {
  fill: number;
  retreat: number;
  post: number;
  core: number;
  xray: number;
  crown: Record<CrownType, number>;
};

const RX_RETREAT = /(إعادة|اعادة).*(عصب|معالجة|معالجه|لبي)/;
const RX_FILL = /(حشو|حشوة).*(عصب|قنوات|قناة|لب)|معالجة لبية|معالجه لبيه|سحب عصب|^عصب|عصب/;
const RX_POST = /وتد|post/i;
const RX_CORE = /بناء|core/i;
const RX_XRAY = /أشعة|اشعة|شعاعي|x-?ray/i;
const RX_CROWN: Record<CrownType, RegExp> = {
  zirconia: /زيركون|zirconi?a/i,
  pfm: /خزف|بورسلان|pfm/i,
  metal: /معدن|ستانلس|ذهب/i,
};
const RX_CROWN_ANY = /تتويج|تاج|crown|تلبيس/i;

function find(list: PriceItem[], rate: number, test: RegExp, exclude?: RegExp): number {
  for (const it of list) {
    if (!it.active || !test.test(it.name) || (exclude && exclude.test(it.name))) continue;
    const p = priceInBase(it, rate);
    if (p != null) return p;
  }
  return 0;
}

/** يقرأ أسعار الإجراءات من قائمة الأسعار (صفر إن لم يوجد بند مطابق، ويُعدَّل يدويًا في المعاينة) */
export function lookupPrices(list: PriceItem[], rate: number): PriceBook {
  const crownAny = find(list, rate, RX_CROWN_ANY);
  const crown = (t: CrownType) => find(list, rate, RX_CROWN[t], /وتد|بناء/) || crownAny;
  return {
    fill: find(list, rate, RX_FILL, RX_RETREAT),
    retreat: find(list, rate, RX_RETREAT),
    post: find(list, rate, RX_POST),
    core: find(list, rate, RX_CORE, RX_POST),
    xray: find(list, rate, RX_XRAY),
    crown: { zirconia: crown("zirconia"), pfm: crown("pfm"), metal: crown("metal") },
  };
}

/**
 * يبني خطة المعالجة اللبية من الإجابات. الضمادات تدخل في سعر الحشو (تكلفتها صفر).
 * أسماء البنود تحوي «لبية/قنوات» ليتعرّف عليها نوع المريض (عصب)، و«حشو نهائي» ليُعلَّم الحشو النهائي عند الإنجاز.
 */
export function buildEndoPlan(a: EndoAnswers, price: PriceBook): DraftItem[] {
  const tooth = a.tooth.trim() || undefined;
  const out: DraftItem[] = [];
  const add = (procedure: string, cost = 0) => out.push({ procedure, tooth, cost });

  if (a.xray) add("أشعة تشخيصية قبل المعالجة اللبية", price.xray);
  if (a.infected && a.swelling) add("تصريف وعلاج طارئ (تورم/ألم) قبل المعالجة اللبية");
  add(a.retreatment ? "إزالة الحشو القديم وفتح القنوات (إعادة معالجة لبية)" : "فتح السن وتحضير القنوات (معالجة لبية)");
  if (a.infected) {
    for (let i = 1; i <= a.dressings; i++) add(`ضمادة قنوات ${i}/${a.dressings} (ضمن سعر الحشو)`);
  }
  add("حشو نهائي للقنوات (معالجة لبية)", a.retreatment ? price.retreat || price.fill : price.fill);
  if (a.xray) add("أشعة بعد حشو القنوات (معالجة لبية)");
  if (a.post) add("وتد جذري وبناء السن", price.post);
  else if (a.crown && a.core) add("بناء السن (Core) قبل التاج", price.core);
  if (a.crown) {
    add(`تحضير وقياس التاج (${CROWN_LABEL[a.crownType]})`, price.crown[a.crownType]);
    add("تسليم التاج وتثبيته");
  }
  return out;
}

/** هل لدى المريض خطة معالجة لبية ما زال فيها بند غير منجز؟ */
export function hasOpenEndoPlan(plans: TreatmentPlan[], patientId: string, isEndo: (s: string) => boolean): boolean {
  return plans.some((p) => p.patientId === patientId && p.items.some((i) => !i.done && isEndo(i.procedure)));
}
