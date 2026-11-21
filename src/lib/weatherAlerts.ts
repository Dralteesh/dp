import * as Notifications from "expo-notifications";
import { CHANNEL } from "@/lib/notifications";
import { hoursFromNow, severeAlerts, whenText } from "@/lib/weatherInsights";
import type { City, Weather } from "@/lib/weather";

const ID_RAIN = "weather-rain";
const ID_SEVERE = "weather-severe";

const cancel = async (id: string) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    /* غير موجود */
  }
};

const put = async (id: string, date: Date, title: string, body: string) => {
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL.events },
    });
  } catch (e) {
    console.warn("weather alert failed", e);
  }
};

/**
 * يجدول تنبيهي «مطر قريب» و«طقس خطير» من آخر تحديث للطقس (يُحسب عند فتح التطبيق/التحديث).
 * يتخطى المدن التي منطقتها الزمنية بعيدة عن الجهاز حتى لا يخطئ التوقيت.
 */
export async function scheduleWeatherAlerts(w: Weather, city: City, opts: { rain: boolean; severe: boolean }): Promise<void> {
  await cancel(ID_RAIN);
  await cancel(ID_SEVERE);
  const now = Date.now();
  const cityNow = new Date(w.now.time).getTime();
  if (!Number.isFinite(cityNow) || Math.abs(cityNow - now) > 2 * 3600 * 1000) return;

  if (opts.rain) {
    let start: number | null = null;
    const m = (w.minutely ?? []).find((x) => x.mm >= 0.1 && new Date(x.time).getTime() > now + 4 * 60000);
    if (m) start = new Date(m.time).getTime();
    else {
      const hrs = hoursFromNow(w, 12);
      const h = hrs.find((x, i) => i > 0 && (x.pop >= 60 || (x.precip ?? 0) >= 0.3));
      if (h) start = new Date(h.time).getTime();
    }
    const raining = (w.minutely ?? []).slice(0, 2).some((x) => x.mm >= 0.1 && new Date(x.time).getTime() <= now + 4 * 60000);
    if (start && !raining && start > now + 2 * 60000 && start < now + 12 * 3600 * 1000) {
      let fire = start - 20 * 60000;
      if (fire < now + 60000) fire = now + 30000;
      const mins = Math.max(1, Math.round((start - fire) / 60000));
      await put(ID_RAIN, new Date(fire), "☔ مطر قريب", `${city.name}: مطر متوقع بعد نحو ${mins} دقيقة. خذ مظلة.`);
    }
  }

  if (opts.severe) {
    const a = severeAlerts(w)[0];
    if (a) {
      const at = new Date(a.time).getTime();
      let fire = at - 3 * 3600 * 1000;
      if (fire < now + 30000) fire = now + 30000;
      await put(ID_SEVERE, new Date(fire), `⚠️ ${a.title}`, `${city.name}: ${a.title} ${whenText(w, a.time)}. خذ احتياطك.`);
    }
  }
}
