import { useEffect, useMemo } from "react";
import { AppState } from "react-native";
import { useAgendaInput } from "@/hooks/useAgenda";
import { syncAlarms } from "@/lib/alarm";
import {
  ensureNotificationPermission,
  setupNotifications,
  syncNotifications,
} from "@/lib/notifications";
import { useAlarms } from "@/store/useAlarms";
import { usePrayerLog } from "@/store/usePrayerLog";
import { usePlanner } from "@/store/usePlanner";
import { useSettings } from "@/store/useSettings";
import { useWeather } from "@/store/useWeather";
import { refreshWidgets } from "@/widgets/updateWidgets";
import type { Settings } from "@/types";

/**
 * مكوّن بلا واجهة: يربط البيانات بالإشعارات والمنبّه والودجت.
 * كلما تغيّرت الأحداث أو المهام أو المنبّهات أو الإعدادات (بعد مهلة قصيرة)
 * يعيد الجدولة ويحدّث الودجت. ويفعل الشيء نفسه عند عودة التطبيق للواجهة.
 */
export function AppSync() {
  const agenda = useAgendaInput();
  const tasks = usePlanner((s) => s.tasks);
  const alarms = useAlarms((s) => s.alarms);
  // تحديث الطقس يعيد جدولة المنبّهات المرتبطة به (تقديم الرنين قبل المطر مثلًا)
  const weatherCache = useWeather((s) => s.cache);

  const doctorName = useSettings((s) => s.doctorName);
  const prayerMethod = useSettings((s) => s.prayerMethod);
  const madhab = useSettings((s) => s.madhab);
  const prayerAdjust = useSettings((s) => s.prayerAdjust);
  const prayerNotify = useSettings((s) => s.prayerNotify);
  const location = useSettings((s) => s.location);
  const prayerReminders = useSettings((s) => s.prayerReminders);
  const dhikr = useSettings((s) => s.dhikr);
  // تعليم صلاة كمُنجَزة أو تأجيلها يغيّر جدول التكرارات
  const prayerDone = usePrayerLog((s) => s.done);
  const prayerSnooze = usePrayerLog((s) => s.snoozeUntil);
  const defaultReminder = useSettings((s) => s.defaultReminder);
  const appointmentReminder = useSettings((s) => s.appointmentReminder);
  const currency = useSettings((s) => s.currency);

  const settings: Settings = useMemo(
    () => ({
      doctorName,
      prayerMethod,
      madhab,
      prayerAdjust,
      prayerNotify,
      location,
      prayerReminders,
      dhikr,
      defaultReminder,
      appointmentReminder,
      currency,
    } as Settings),
    [doctorName, prayerMethod, madhab, prayerAdjust, prayerNotify, location, prayerReminders, dhikr, defaultReminder, appointmentReminder, currency],
  );

  // إعداد القنوات وطلب الإذن مرة واحدة
  useEffect(() => {
    (async () => {
      await setupNotifications();
      await ensureNotificationPermission();
    })();
  }, []);

  const run = useMemo(
    () => async () => {
      await syncNotifications({ agenda, tasks, settings });
      await syncAlarms(alarms, agenda.events);
      await refreshWidgets();
    },
    // prayerDone/prayerSnooze: لا تُقرأ هنا لكنها تعيد الجدولة عند تغيّرها (syncNotifications تقرؤها من المتجر)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agenda, tasks, settings, alarms, prayerDone, prayerSnooze, weatherCache],
  );

  // تحديث الطقس عند الفتح وعند العودة للواجهة (لتنبيهات المطر والمنبّهات المرتبطة)
  useEffect(() => {
    useWeather.getState().refresh();
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active") useWeather.getState().refresh();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const t = setTimeout(run, 1500);
    return () => clearTimeout(t);
  }, [run]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") run();
    });
    return () => sub.remove();
  }, [run]);

  return null;
}
