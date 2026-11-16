import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { TYPE_META } from "@/constants/shiftTypes";
import { agendaFor, occursOn, type AgendaInput } from "@/lib/agenda";
import { addDays, combine, fmtTime, fmtTimeDate, toISO } from "@/lib/dates";
import { FARD, PRAYER_LABELS, getPrayerTimes } from "@/lib/prayer";
import type { Settings, Task } from "@/types";

export const CHANNEL = {
  events: "events",
  prayer: "prayer",
  tasks: "tasks",
} as const;

let configured = false;

/** إعداد القنوات ومعالج العرض. يُستدعى مرة عند بدء التطبيق. */
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
    await Notifications.setNotificationChannelAsync(CHANNEL.tasks, {
      name: "المهام",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

/** يطلب إذن الإشعارات (Android 13+) ويعيد true إن مُنح */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

async function schedule(
  identifier: string,
  title: string,
  body: string,
  date: Date,
  channelId: string,
) {
  if (date.getTime() <= Date.now() + 5000) return;
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId,
    },
  });
}

type SyncInput = {
  agenda: AgendaInput;
  tasks: Task[];
  settings: Settings;
};

const PRAYER_DAYS = 5;
const EVENT_DAYS = 14;

/**
 * يعيد جدولة كل الإشعارات من الصفر:
 * صلاة (5 أيام) + تذكير أحداث (14 يومًا) + مواعيد العيادة + مهام لها موعد.
 */
export async function syncNotifications({ agenda, tasks, settings }: SyncInput): Promise<void> {
  const granted = (await Notifications.getPermissionsAsync()).granted;
  if (!granted) return;

  await Notifications.cancelAllScheduledNotificationsAsync();
  const today = toISO(new Date());

  // --- الصلاة ---
  for (let i = 0; i < PRAYER_DAYS; i++) {
    const iso = addDays(today, i);
    const base = combine(iso, "12:00");
    const times = getPrayerTimes(base, settings);
    for (const k of FARD) {
      if (!settings.prayerNotify[k]) continue;
      await schedule(
        `prayer-${iso}-${k}`,
        `حان وقت ${PRAYER_LABELS[k]}`,
        `${PRAYER_LABELS[k]} • ${fmtTimeDate(times[k])} بتوقيت حماه`,
        times[k],
        CHANNEL.prayer,
      );
    }
    if (settings.prayerNotify.sunrise) {
      await schedule(
        `prayer-${iso}-sunrise`,
        "الشروق",
        fmtTimeDate(times.sunrise),
        times.sunrise,
        CHANNEL.prayer,
      );
    }
  }

  // --- الأحداث (دوام/مناوبات/أنشطة) ---
  for (let i = 0; i < EVENT_DAYS; i++) {
    const iso = addDays(today, i);
    for (const e of agenda.events) {
      if (!occursOn(e, iso) || e.reminderMinutes == null) continue;
      const start = combine(iso, e.startTime);
      const at = new Date(start.getTime() - e.reminderMinutes * 60000);
      const lead = e.reminderMinutes > 0 ? `بعد ${e.reminderMinutes} دقيقة` : "الآن";
      await schedule(
        `event-${e.id}-${iso}`,
        e.title,
        `${TYPE_META[e.type].label} • يبدأ ${lead} (${fmtTime(e.startTime)})`,
        at,
        CHANNEL.events,
      );
    }

    // --- مواعيد العيادة الخاصة ---
    for (const it of agendaFor(iso, agenda)) {
      if (it.source !== "appointment") continue;
      if (it.status === "done" || it.status === "no_show") continue;
      const start = combine(iso, it.startTime);
      const at = new Date(start.getTime() - settings.appointmentReminder * 60000);
      await schedule(
        `appt-${it.refId}`,
        `موعد: ${it.title}`,
        `${it.subtitle ?? ""} • ${fmtTime(it.startTime)}`,
        at,
        CHANNEL.events,
      );
    }
  }

  // --- مهام لها موعد: تذكير 9 صباحًا ---
  for (const t of tasks) {
    if (t.done || !t.dueDate) continue;
    await schedule(`task-${t.id}`, "مهمة اليوم", t.title, combine(t.dueDate, "09:00"), CHANNEL.tasks);
  }
}

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
