import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { TYPE_META } from "@/constants/shiftTypes";
import { agendaFor, occursOn, type AgendaInput } from "@/lib/agenda";
import { addDays, combine, fmtTime, fmtTimeDate, toISO, toMinutes } from "@/lib/dates";
import { CITY, FARD, PRAYER_LABELS, getPrayerTimes } from "@/lib/prayer";
import { useSettings } from "@/store/useSettings";
import { usePrayerLog, type FardKey } from "@/store/usePrayerLog";
import { useCountdowns } from "@/store/useCountdowns";
import { useClinic } from "@/store/useClinic";
import { fmtMoney } from "@/lib/format";
import { buildCountdownItems } from "@/lib/countdown/notify";
import type { PrayerKey, Settings, Task } from "@/types";

export const CHANNEL = {
  events: "events",
  prayer: "prayer",
  tasks: "tasks",
  prayerBefore: "prayer_before",
  prayerRepeat: "prayer_repeat",
  dhikr: "dhikr",
  /** إشعارات هادئة (بلا صوت ولا اهتزاز) أثناء وقت الصلاة */
  quiet: "quiet",
  /**
   * قناة صوت الأذان (ملف assets/sounds/adhan.mp3).
   * صوت القناة في أندرويد لا يتغيّر بعد إنشائها، فرفعنا الرقم (v2) لقناة جديدة نظيفة.
   */
  adhan: "prayer_adhan_v2",
  /** تذكيرات العدّادات (لحظاتي) */
  countdowns: "countdowns",
} as const;

/** قناة الأذان القديمة تُحذف عند البدء (كانت قد أُنشئت بلا صوت على بعض الأجهزة) */
const OLD_ADHAN_CHANNELS = ["prayer_adhan"];

/** فئة الإشعار التي تحمل زري «صليت» و«ذكّرني بعد 10 د» (نفس المعرّف في الجدولة والتعريف) */
export const PRAYER_CATEGORY = "action-prayer";
export const ACTION_DONE = "done";
export const ACTION_SNOOZE = "snooze";
const SNOOZE_MIN = 10;

/**
 * البادئات التي يديرها التزامن فقط. أي إشعار آخر (مثل الإشعارات التجريبية) لا يُلمس. تكرارات الصلاة تبدأ بـ prayer-rep- فتدخل ضمن prayer-.
 */
const MANAGED_PREFIXES = ["prayer-", "event-", "appt-", "task-", "dhikr-", "cd-", "debt-"] as const;
const PRAYER_PREFIXES = ["prayer-", "dhikr-"] as const;

/** Android يحدّ الإشعارات المجدولة (~500). نبقى تحت 400 */
const MAX_SCHEDULED = 400;
const PRAYER_DAYS = 5; // قبل + أذان
const REPEAT_DAYS = 2; // تكرارات الصلاة + الأذكار
const EVENT_DAYS = 14;

let configured = false;

