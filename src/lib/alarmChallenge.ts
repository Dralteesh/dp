import type { AlarmChallenge } from "@/types";

export const CHALLENGE_LABELS: Record<AlarmChallenge, { label: string; hint: string; icon: string }> = {
  none: { label: "بدون", hint: "إيقاف مباشر", icon: "remove-circle-outline" },
  math: { label: "مسائل حسابية", hint: "حلّ 3 مسائل متتالية", icon: "calculator-outline" },
  hold: { label: "ضغط مطوّل", hint: "اضغط باستمرار 10 ثوانٍ دون رفع إصبعك", icon: "finger-print-outline" },
  phrase: { label: "كتابة جملة", hint: "اكتب الجملة المعروضة حرفيًا", icon: "create-outline" },
};

export const MAX_SNOOZES_DEFAULT = 2;
export const HOLD_SECONDS = 10;
export const MATH_ROUNDS = 3;

export type MathProblem = { text: string; answer: number };

const rnd = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;

/** مسألة تحتاج تفكيرًا بسيطًا (ضرب رقم بعدد من خانتين + جمع) حتى لا تُحلّ وأنت نائم */
export function makeMathProblem(): MathProblem {
  const kind = rnd(0, 2);
  if (kind === 0) {
    const a = rnd(12, 29);
    const b = rnd(3, 9);
    return { text: `${a} × ${b}`, answer: a * b };
  }
  if (kind === 1) {
    const a = rnd(120, 480);
    const b = rnd(35, 190);
    return { text: `${a} + ${b}`, answer: a + b };
  }
  const a = rnd(300, 900);
  const b = rnd(40, 260);
  return { text: `${a} − ${b}`, answer: a - b };
}

const PHRASES = [
  "أنا مستيقظ تمامًا وجاهز ليومي",
  "الصلاة خير من النوم",
  "سأنهض الآن ولن أعود إلى الفراش",
  "مرضاي ينتظرونني وعليّ أن أكون جاهزًا",
  "كل دقيقة تأخير تكلّفني أكثر مما أظن",
];

export const randomPhrase = () => PHRASES[rnd(0, PHRASES.length - 1)];

/** عدّاد الغفوات لكل رنين (يُصفَّر عند إغلاق التطبيق، وهذا كافٍ لجلسة رنين واحدة) */
const snoozeCounts = new Map<string, number>();
export const getSnoozeCount = (key: string) => snoozeCounts.get(key) ?? 0;
export const bumpSnooze = (key: string) => snoozeCounts.set(key, getSnoozeCount(key) + 1);
export const clearSnooze = (key: string) => snoozeCounts.delete(key);

/** يحوّل الأرقام العربية-الهندية إلى لاتينية لمقارنة إجابات المسائل */
export function normalizeDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}
