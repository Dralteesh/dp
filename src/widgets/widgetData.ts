import AsyncStorage from "@react-native-async-storage/async-storage";
import { agendaFor, type AgendaItem } from "@/lib/agenda";
import { combine, fmtDateLong, fmtTime, fmtTimeDate, relativeDay, toISO } from "@/lib/dates";
import { PRAYER_LABELS, nextPrayer } from "@/lib/prayer";
import { SURAHS, SURAH_START_PAGE } from "@/lib/quranMeta";
import { fetchWeather, kindOf, labelOf, type City, type Kind, type Weather } from "@/lib/weather";
import { DEFAULT_UNITS, fmtTemp, type Units } from "@/lib/weatherInsights";
import { applyTypeSettings } from "@/constants/shiftTypes";
import { DEFAULT_SETTINGS } from "@/store/useSettings";
import { STORAGE_KEYS } from "@/lib/storage";
import type { AlarmItem, Appointment, Patient, PlannerEvent, Settings, Task } from "@/types";

export type WidgetData = {
  dateLabel: string;
  items: (AgendaItem & { timeLabel: string })[];
  moreCount: number;
  prayer: { label: string; time: string; remaining: string };
};

async function readPersisted<T>(key: string): Promise<Partial<T>> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return {};
    return (JSON.parse(raw)?.state ?? {}) as Partial<T>;
  } catch {
    return {};
  }
}

async function isLockOn(): Promise<boolean> {
  const d = await readPersisted<{ lockEnabled: boolean }>("dp.device.v1");
  return !!d.lockEnabled;
}

/**
 * يقرأ البيانات مباشرة من AsyncStorage (دون مخازن Zustand)
 * لأن الودجت قد يعمل والتطبيق مغلق.
 */
export async function loadWidgetData(maxItems = 4): Promise<WidgetData> {
  const planner = await readPersisted<{ events: PlannerEvent[] }>(STORAGE_KEYS.planner);
  const clinic = await readPersisted<{ appointments: Appointment[]; patients: Patient[] }>(
    STORAGE_KEYS.clinic,
  );
  const stored = await readPersisted<Settings>(STORAGE_KEYS.settings);
  const settings: Settings = { ...DEFAULT_SETTINGS, ...stored };
  // الودجت قد يعمل والتطبيق مغلق: طبّق الألوان المحفوظة
  applyTypeSettings(settings.typeColors, settings.workplaces);

  const now = new Date();
  const iso = toISO(now);
  // الودجت يظهر على الشاشة الرئيسية بلا قفل: عند تفعيل قفل التطبيق نخفي أسماء المرضى
  const locked = await isLockOn();
  const all = agendaFor(iso, {
    events: planner.events ?? [],
    appointments: clinic.appointments ?? [],
    patients: clinic.patients ?? [],
  });

  // نخفي ما انتهى وقته
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const upcoming = all.filter((it) => {
    if (it.endsNextDay) return true;
    const [h, m] = it.endTime.split(":").map(Number);
    return h * 60 + m >= nowMin;
  });

  const np = nextPrayer(now, settings);
  const diffMin = Math.max(0, Math.round((np.time.getTime() - now.getTime()) / 60000));
  const remaining = diffMin >= 60 ? `${Math.floor(diffMin / 60)} س ${diffMin % 60} د` : `${diffMin} د`;

  return {
    dateLabel: fmtDateLong(iso),
    items: upcoming
      .slice(0, maxItems)
      .map((it) => ({ ...it, timeLabel: fmtTime(it.startTime) }))
      .map((it) => (locked && it.source === "appointment" ? { ...it, title: it.procedure || "موعد عيادة", subtitle: undefined } : it)),
    moreCount: Math.max(0, upcoming.length - maxItems),
    prayer: { label: PRAYER_LABELS[np.key], time: fmtTimeDate(np.time), remaining },
  };
}

export type WeatherWidgetData = { city: string; dateLabel: string; temp: string; label: string; kind: Kind; isDay: boolean };