/** إعداد القنوات والفئات ومعالج العرض. يُستدعى مرة عند بدء التطبيق. */
export async function setupNotifications(): Promise<void> {
  if (configured) return;
  configured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === "android") {
    // قنوات عالية الأولوية: تظهر فوق الشاشة وتُنعكس على الساعة (Xiaomi Watch)
    await Notifications.setNotificationChannelAsync(CHANNEL.events, {
      name: "المواعيد والمناوبات",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 200, 300],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      enableVibrate: true,
    });
    await Notifications.setNotificationChannelAsync(CHANNEL.prayer, {
      name: "أوقات الصلاة",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 400, 200, 400],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      enableVibrate: true,
    });
    // قنوات جديدة: صوت القناة وأهميتها لا يتغيّران بعد إنشائها، فلا نعدّل القناة prayer
    await Notifications.setNotificationChannelAsync(CHANNEL.prayerBefore, {
      name: "قبل الصلاة",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      enableVibrate: true,
    });
    await Notifications.setNotificationChannelAsync(CHANNEL.prayerRepeat, {
      name: "تذكير الصلاة بعد الأذان",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      enableVibrate: true,
    });
    for (const old of OLD_ADHAN_CHANNELS) {
      await Notifications.deleteNotificationChannelAsync(old).catch(() => undefined);
    }
    await Notifications.setNotificationChannelAsync(CHANNEL.adhan, {
      name: "الأذان",
      importance: Notifications.AndroidImportance.MAX,
      sound: "adhan.mp3",
      // يُشغَّل بمستوى صوت المنبّه ليسمع حتى لو كان الرنين منخفضًا
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
      vibrationPattern: [0, 400, 200, 400],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      enableVibrate: true,
    });
    await Notifications.setNotificationChannelAsync(CHANNEL.quiet, {
      name: "هادئة (وقت الصلاة)",
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      enableVibrate: false,
    });
    await Notifications.setNotificationChannelAsync(CHANNEL.dhikr, {
      name: "الأذكار",
      importance: Notifications.AndroidImportance.DEFAULT,
      enableVibrate: false,
    });
    await Notifications.setNotificationChannelAsync(CHANNEL.tasks, {
      name: "المهام",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync(CHANNEL.countdowns, {
      name: "العدّادات (لحظاتي)",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  // أزرار الإشعار. opensAppToForeground=true لأن الإجراءات الصامتة غير مضمونة على Android
  await Notifications.setNotificationCategoryAsync(PRAYER_CATEGORY, [
    { identifier: ACTION_DONE, buttonTitle: "صليت ✓", options: { opensAppToForeground: true } },
    {
      identifier: ACTION_SNOOZE,
      buttonTitle: `ذكّرني بعد ${SNOOZE_MIN} د`,
      options: { opensAppToForeground: true },
    },
  ]);
}

/** يطلب إذن الإشعارات (Android 13+) ويعيد true إن مُنح */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

// ───────────────────────── نموذج الإشعار المخطَّط ─────────────────────────

export type Planned = {
  id: string;
  title: string;
  body: string;
  date: Date;
  channel: string;
  data?: Record<string, unknown>;
  category?: string;
};

const startsWithAny = (id: string, prefixes: readonly string[]) => prefixes.some((p) => id.startsWith(p));

/** يلغي إشعارات التزامن فقط (حسب البادئة) ويعيد عدد ما بقي مجدولًا من غيرها */
async function cancelManaged(prefixes: readonly string[]): Promise<number> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const mine = all.map((n) => n.identifier).filter((id) => startsWithAny(id, prefixes));
  for (let i = 0; i < mine.length; i += 20) {
    await Promise.all(mine.slice(i, i + 20).map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  }
  return all.length - mine.length;
}

/** ميزانية: عند تجاوز الحد تسقط الأبعد زمنًا أولًا */
export function applyBudget(items: Planned[], max: number): Planned[] {
  const sorted = [...items].sort((a, b) => a.date.getTime() - b.date.getTime());
  if (sorted.length <= max) return sorted;
  if (__DEV__) {
    console.warn(`[notifications] تجاوز الميزانية: ${sorted.length} > ${max}، أُسقط ${sorted.length - max} الأبعد زمنًا`);
  }
  return sorted.slice(0, Math.max(0, max));
}

async function scheduleAll(items: Planned[]): Promise<void> {
  const now = Date.now() + 5000;
  const future = items.filter((p) => p.date.getTime() > now);
  // دفعات متوازية صغيرة: أسرع من التسلسل وأخف على الجسر
  for (let i = 0; i < future.length; i += 20) {
    await Promise.all(
      future.slice(i, i + 20).map((p) =>
        Notifications.scheduleNotificationAsync({
          identifier: p.id,
          content: {
            title: p.title,
            body: p.body,
            sound: p.channel !== CHANNEL.quiet,
            ...(p.data ? { data: p.data } : {}),
            ...(p.category ? { categoryIdentifier: p.category } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: p.date,
            channelId: p.channel,
          },
        }).catch((e) => {
          if (__DEV__) console.warn("[notifications] فشلت جدولة", p.id, e);
        }),
      ),
    );
  }
}

async function logScheduleDev(label: string) {
  if (!__DEV__) return;
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const kinds: Record<string, number> = {};
  for (const n of all) {
    const k = n.identifier.startsWith("prayer-before-")
      ? "قبل"
      : n.identifier.startsWith("prayer-rep-")
        ? "تكرار"
        : n.identifier.startsWith("prayer-")
          ? "أذان/شروق"
          : n.identifier.split("-")[0];
    kinds[k] = (kinds[k] ?? 0) + 1;
  }
  console.log(`[notifications] ${label}: المجموع ${all.length}`, kinds);
}

// ───────────────────────── الصلاة والأذكار ─────────────────────────

/** هل الوقت ضمن ساعات الهدوء (قد تعبر منتصف الليل) */
function inQuiet(d: Date, from: string, to: string): boolean {
  const f = toMinutes(from);
  const t = toMinutes(to);
  if (f === t) return false;
  const m = d.getHours() * 60 + d.getMinutes();
  return f < t ? m >= f && m < t : m >= f || m < t;
}

/** نهاية نافذة تكرار الصلاة: الفجر=الشروق، العشاء=بداية الهدوء، وغيرهما=الصلاة التالية */
function windowEnd(
  k: FardKey,
  iso: string,
  times: Record<PrayerKey, Date>,
  quietFrom: string,
): Date {
  switch (k) {
    case "fajr":
      return times.sunrise;
    case "dhuhr":
      return times.asr;
    case "asr":
      return times.maghrib;
    case "maghrib":
      return times.isha;
    case "isha": {
      let end = combine(iso, quietFrom);
      if (end.getTime() <= times.isha.getTime()) end = new Date(end.getTime() + 86400000);
      return end;
    }
  }
}

function fmtElapsed(min: number): string {
  if (min < 60) return `${min} د`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  const hs = h === 1 ? "ساعة" : h === 2 ? "ساعتان" : `${h} ساعات`;
  return m ? `${hs} و${m} د` : hs;
}

type LogState = Pick<ReturnType<typeof usePrayerLog.getState>, "done" | "snoozeUntil">;
const isDoneIn = (log: LogState, iso: string, k: FardKey) => !!log.done[iso]?.[k];

/** كل إشعارات الصلاة والأذكار للأيام القادمة */
export function buildPrayerItems(settings: Settings, log: LogState, from: Date = new Date()): Planned[] {
  const out: Planned[] = [];
  const rem = settings.prayerReminders;
  const dh = settings.dhikr;
  const today = toISO(from);

  for (let i = 0; i < PRAYER_DAYS; i++) {
    const iso = addDays(today, i);
    const times = getPrayerTimes(combine(iso, "12:00"), settings);

    for (const k of FARD) {
      if (!settings.prayerNotify[k]) continue; // المفتاح الرئيسي للصلاة
      const label = PRAYER_LABELS[k];
      const data = { prayer: k, iso };

      // قبل الصلاة
      if (rem?.before.enabled && rem.before.minutes > 0) {
        out.push({
          id: `prayer-before-${iso}-${k}`,
          title: `بقي ${rem.before.minutes} دقيقة على صلاة ${label}`,
          body: `${label} • ${fmtTimeDate(times[k])} بتوقيت ${CITY.name}`,
          date: new Date(times[k].getTime() - rem.before.minutes * 60000),
          channel: CHANNEL.prayerBefore,
          data,
        });
      }

      // عند الأذان (يبقى كما كان: مفعّل افتراضيًا)
      if (!rem || rem.atAdhan.enabled) {
        out.push({
          id: `prayer-${iso}-${k}`,
          title: `حان وقت ${label}`,
          body: `${label} • ${fmtTimeDate(times[k])} بتوقيت ${CITY.name}`,
          date: times[k],
          channel: !rem || rem.atAdhan.sound !== false ? CHANNEL.adhan : CHANNEL.prayer,
          data,
          category: PRAYER_CATEGORY,
        });
      }

      // تكرار بعد الأذان (يومان فقط)
      if (rem?.repeat.enabled && i < REPEAT_DAYS && !isDoneIn(log, iso, k)) {
        const step = Math.max(1, rem.repeat.everyMin) * 60000;
        const end = windowEnd(k, iso, times, rem.repeat.quietFrom).getTime();
        let t = times[k].getTime() + step;
        const snoozed = log.snoozeUntil[`${iso}-${k}`];
        if (snoozed && snoozed > t) t = snoozed; // «ذكّرني بعد 10 د»
        let n = 1;
        for (; t < end; t += step) {
          const d = new Date(t);
          if (inQuiet(d, rem.repeat.quietFrom, rem.repeat.quietTo)) continue;
          const elapsed = Math.round((t - times[k].getTime()) / 60000);
          out.push({
            id: `prayer-rep-${iso}-${k}-${n++}`,
            title: `لم تُقم صلاة ${label} بعد`,
            body: `مضى ${fmtElapsed(elapsed)} على الأذان`,
            date: d,
            channel: CHANNEL.prayerRepeat,
            data,
            category: PRAYER_CATEGORY,
          });
        }
      }
    }

    // الشروق (كما كان)
    if (settings.prayerNotify.sunrise) {
      out.push({
        id: `prayer-${iso}-sunrise`,
        title: "الشروق",
        body: fmtTimeDate(times.sunrise),
        date: times.sunrise,
        channel: CHANNEL.prayer,
      });
    }
  }

  // الأذكار (يومان)
  if (dh?.enabled && dh.texts.length > 0) {
    for (let i = 0; i < REPEAT_DAYS; i++) {
      const iso = addDays(today, i);
      const times = getPrayerTimes(combine(iso, "12:00"), settings);
      const avoid = Math.max(0, dh.avoidPrayerMin) * 60000;
      const winStart = combine(iso, dh.from).getTime();
      const winEnd = combine(iso, dh.to).getTime();
      if (winEnd <= winStart) continue;

      const prayerTimes = FARD.map((k) => times[k].getTime());
      /** يزيح الوقت خارج نطاق ± avoid حول الصلوات، أو null إن لم يبقَ مكان */
      const clear = (t: number): number | null => {
        let cur = t;
        for (let guard = 0; guard < 6; guard++) {
          const hit = prayerTimes.find((p) => Math.abs(cur - p) < avoid);
          if (hit === undefined) return cur <= winEnd ? cur : null;
          cur = hit + avoid;
        }
        return null;
      };

      const slots: number[] = [];
      if (dh.mode === "interval") {
        const step = Math.max(5, dh.everyMin) * 60000;
        for (let t = winStart; t <= winEnd; t += step) {
          if (clear(t) === t) slots.push(t); // نمط الفاصل: نتخطى الوقت المتعارض مع الصلاة
        }
      } else {
        const count = Math.max(1, Math.round(dh.countPerDay));
        const span = winEnd - winStart;
        for (let j = 0; j < count; j++) {
          const c = clear(winStart + (span * (j + 1)) / (count + 1));
          if (c !== null && !slots.includes(c)) slots.push(c);
        }
      }

      // تدوير النصوص بالترتيب، وبداية مختلفة كل يوم
      const dayNo = Math.floor(combine(iso, "12:00").getTime() / 86400000);
      slots.forEach((t, j) => {
        const d = new Date(t);
        const hhmm = `${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
        out.push({
          id: `dhikr-${iso}-${hhmm}`,
          title: "ذِكر",
          body: dh.texts[(dayNo + j) % dh.texts.length],
          date: d,
          channel: CHANNEL.dhikr,
        });
      });
    }
  }

  return out;
}

// ───────────────────────── التزامن ─────────────────────────

type SyncInput = {
  agenda: AgendaInput;
  tasks: Task[];
  settings: Settings;
};

/** كل عمليات الجدولة تمرّ بطابور واحد حتى لا تتداخل (الإلغاء مع الجدولة) */
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const next = queue.then(job, job);
  queue = next.catch(() => undefined);
  return next;
}

/**
 * يعيد جدولة كل الإشعارات المُدارة: صلاة وأذكار + أحداث (14 يومًا) + مواعيد العيادة + مهام لها موعد.
 * لا يلغي ما لا يديره (مثل الإشعارات التجريبية).
 */
export function syncNotifications(input: SyncInput): Promise<void> {
  return enqueue(() => doSync(input));
}

/** نوافذ الصلاة (من الأذان حتى بعده بـ minutes) للأيام القادمة، بالميلي ثانية */
function prayerQuietWindows(settings: Settings, days: number): Array<[number, number]> {
  const q = settings.prayerReminders.quiet;
  if (!q?.enabled) return [];
  const out: Array<[number, number]> = [];
  const base = new Date();
  for (let i = 0; i < days; i++) {
    const t = getPrayerTimes(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i, 12), settings);
    for (const k of FARD) {
      const a = t[k].getTime();
      out.push([a, a + q.minutes * 60000]);
    }
  }
  return out;
}

/** يحوّل قناة الإشعار إلى «هادئة» إن وقع داخل نافذة صلاة */
function quietize(items: Planned[], windows: Array<[number, number]>): Planned[] {
  if (windows.length === 0) return items;
  return items.map((p) => {
    const t = p.date.getTime();
    return windows.some(([a, b]) => t >= a && t < b) ? { ...p, channel: CHANNEL.quiet } : p;
  });
}

async function doSync({ agenda, tasks, settings }: SyncInput): Promise<void> {
  const granted = (await Notifications.getPermissionsAsync()).granted;
  if (!granted) return;

  await cancelManaged(MANAGED_PREFIXES);
  const today = toISO(new Date());
  const items: Planned[] = [];

  // --- الصلاة والأذكار ---
  const log = usePrayerLog.getState();
  items.push(...buildPrayerItems(settings, { done: log.done, snoozeUntil: log.snoozeUntil }));

  // --- الأحداث (دوام/مناوبات/أنشطة) ---
  for (let i = 0; i < EVENT_DAYS; i++) {
    const iso = addDays(today, i);
    for (const e of agenda.events) {
      if (!occursOn(e, iso) || e.reminderMinutes == null) continue;
      const start = combine(iso, e.startTime);
      const at = new Date(start.getTime() - e.reminderMinutes * 60000);
      const lead = e.reminderMinutes > 0 ? `بعد ${e.reminderMinutes} دقيقة` : "الآن";
      items.push({
        id: `event-${e.id}-${iso}`,
        title: e.title,
        body: `${TYPE_META[e.type].label} • يبدأ ${lead} (${fmtTime(e.startTime)})`,
        date: at,
        channel: CHANNEL.events,
      });
    }

    // --- مواعيد العيادة الخاصة ---
    for (const it of agendaFor(iso, agenda)) {
      if (it.source !== "appointment") continue;
      if (it.status === "done" || it.status === "no_show") continue;
      const start = combine(iso, it.startTime);
      const at = new Date(start.getTime() - settings.appointmentReminder * 60000);
      // ذمة المريض (جلسات − دفعات): تُضاف لنص التذكير + تنبيه صباح اليوم السابق
      const pid = agenda.appointments.find((a) => a.id === it.refId)?.patientId;
      const cl = useClinic.getState();
      const debt = pid
        ? cl.sessions.filter((x) => x.patientId === pid).reduce((a, x) => a + x.cost, 0) - cl.payments.filter((x) => x.patientId === pid).reduce((a, x) => a + x.amount, 0)
        : 0;
      const debtText = debt > 0 ? ` • عليه ذمة ${fmtMoney(debt, settings.currency)}` : "";
      items.push({
        id: `appt-${it.refId}`,
        title: `موعد: ${it.title}`,
        body: `${it.subtitle ?? ""} • ${fmtTime(it.startTime)}${debtText}`,
        date: at,
        channel: CHANNEL.events,
      });
      if (debt > 0) {
        items.push({
          id: `debt-${it.refId}`,
          title: `ذمة قبل الموعد: ${it.title}`,
          body: `موعده ${i === 1 ? "غدًا" : iso} الساعة ${fmtTime(it.startTime)} وعليه ${fmtMoney(debt, settings.currency)}`,
          date: combine(addDays(iso, -1), "09:00"),
          channel: CHANNEL.events,
        });
      }
    }
  }

  // --- مهام لها موعد: تذكير 9 صباحًا ---
  for (const t of tasks) {
    if (t.done || !t.dueDate) continue;
    items.push({
      id: `task-${t.id}`,
      title: "مهمة اليوم",
      body: t.title,
      date: combine(t.dueDate, "09:00"),
      channel: CHANNEL.tasks,
    });
  }

  // --- العدّادات التنازلية: تذكيرات متعددة + لحظة الحدث ---
  items.push(...buildCountdownItems(useCountdowns.getState().items, Date.now(), CHANNEL.countdowns));

  // إشعارات غير مُدارة (التجريبية...) تُحسب من الميزانية أيضًا
  const unmanaged = (await Notifications.getAllScheduledNotificationsAsync()).length;
  const prayerItems = items.filter((p) => startsWithAny(p.id, PRAYER_PREFIXES));
  const otherItems = items.filter((p) => !startsWithAny(p.id, PRAYER_PREFIXES));
  const quiet = quietize(otherItems, prayerQuietWindows(settings, EVENT_DAYS));
  await scheduleAll(applyBudget([...prayerItems, ...quiet], MAX_SCHEDULED - unmanaged));
  await logScheduleDev("بعد التزامن الكامل");
}

/**
 * يجدّد الصلاة والأذكار فقط من المتاجر المحفوظة (دون الأحداث).
 * آمن للاستدعاء من الودجت أو من زر الإشعار والتطبيق لا يملك بيانات الأجندة في الذاكرة.
 */
export function refreshPrayerSchedule(): Promise<void> {
  return enqueue(async () => {
    const granted = (await Notifications.getPermissionsAsync()).granted;
    if (!granted) return;
    await whenHydrated(useSettings);
    await whenHydrated(usePrayerLog);
    const settings = useSettings.getState() as unknown as Settings;
    const log = usePrayerLog.getState();
    const kept = await cancelManaged(PRAYER_PREFIXES);
    const items = buildPrayerItems(settings, { done: log.done, snoozeUntil: log.snoozeUntil });
    await scheduleAll(applyBudget(items, MAX_SCHEDULED - kept));
    await logScheduleDev("تجديد الصلاة والأذكار");
  });
}

type Hydratable = { persist: { hasHydrated: () => boolean; onFinishHydration: (fn: () => void) => () => void } };
function whenHydrated(store: Hydratable): Promise<void> {
  if (store.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const off = store.persist.onFinishHydration(() => {
      off();
      resolve();
    });
  });
}

// ───────────────────────── الاستجابة لأزرار الإشعار ─────────────────────────

const handledResponses = new Set<string>();

/**
 * يعالج ضغطة على إشعار صلاة. يعيد true إن كان الإشعار إشعار صلاة.
 * «صليت»: يسجّل ويلغي بقية تكرارات تلك الصلاة. «ذكّرني»: يؤجّل السلسلة 10 دقائق.
 */
export async function handlePrayerResponse(response: Notifications.NotificationResponse): Promise<boolean> {
  const data = response.notification.request.content.data as { prayer?: string; iso?: string } | undefined;
  if (!data?.prayer || !data.iso || data.prayer === "sunrise") return false;
  const key = data.prayer as FardKey;
  if (!FARD.includes(key)) return false;
  if ((data as { test?: boolean }).test) {
    // إشعار تجريبي: لا يمسّ سجل الصلاة الحقيقي
    await Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(() => {});
    return true;
  }

  const stamp = `${response.notification.request.identifier}|${response.actionIdentifier}|${response.notification.date}`;
  if (handledResponses.has(stamp)) return true; // الإقلاع البارد قد يعيد آخر استجابة
  handledResponses.add(stamp);

  const log = usePrayerLog.getState();
  if (response.actionIdentifier === ACTION_DONE) {
    log.markDone(data.iso, key);
    await Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(() => {});
    await refreshPrayerSchedule();
  } else if (response.actionIdentifier === ACTION_SNOOZE) {
    log.setSnooze(data.iso, key, Date.now() + SNOOZE_MIN * 60000);
    await Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(() => {});
    await refreshPrayerSchedule();
  }
  return true;
}

// ───────────────────────── إشعارات تجريبية ─────────────────────────

/** إشعار تجريبي بعد ثوانٍ، لاختبار الوصول إلى الساعة */
export async function sendTestNotification(seconds = 5): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Dentist Planner",
      body: "إشعار تجريبي — إن وصل إلى ساعتك فالإعداد سليم ✅",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: CHANNEL.events,
    },
  });
}

/** أذان تجريبي بعد ثوانٍ على قناة الأذان نفسها (لاختبار الصوت دون انتظار الوقت) */
export async function sendTestAdhan(seconds = 5): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: "test-adhan",
    content: {
      title: "تجربة الأذان",
      body: "إن سمعت الأذان فالإعداد سليم ✅",
      sound: "adhan.mp3",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: CHANNEL.adhan,
    },
  });
}

/** معرّف خارج البادئات المُدارة فلا يلغيه التزامن قبل وصوله */
export async function sendTestDhikr(text: string, seconds = 5): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title: "ذِكر", body: text, sound: false },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: CHANNEL.dhikr,
    },
  });
}

/** تذكير صلاة تجريبي بزري «صليت» و«ذكّرني» (لاختبار الأزرار والتطبيق مغلق) */
export async function sendTestPrayerReminder(seconds = 5): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "تجربة: لم تُقم صلاة الظهر بعد",
      body: "جرّب زر «صليت» أو «ذكّرني» وأنت مغلق التطبيق",
      sound: true,
      categoryIdentifier: PRAYER_CATEGORY,
      // صلاة وهمية بتاريخ قديم حتى لا تؤثر على سجل اليوم الحقيقي
      data: { prayer: "dhuhr", iso: "1970-01-01", test: true },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: CHANNEL.prayerRepeat,
    },
  });
}
