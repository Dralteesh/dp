import { NativeModules, Platform } from "react-native";
import { occursOn } from "@/lib/agenda";
import { addDays, combine, localISOString, toISO } from "@/lib/dates";
import { useWeather } from "@/store/useWeather";
import type { AlarmItem, PlannerEvent } from "@/types";

/**
 * المنبّه الإجباري يعتمد على مكتبة react-native-alarmageddon (وحدة أندرويد أصلية):
 * ينبّه بدقة، بصوت مكرّر بأعلى مستوى، مع شاشة كاملة على القفل وغفوة،
 * ويعاد جدولته بعد إعادة تشغيل الهاتف.
 * لا يعمل داخل Expo Go؛ يحتاج Development Build.
 */
type NativeAlarm = {
  ensurePermissions: () => Promise<boolean>;
  scheduleAlarm: (a: {
    id: string;
    datetimeISO: string;
    title?: string;
    body?: string;
    snoozeEnabled?: boolean;
    snoozeInterval?: number;
  }) => Promise<void>;
  cancelAlarm: (id: string) => Promise<void>;
  listAlarms: () => Promise<{ id: string }[]>;
  stopCurrentAlarm: (id: string) => Promise<void>;
  snoozeCurrentAlarm: (id: string, minutes: number) => Promise<void>;
  getCurrentAlarmPlaying: () => Promise<{ activeAlarmId: string } | null>;
  onAlarmStateChange: (cb: (id: string | null) => void) => { remove: () => void };
};

export function alarmSupported(): boolean {
  return Platform.OS === "android" && !!NativeModules.AlarmModule;
}

let cached: NativeAlarm | null | undefined;

export function getAlarmModule(): NativeAlarm | null {
  if (cached !== undefined) return cached;
  if (!alarmSupported()) {
    cached = null;
    return cached;
  }
  try {
    // require متأخر حتى لا ينهار التطبيق في Expo Go
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require("react-native-alarmageddon").default as NativeAlarm;
  } catch {
    cached = null;
  }
  return cached;
}

/** البادئة التي تميّز منبّهاتنا عن أي منبّه آخر في المكتبة */
const PREFIX = "dp:";
const HORIZON_DAYS = 14;

type Wanted = { id: string; at: Date; title: string; body: string; snooze: number };

const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const MODE_TEXT = { rain: "المطر", heat: "الحر الشديد", cold: "البرد القارس" } as const;

/** إن كان المنبّه مرتبطًا بالطقس وتحقّق الشرط خلال 3 ساعات بعد وقته يُقدَّم shiftMin دقيقة */
function weatherShift(a: AlarmItem, at: Date): number {
  const link = a.weatherLink;
  if (!link) return 0;
  try {
    const st = useWeather.getState();
    const city = st.cities[0];
    const w = city ? st.cache[city.id] : undefined;
    if (!w) return 0;
    // يعمل فقط إن كانت منطقة مدينة الطقس هي منطقة الجهاز تقريبًا
    if (Math.abs(new Date(w.now.time).getTime() - Date.now()) > 2 * 3600 * 1000) return 0;
    const from = at.getTime();
    const to = from + 3 * 3600 * 1000;
    for (const h of w.hours) {
      const t = new Date(h.time).getTime();
      if (t < from - 3600 * 1000 || t > to) continue;
      if (link.mode === "rain" && (h.pop >= 50 || RAIN_CODES.has(h.code))) return link.shiftMin;
      if (link.mode === "heat" && h.temp >= 38) return link.shiftMin;
      if (link.mode === "cold" && h.temp <= 2) return link.shiftMin;
    }
  } catch {
    /* تجاهل */
  }
  return 0;
}