/** بيانات ودجت الطقس: يحاول جلب طقس جديد (8 ثوانٍ كحد أقصى) وإلا يعرض آخر طقس محفوظ */
export async function loadWeatherWidgetData(fresh = false): Promise<WeatherWidgetData> {
  const st = await readPersisted<{ cities: City[]; index: number; cache: Record<string, Weather>; units: Units }>("dp.weather.v1");
  const city = st.cities?.[st.index ?? 0] ?? st.cities?.[0];
  let w: Weather | undefined = city ? st.cache?.[city.id] : undefined;
  if (fresh && city) {
    try {
      w = await Promise.race([fetchWeather(city), new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000))]);
    } catch {
      // نبقى على المحفوظ
    }
  }
  const dateLabel = fmtDateLong(toISO(new Date()));
  if (!city || !w) return { city: city?.name ?? "الطقس", dateLabel, temp: "--°", label: "افتح التطبيق", kind: "cloudy", isDay: true };
  return {
    city: city.name,
    dateLabel,
    temp: fmtTemp(w.now.temp, st.units ?? DEFAULT_UNITS),
    label: labelOf(w.now.code, w.now.isDay),
    kind: kindOf(w.now.code),
    isDay: w.now.isDay,
  };
}


// ---------- ودجت المنبّه ----------
export type AlarmWidgetData = { time: string; when: string; label: string; activeCount: number; hasNext: boolean };

/** أقرب رنين بين المنبّهات الفعّالة (نسخة خفيفة: لا تستورد lib/alarm لأنه يحمّل مخزن الطقس) */
export async function loadAlarmWidgetData(): Promise<AlarmWidgetData> {
  const st = await readPersisted<{ alarms: AlarmItem[] }>(STORAGE_KEYS.alarms);
  const alarms = (st.alarms ?? []).filter((a) => a.enabled);
  const now = new Date();
  let best: { at: Date; a: AlarmItem; iso: string } | null = null;
  for (const a of alarms) {
    for (let i = 0; i < 8; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const iso = toISO(d);
      const ok = a.days.length === 0 ? a.onceDate === iso : a.days.includes(d.getDay());
      if (!ok) continue;
      const at = combine(iso, a.time);
      if (at.getTime() <= now.getTime()) continue;
      if (!best || at < best.at) best = { at, a, iso };
      break;
    }
  }
  if (!best) return { time: "--:--", when: "لا منبّه قادم", label: "", activeCount: alarms.length, hasNext: false };
  return { time: fmtTime(best.a.time), when: relativeDay(best.iso), label: best.a.label, activeCount: alarms.length, hasNext: true };
}

// ---------- ودجت المهام ----------
export type TasksWidgetData = { open: number; items: { title: string; priority: Task["priority"]; due?: string }[] };

export async function loadTasksWidgetData(maxItems = 4): Promise<TasksWidgetData> {
  const st = await readPersisted<{ tasks: Task[] }>(STORAGE_KEYS.planner);
  const open = (st.tasks ?? []).filter((t) => !t.done);
  const rank = { high: 0, normal: 1, low: 2 } as const;
  open.sort((a, b) => rank[a.priority] - rank[b.priority] || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  return {
    open: open.length,
    items: open.slice(0, maxItems).map((t) => ({ title: t.title, priority: t.priority, due: t.dueDate ? relativeDay(t.dueDate) : undefined })),
  };
}

// ---------- ودجت العيادة ----------
export type ClinicWidgetData = {
  total: number;
  done: number;
  next: { time: string; patient: string; procedure: string } | null;
};

export async function loadClinicWidgetData(): Promise<ClinicWidgetData> {
  const st = await readPersisted<{ appointments: Appointment[]; patients: Patient[] }>(STORAGE_KEYS.clinic);
  const now = new Date();
  const today = toISO(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const list = (st.appointments ?? [])
    .filter((a) => a.date === today && a.status !== "cancelled" && a.status !== "postponed")
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const next = list.find((a) => a.status !== "done" && a.status !== "no_show" && Number(a.startTime.slice(0, 2)) * 60 + Number(a.startTime.slice(3, 5)) + a.durationMin > nowMin);
  const name = (id: string) => (st.patients ?? []).find((p) => p.id === id)?.name ?? "مريض";
  return {
    total: list.length,
    done: list.filter((a) => a.status === "done").length,
    next: next ? { time: fmtTime(next.startTime), patient: (await isLockOn()) ? "موعد عيادة" : name(next.patientId), procedure: next.procedure } : null,
  };
}

// ---------- ودجت القرآن ----------
export type QuranWidgetData = { page: number; surah: string };

export async function loadQuranWidgetData(): Promise<QuranWidgetData> {
  const st = await readPersisted<{ lastPage: number }>("dp.quran.v1");
  const page = Math.min(604, Math.max(1, Math.round(st.lastPage ?? 1)));
  let idx = 0;
  for (let i = 0; i < SURAH_START_PAGE.length; i++) if (SURAH_START_PAGE[i] <= page) idx = i;
  return { page, surah: SURAHS[idx] };
}
