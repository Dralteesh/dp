import AsyncStorage from "@react-native-async-storage/async-storage";
import { agendaFor, type AgendaItem } from "@/lib/agenda";
import { fmtDateLong, fmtTime, fmtTimeDate, toISO } from "@/lib/dates";
import { PRAYER_LABELS, nextPrayer } from "@/lib/prayer";
import { applyTypeSettings } from "@/constants/shiftTypes";
import { DEFAULT_SETTINGS } from "@/store/useSettings";
import { STORAGE_KEYS } from "@/lib/storage";
import type { Appointment, Patient, PlannerEvent, Settings } from "@/types";

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
    items: upcoming.slice(0, maxItems).map((it) => ({ ...it, timeLabel: fmtTime(it.startTime) })),
    moreCount: Math.max(0, upcoming.length - maxItems),
    prayer: { label: PRAYER_LABELS[np.key], time: fmtTimeDate(np.time), remaining },
  };
}
