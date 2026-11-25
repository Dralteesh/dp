import type { Patient, Priority, ShiftType } from "@/types";

/**
 * محلّل جمل عربية حرة (بلا إنترنت) يحوّل ما يكتبه الطبيب إلى مهمة أو منبّه أو موعد أو حدث أو ملاحظة.
 * مثال: «غدًا الساعة 5 مساءً موعد مع أحمد حشوة» ← موعد عيادة.
 */

export type SmartKind = "task" | "alarm" | "note" | "appointment" | "event";

export type SmartIntent = {
  kind: SmartKind;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** هل ذُكر تاريخ أو وقت نسبي صراحةً؟ */
  dateExplicit: boolean;
  /** HH:mm (غير موجود إن لم يُذكر وقت) */
  time?: string;
  durationMin?: number;
  priority?: Priority;
  patientId?: string;
  patientName?: string;
  procedure?: string;
  eventType?: ShiftType;
  /** أيام تكرار للمنبّه (0=الأحد) إن قال «كل يوم» أو «كل خميس» */
  repeatDays?: number[];
  /** ثقة التفسير 0..1 */
  confidence: number;
};

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const plusDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** يوحّد النص: أرقام عربية→لاتينية، همزات، تاء مربوطة، تشكيل، مسافات */
export function normAr(s: string): string {
  return s
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[،,؛;؟?!]/g, " ")
    .replace(/:(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NUM_WORDS: Record<string, number> = {
  واحد: 1, واحده: 1, اثنين: 2, اثنان: 2, ثلاث: 3, ثلاثه: 3, اربع: 4, اربعه: 4, خمس: 5, خمسه: 5, ست: 6, سته: 6,
  سبع: 7, سبعه: 7, ثماني: 8, ثمانيه: 8, تسع: 9, تسعه: 9, عشر: 10, عشره: 10,
};
const NUM_ALT = Object.keys(NUM_WORDS).join("|");
/** رقم أو كلمة رقم (ثلاث/خمسة...) */
const numOf = (v: string | undefined): number | undefined => (v === undefined ? undefined : /^\d/.test(v) ? Number(v) : NUM_WORDS[v]);

const WEEKDAYS: [RegExp, number][] = [
  [/(?:^| )(?:يوم )?الاحد(?= |$)/, 0],
  [/(?:^| )(?:يوم )?(?:الاثنين|الاتنين)(?= |$)/, 1],
  [/(?:^| )(?:يوم )?الثلاثاء?(?= |$)|(?:^| )(?:يوم )?التلات(?:اء|ا)?(?= |$)/, 2],
  [/(?:^| )(?:يوم )?(?:الاربعاء?|الاربعا)(?= |$)/, 3],
  [/(?:^| )(?:يوم )?الخميس(?= |$)/, 4],
  [/(?:^| )(?:يوم )?الجمعه(?= |$)/, 5],
  [/(?:^| )(?:يوم )?السبت(?= |$)/, 6],
];

const MONTHS: [RegExp, number][] = [
  [/(?:كانون الثاني|يناير)/, 1],
  [/(?:شباط|فبراير)/, 2],
  [/(?:اذار|مارس)/, 3],
  [/(?:نيسان|ابريل)/, 4],
  [/(?:ايار|مايو)/, 5],
  [/(?:حزيران|يونيو|يونيه)/, 6],
  [/(?:تموز|يوليو|يوليه)/, 7],
  [/(?:اب|اغسطس)/, 8],
  [/(?:ايلول|سبتمبر)/, 9],
  [/(?:تشرين الاول|اكتوبر)/, 10],
  [/(?:تشرين الثاني|نوفمبر)/, 11],
  [/(?:كانون الاول|ديسمبر)/, 12],
];

const PROCEDURES = [
  "حشوه", "حشو", "قلع", "خلع", "تنظيف", "تبييض", "تقويم", "عصب", "سحب عصب", "علاج لبي", "زرع", "تاج", "تلبيس", "جسر",
  "كشف", "استشاره", "تركيب", "طقم", "تثبيت", "جراحه", "تخدير", "فحص", "متابعه", "اشعه", "تلميع", "ترميم", "فينير",
];

const STOP = new Set([
  "ال", "في", "على", "الى", "من", "عن", "مع", "ب", "ل", "و", "ان", "ان", "يا", "لي", "لنا", "بعد", "قبل", "عند", "هذا", "هذه",
  "اضف", "اضافه", "اضيف", "سجل", "اريد", "ابغى", "ابي", "بدي", "لو", "سمحت", "رجاء", "من فضلك", "الساعه", "ساعه", "يوم",
  "غدا", "بكره", "بكرا", "اليوم", "الليله", "الليلة", "صباحا", "مساء", "ظهرا", "عصرا", "ليلا", "فجرا",
  "ذكرني", "نبهني", "ايقظني", "صحيني", "موعد", "حجز", "مهمه", "منبه", "ملاحظه", "تذكير", "مهم", "عاجل", "ضروري",
]);

type Hit = { start: number; end: number };

function cut(text: string, hits: Hit[]): string {
  const sorted = [...hits].sort((a, b) => b.start - a.start);
  let out = text;
  for (const h of sorted) out = out.slice(0, h.start) + " " + out.slice(h.end);
  return out.replace(/\s+/g, " ").trim();
}

function find(text: string, re: RegExp): { m: RegExpExecArray; hit: Hit } | null {
  const m = re.exec(text);
  if (!m) return null;
  return { m, hit: { start: m.index, end: m.index + m[0].length } };
}

type PartPeriod = "am" | "pm" | "noon" | "night" | null;

function periodOf(t: string): PartPeriod {
  if (/(?:^| )(?:صباحا|صباح|الصبح|فجرا|الفجر|ص)(?= |$)/.test(t)) return "am";
  if (/(?:^| )(?:ظهرا|الظهر|ظهر)(?= |$)/.test(t)) return "noon";
  if (/(?:^| )(?:عصرا|العصر|مساء|مساءا|المغرب|العشاء|م|بعد الظهر|بعد العصر)(?= |$)/.test(t)) return "pm";
  if (/(?:^| )(?:ليلا|الليل|بالليل|منتصف الليل)(?= |$)/.test(t)) return "night";
  return null;
}

function to24(h: number, p: PartPeriod, kind: SmartKind | null): number {
  if (h > 12) return h;
  if (p === "am") return h === 12 ? 0 : h;
  if (p === "noon") return h === 12 ? 12 : h < 6 ? h + 12 : h;
  if (p === "pm") return h === 12 ? 12 : h + 12;
  if (p === "night") return h === 12 ? 0 : h >= 6 ? h + 12 : h;
  // بلا إشارة: المنبّه صباحًا غالبًا، والمواعيد 1–6 عصرًا
  if (kind === "alarm") return h === 12 ? 12 : h;
  if (h >= 1 && h <= 6) return h + 12;
  return h;
}

/** يستخرج الوقت من النص؛ يعيد null إن لم يجد */
function extractTime(
  t: string,
  now: Date,
  kind: SmartKind | null,
): { time: string; hits: Hit[]; relative?: Date } | null {
  // بعد N دقيقة/ساعة
  const hh = find(t, /(?:^| )بعد ساعه (?:و ?(نصف|ربع))(?= |$)/);
  if (hh) {
    const at = new Date(now.getTime() + (hh.m[1] === "نصف" ? 90 : 75) * 60000);
    return { time: `${pad(at.getHours())}:${pad(at.getMinutes())}`, hits: [hh.hit], relative: at };
  }
  const rel = find(
    t,
    new RegExp(`(?:^| )بعد (?:(\\d+(?:\\.\\d+)?|${NUM_ALT}) )?(نصف ساعه|ربع ساعه|ساعتين|ساعه|ساعات|دقيقه|دقائق|دقيقتين)(?= |$)`),
  );
  if (rel) {
    const n = numOf(rel.m[1]) ?? 1;
    const unit = rel.m[2];
    let mins = 0;
    if (unit === "نصف ساعه") mins = 30;
    else if (unit === "ربع ساعه") mins = 15;
    else if (unit === "ساعتين") mins = 120;
    else if (unit === "دقيقتين") mins = 2;
    else if (unit === "ساعه" || unit === "ساعات") mins = Math.round(n * 60);
    else mins = Math.round(n);
    const at = new Date(now.getTime() + mins * 60000);
    return { time: `${pad(at.getHours())}:${pad(at.getMinutes())}`, hits: [rel.hit], relative: at };
  }

  const per = periodOf(t);

  // 17:30 أو 5:30
  const colon = find(t, /(?:^| )(?:الساعه )?(\d{1,2}):(\d{2})(?: (?:صباحا|صباح|ص|مساء|مساءا|م|ظهرا|عصرا|ليلا|الفجر|الظهر|العصر|المغرب|العشاء))?(?= |$)/);
  if (colon) {
    const h = Number(colon.m[1]);
    const mi = Number(colon.m[2]);
    if (h <= 24 && mi < 60) {
      const hh = to24(h, per, kind) % 24;
      return { time: `${pad(hh)}:${pad(mi)}`, hits: [colon.hit] };
    }
  }

  // الساعة 5 ونصف / وربع / الا ربع / و 20 دقيقة
  const word = find(
    t,
    /(?:^| )(?:الساعه|الساعة|ساعه) (\d{1,2})(?: (?:و ?(نصف|ربع|ثلث)|الا (ربع|ثلث)|و ?(\d{1,2}) دقيقه))?(?: (?:صباحا|صباح|ص|مساء|مساءا|م|ظهرا|عصرا|ليلا|الفجر|الظهر|العصر|المغرب|العشاء|بعد الظهر))?(?= |$)/,
  );
  if (word) {
    let h = Number(word.m[1]);
    let mi = 0;
    if (word.m[2] === "نصف") mi = 30;
    else if (word.m[2] === "ربع") mi = 15;
    else if (word.m[2] === "ثلث") mi = 20;
    else if (word.m[3] === "ربع") {
      mi = 45;
      h -= 1;
    } else if (word.m[3] === "ثلث") {
      mi = 40;
      h -= 1;
    } else if (word.m[4]) mi = Number(word.m[4]);
    if (h >= 0 && h <= 24 && mi < 60) {
      const base = to24(h < 1 ? 12 : h, per, kind);
      return { time: `${pad(base % 24)}:${pad(mi)}`, hits: [word.hit] };
    }
  }

  // «5 مساء» / «٨ صباحا» (رقم + إشارة فترة)
  const bare = find(t, /(?:^| )(\d{1,2}) (?:و ?(نصف|ربع) )?(صباحا|صباح|ص|مساء|مساءا|م|ظهرا|عصرا|ليلا|بعد الظهر|العصر|الظهر)(?= |$)/);
  if (bare) {
    const h = Number(bare.m[1]);
    const mi = bare.m[2] === "نصف" ? 30 : bare.m[2] === "ربع" ? 15 : 0;
    if (h >= 1 && h <= 12) {
      return { time: `${pad(to24(h, periodOf(bare.m[3]), kind) % 24)}:${pad(mi)}`, hits: [bare.hit] };
    }
  }

  // «بعد الظهر/العصر/المغرب/العشاء» وحدها = وقت تقريبي
  const named = find(t, /(?:^| )(?:وقت |عند |قبل )?(الفجر|الظهر|العصر|المغرب|العشاء)(?= |$)/);
  if (named) {
    const map: Record<string, string> = { الفجر: "05:00", الظهر: "12:30", العصر: "15:30", المغرب: "18:00", العشاء: "19:30" };
    return { time: map[named.m[1]], hits: [named.hit] };
  }
  return null;
}

type DateHit = { date: string; hits: Hit[]; weekly?: number; daily?: boolean };

function extractDate(t: string, now: Date, time: string | null): DateHit | null {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const m1 = find(t, /(?:^| )بعد (?:غد|بكره|بكرا|بعد غد)(?= |$)/);
  if (m1) return { date: iso(plusDays(today, 2)), hits: [m1.hit] };

  const tomorrow = find(t, /(?:^| )(?:غدا|غدا|غد|بكره|بكرا|بكرة)(?= |$)/);
  if (tomorrow) return { date: iso(plusDays(today, 1)), hits: [tomorrow.hit] };

  const tonight = find(t, /(?:^| )(?:الليله|هالليله|الليلة)(?= |$)/);
  if (tonight) return { date: iso(today), hits: [tonight.hit] };

  const td = find(t, /(?:^| )(?:اليوم|هاليوم|الان|حالا|هسا)(?= |$)/);
  if (td) return { date: iso(today), hits: [td.hit] };

  const everyDay = find(t, /(?:^| )كل يوم(?= |$)/);
  if (everyDay) return { date: iso(today), hits: [everyDay.hit], daily: true };

  const inN = find(t, new RegExp(`(?:^| )بعد (\\d+|${NUM_ALT}) (?:ايام|يوم|اسبوع|اسابيع)(?= |$)`));
  if (inN) {
    const n = numOf(inN.m[1]) ?? 1;
    const isWeek = /اسبوع|اسابيع/.test(inN.m[0]);
    return { date: iso(plusDays(today, isWeek ? n * 7 : n)), hits: [inN.hit] };
  }
  const in2 = find(t, /(?:^| )بعد (يومين|اسبوعين|اسبوع)(?= |$)/);
  if (in2) return { date: iso(plusDays(today, in2.m[1] === "يومين" ? 2 : in2.m[1] === "اسبوعين" ? 14 : 7)), hits: [in2.hit] };

  // 15/12 أو 15-12-2026
  const num = find(t, /(?:^| )(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?(?= |$)/);
  if (num) {
    const d = Number(num.m[1]);
    const mo = Number(num.m[2]);
    let y = num.m[3] ? Number(num.m[3]) : today.getFullYear();
    if (y < 100) y += 2000;
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) {
      let dt = new Date(y, mo - 1, d);
      if (!num.m[3] && dt < today) dt = new Date(y + 1, mo - 1, d);
      return { date: iso(dt), hits: [num.hit] };
    }
  }

  // 15 كانون الأول
  for (const [re, mo] of MONTHS) {
    const mm = find(t, new RegExp(`(?:^| )(\\d{1,2}) (?:من )?${re.source}(?: (\\d{4}))?(?= |$)`));
    if (mm) {
      const d = Number(mm.m[1]);
      let y = mm.m[2] ? Number(mm.m[2]) : today.getFullYear();
      let dt = new Date(y, mo - 1, d);
      if (!mm.m[2] && dt < today) {
        y += 1;
        dt = new Date(y, mo - 1, d);
      }
      return { date: iso(dt), hits: [mm.hit] };
    }
  }

  // اسم يوم أسبوع (+ «القادم/الجاي» تعني الأسبوع التالي)
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const every = find(t, /(?:^| )كل (?:يوم )?(?=الاحد|الاثنين|الاتنين|الثلاثاء|الثلاثا|التلات|الاربعاء|الاربعا|الخميس|الجمعه|السبت)/);
  for (const [re, wd] of WEEKDAYS) {
    const w = find(t, re);
    if (!w) continue;
    const next = find(t, /(?:^| )(?:القادم|الجاي|التالي|الجايه|القادمه)(?= |$)/);
    const hits = [w.hit];
    if (next) hits.push(next.hit);
    if (every) hits.push(every.hit);
    let diff = (wd - today.getDay() + 7) % 7;
    if (diff === 0) {
      const tm = time ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) : -1;
      if (next || (tm >= 0 && tm <= nowMin)) diff = 7;
    }
    if (next && diff < 7 && diff !== 0 && /(?:القادم|الجاي)/.test(t) && wd <= today.getDay()) diff += 0;
    return { date: iso(plusDays(today, diff)), hits, weekly: every ? wd : undefined };
  }

  const nextWeek = find(t, /(?:^| )(?:الاسبوع|اسبوع) (?:القادم|الجاي|الجايه|القادمه)(?= |$)/);
  if (nextWeek) return { date: iso(plusDays(today, 7)), hits: [nextWeek.hit] };

  return null;
}

function detectKind(t: string): SmartKind | null {
  if (/(?:^| )(?:منبه|نبهني|ايقظني|صحيني|رنه|رنين)(?= |$)/.test(t)) return "alarm";
  if (/(?:^| )(?:ملاحظه|دون|دوّن|سجل ملاحظه|فكره)(?= |$)/.test(t)) return "note";
  if (/(?:^| )(?:مهمه|ذكرني|تذكير|تذكرني|لا تنسني|لا انسي|اتذكر|لازم|يجب|علي ان)(?= |$)/.test(t)) return "task";
  if (/(?:^| )(?:موعد|حجز|احجز|مراجعه|مريض|مريضه|كشف)(?= |$)/.test(t)) return "appointment";
  if (/(?:^| )(?:دوام|مناوبه|محاضره|اجتماع|دوره|ورشه|مؤتمر|مناوبة)(?= |$)/.test(t)) return "event";
  return null;
}

/** أقرب مريض لاسم مذكور في النص: يطابق كل كلمات الاسم أو الاسم الأول إن كان وحيدًا */
export function matchPatient(t: string, patients: Patient[]): { patient: Patient; hit: Hit } | null {
  const words = t.split(" ").filter(Boolean);
  const normPatients = patients.map((p) => ({ p, n: normAr(p.name), toks: normAr(p.name).split(" ").filter(Boolean) }));
  // 1) الاسم كاملًا كعبارة متصلة
  let best: { p: Patient; len: number; idx: number } | null = null;
  for (const { p, n } of normPatients) {
    if (n.length < 2) continue;
    const idx = t.indexOf(n);
    if (idx >= 0 && (idx === 0 || t[idx - 1] === " ") && (!best || n.length > best.len)) best = { p, len: n.length, idx };
  }
  if (best) return { patient: best.p, hit: { start: best.idx, end: best.idx + best.len } };

  // 2) الاسم الأول (وربما الأب) إن طابق مريضًا واحدًا فقط
  const after = t.match(/(?:^| )(?:مع|للمريض|للمريضه|المريض|المريضه|عند|ل)\s*([^\s]+)(?:\s+([^\s]+))?/);
  const cands = after ? [after[1], after[2]].filter(Boolean) : words;
  for (const first of cands) {
    if (!first || first.length < 2 || STOP.has(first)) continue;
    const hits = normPatients.filter(({ toks }) => toks.includes(first));
    if (hits.length === 1) {
      const idx = t.indexOf(first);
      return { patient: hits[0].p, hit: { start: idx, end: idx + first.length } };
    }
  }
  return null;
}

const CMD = new Set([
  "ذكرني", "تذكرني", "نبهني", "ايقظني", "صحيني", "اضف", "اضافه", "اضيف", "سجل", "اريد", "ابي", "ابغى", "بدي", "لو", "سمحت",
  "رجاء", "من فضلك", "موعد", "حجز", "احجز", "مهمه", "منبه", "تذكير", "مهم", "عاجل", "ضروري", "بسرعه", "اولويه", "جدا",
]);
const NOTE_CMD = new Set(["ملاحظه", "دون", "فكره", "سجل", "اضف", "اضافه", "اكتب"]);
const EDGE = new Set(["ان", "ب", "ل", "و", "في", "على", "الى", "من", "مع", "بعد", "قبل", "عند", "يوم", "الساعه", "ساعه", "ال"]);

/** يبني العنوان من الكلمات المتبقية مع إبقاء الكتابة الأصلية (بهمزاتها) */
function cleanTitle(restNorm: string, originalTokens: string[], normTokens: string[], kind: SmartKind): string {
  const restTokens = restNorm.split(" ").filter(Boolean);
  const drop = kind === "note" ? NOTE_CMD : CMD;
  const keep: string[] = [];
  let j = 0;
  for (const rt of restTokens) {
    // مواءمة بالترتيب مع الكلمات الأصلية
    while (j < normTokens.length && normTokens[j] !== rt) j++;
    const orig = j < normTokens.length ? originalTokens[j] : rt;
    j++;
    if (drop.has(rt)) continue;
    keep.push(orig);
  }
  const isEdge = (w: string) => EDGE.has(normAr(w));
  while (keep.length && isEdge(keep[0])) keep.shift();
  while (keep.length && isEdge(keep[keep.length - 1])) keep.pop();
  return keep.join(" ").replace(/^[:\-–—\s]+/, "").trim();
}

const KIND_LABEL: Record<SmartKind, string> = {
  task: "مهمة",
  alarm: "منبّه",
  note: "ملاحظة",
  appointment: "موعد عيادة",
  event: "حدث",
};
export const smartKindLabel = (k: SmartKind) => KIND_LABEL[k];

/**
 * يفسّر جملة حرة. يعيد null إن كانت فارغة.
 * patients: لمطابقة اسم المريض في المواعيد.
 */
export function parseSmart(raw: string, now: Date, patients: Patient[] = []): SmartIntent | null {
  const original = raw.trim();
  if (!original) return null;
  let t = normAr(original);
  if (!t) return null;

  let kind = detectKind(t);
  const prio: Priority | undefined = /(?:^| )(?:مهم|مهمه جدا|عاجل|ضروري|بسرعه|اولويه)(?= |$)/.test(t) ? "high" : undefined;

  const timeRes = extractTime(t, now, kind);
  let rest = t;
  const hits: Hit[] = [];
  if (timeRes) hits.push(...timeRes.hits);
  const dateRes = extractDate(t, now, timeRes?.time ?? null);
  if (dateRes) hits.push(...dateRes.hits);
  // تصحيح تداخل المواضع: نقصّ من الأطراف الأخيرة أولًا ونتجاهل المتداخل
  const clean: Hit[] = [];
  for (const h of [...hits].sort((a, b) => a.start - b.start)) {
    if (clean.length && h.start < clean[clean.length - 1].end) continue;
    clean.push(h);
  }
  rest = cut(t, clean);

  // مدة: «لمدة 45 دقيقة» / «ساعة ونصف»
  let durationMin: number | undefined;
  const dur = find(rest, /(?:^| )(?:لمده|مده) (\d+) (دقيقه|دقائق|ساعه|ساعات)(?= |$)/);
  if (dur) {
    const n = Number(dur.m[1]);
    durationMin = /ساع/.test(dur.m[2]) ? n * 60 : n;
    rest = cut(rest, [dur.hit]);
  }

  // مطابقة المريض
  let patient: Patient | undefined;
  const pm = matchPatient(rest, patients);
  if (pm && (kind === "appointment" || kind === null)) {
    patient = pm.patient;
    rest = cut(rest, [pm.hit]);
    if (kind === null) kind = "appointment";
  }

  // الإجراء المذكور
  let procedure: string | undefined;
  for (const p of [...PROCEDURES].sort((a, b) => b.length - a.length)) {
    const f = find(rest, new RegExp(`(?:^| )${p}(?= |$)`));
    if (f) {
      procedure = p === "حشو" ? "حشوة" : p === "خلع" ? "قلع" : p;
      if (kind === "appointment") rest = cut(rest, [f.hit]);
      if (kind === null && patient) kind = "appointment";
      break;
    }
  }

  // اختيار النوع الافتراضي
  if (!kind) {
    if (timeRes && !timeRes.relative && dateRes) kind = "event";
    else if (timeRes && !dateRes) kind = "event";
    else if (dateRes) kind = "task";
    else kind = "task";
  }

  // ضبط الوقت إن كان المنبّه بلا إشارة فترة (أُخذ منها افتراض الصباح في extractTime عبر kind السابق)
  // إعادة حساب الوقت إن تغيّر النوع إلى منبّه بعد الاستخراج
  let time = timeRes?.time;
  if (timeRes && kind === "alarm" && !timeRes.relative) {
    const again = extractTime(t, now, "alarm");
    if (again) time = again.time;
  }

  const today = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  let date = dateRes?.date ?? today;

  // وقت اليوم الماضي دون ذكر تاريخ ← الغد (للمنبّه والتذكير فقط)
  if (!dateRes && time && (kind === "alarm" || kind === "task") && !timeRes?.relative) {
    const nowStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    if (time <= nowStr) date = iso(plusDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 1));
  }
  if (timeRes?.relative) date = iso(timeRes.relative);

  const repeatDays: number[] | undefined =
    kind === "alarm" && dateRes?.daily ? [0, 1, 2, 3, 4, 5, 6] : kind === "alarm" && dateRes?.weekly !== undefined ? [dateRes.weekly] : undefined;

  // العنوان
  const originalTokens = original.replace(/[،,؛;؟?!]/g, " ").replace(/:(?=\s|$)/g, " ").split(/\s+/).filter(Boolean);
  const normTokens = originalTokens.map((w) => normAr(w));
  let title = cleanTitle(rest, originalTokens, normTokens, kind);
  if (kind === "appointment") {
    title = patient ? patient.name : title;
  } else if (!title) {
    title = kind === "alarm" ? "منبّه" : kind === "event" ? "حدث" : kind === "note" ? "ملاحظة" : "مهمة";
  }

  let eventType: ShiftType | undefined;
  if (kind === "event") {
    if (/(?:دوام|مناوبه|مشفي|مستشفي|مشفى)/.test(t)) eventType = "hospital";
    else if (/(?:عياده|مرضي)/.test(t)) eventType = "private";
    else eventType = "personal";
  }

  if (kind === "appointment" && !durationMin) durationMin = 30;
  if (kind === "event" && !durationMin) durationMin = 60;

  // الثقة
  let confidence = 0.4;
  if (detectKind(t)) confidence += 0.2;
  if (time) confidence += 0.15;
  if (dateRes) confidence += 0.1;
  if (kind === "appointment") confidence += patient ? 0.15 : -0.1;
  confidence = Math.max(0.1, Math.min(0.99, confidence));

  return {
    kind,
    title,
    date,
    dateExplicit: !!dateRes || !!timeRes?.relative,
    time,
    durationMin,
    priority: prio,
    patientId: patient?.id,
    patientName: patient?.name,
    procedure,
    eventType,
    repeatDays,
    confidence,
  };
}