function collectAlarms(alarms: AlarmItem[], events: PlannerEvent[]): Wanted[] {
  const wanted: Wanted[] = [];
  const now = Date.now();
  const today = toISO(new Date());

  // 1) منبّهات المستخدم
  for (const a of alarms) {
    if (!a.enabled) continue;
    if (a.days.length === 0) {
      if (!a.onceDate) continue;
      const base = combine(a.onceDate, a.time);
      let shift = weatherShift(a, base);
      let at = new Date(base.getTime() - shift * 60000);
      if (at.getTime() <= now && base.getTime() > now) {
        shift = 0;
        at = base;
      }
      if (at.getTime() > now) {
        wanted.push({
          id: `${PREFIX}a:${a.id}:${a.onceDate}`,
          at,
          title: a.label || "منبّه",
          body: shift && a.weatherLink ? `قُدِّم ${shift} د بسبب ${MODE_TEXT[a.weatherLink.mode]}` : "اضغط لإيقاف المنبّه",
          snooze: a.snoozeMinutes,
        });
      }
      continue;
    }
    for (let i = 0; i < HORIZON_DAYS; i++) {
      const iso = addDays(today, i);
      const wd = new Date(iso + "T12:00:00").getDay();
      if (!a.days.includes(wd)) continue;
      const base = combine(iso, a.time);
      let shift = weatherShift(a, base);
      let at = new Date(base.getTime() - shift * 60000);
      if (at.getTime() <= now && base.getTime() > now) {
        shift = 0;
        at = base;
      }
      if (at.getTime() <= now) continue;
      wanted.push({
        id: `${PREFIX}a:${a.id}:${iso}`,
        at,
        title: a.label || "منبّه",
        body: shift && a.weatherLink ? `قُدِّم ${shift} د بسبب ${MODE_TEXT[a.weatherLink.mode]}` : "اضغط لإيقاف المنبّه",
        snooze: a.snoozeMinutes,
      });
    }
  }

  // 2) منبّه إجباري مرتبط بحدث (دوام/مناوبة)
  for (const e of events) {
    if (e.alarmMinutes == null) continue;
    for (let i = 0; i < HORIZON_DAYS; i++) {
      const iso = addDays(today, i);
      if (!occursOn(e, iso)) continue;
      const at = new Date(combine(iso, e.startTime).getTime() - e.alarmMinutes * 60000);
      if (at.getTime() <= now) continue;
      wanted.push({
        id: `${PREFIX}e:${e.id}:${iso}`,
        at,
        title: e.title,
        body: e.alarmMinutes > 0 ? `يبدأ بعد ${e.alarmMinutes} دقيقة` : "حان وقت البدء",
        snooze: 5,
      });
    }
  }

  return wanted;
}

/** يزامن منبّهات التطبيق مع المنبّه الأصلي (يلغي القديمة ويجدول القادمة) */
export async function syncAlarms(alarms: AlarmItem[], events: PlannerEvent[]): Promise<void> {
  const mod = getAlarmModule();
  if (!mod) return;
  try {
    const existing = await mod.listAlarms();
    for (const a of existing) {
      if (a.id.startsWith(PREFIX)) await mod.cancelAlarm(a.id);
    }
    for (const w of collectAlarms(alarms, events)) {
      await mod.scheduleAlarm({
        id: w.id,
        datetimeISO: localISOString(w.at),
        title: w.title,
        body: w.body,
        snoozeEnabled: true,
        snoozeInterval: w.snooze,
      });
    }
  } catch (e) {
    console.warn("syncAlarms failed", e);
  }
}

/** طلب الصلاحيات (إشعارات + منبّه دقيق) */
export async function ensureAlarmPermissions(): Promise<boolean> {
  const mod = getAlarmModule();
  if (!mod) return false;
  try {
    return await mod.ensurePermissions();
  } catch {
    return false;
  }
}

/** منبّه تجريبي بعد دقيقة */
export async function scheduleTestAlarm(): Promise<boolean> {
  const mod = getAlarmModule();
  if (!mod) return false;
  const at = new Date(Date.now() + 60 * 1000);
  await mod.scheduleAlarm({
    id: `${PREFIX}test`,
    datetimeISO: localISOString(at),
    title: "منبّه تجريبي",
    body: "هذا اختبار للمنبّه الإجباري",
    snoozeEnabled: true,
    snoozeInterval: 5,
  });
  return true;
}


/** أقرب موعد رنين بين المنبّهات الفعّالة (خلال 8 أيام)، أو null */
export function nextAlarmFire(
  alarms: { id: string; label: string; time: string; days: number[]; onceDate?: string; enabled: boolean }[],
  now: Date,
): { at: Date; label: string } | null {
  let best: { at: Date; label: string } | null = null;
  for (const a of alarms) {
    if (!a.enabled) continue;
    for (let i = 0; i < 8; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const iso = toISO(d);
      const ok = a.days.length === 0 ? a.onceDate === iso : a.days.includes(d.getDay());
      if (!ok) continue;
      const at = combine(iso, a.time);
      if (at.getTime() <= now.getTime()) continue;
      if (!best || at < best.at) best = { at, label: a.label };
      break;
    }
  }
  return best;
}
