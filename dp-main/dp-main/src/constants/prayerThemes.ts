import { getPrayerTimes, type PrayerSettings } from "@/lib/prayer";
import type { PrayerKey } from "@/types";

export type PrayerTheme = {
  /** تدرّج السماء: أعلى / وسط / أسفل */
  sky: [string, string, string];
  /** لون اللوح الزجاجي خلف قائمة الصلوات */
  glass: string;
  /** لون المباني (الطبقات الثلاث بشفافيات مختلفة) */
  solid: string;
  /** لون النوافذ المضيئة وشفافيتها */
  win: string;
  winOpacity: number;
  /** ليل: هلال ونجوم. نهار: شمس */
  night: boolean;
  /** ارتفاع الشمس/القمر في المشهد (من 300) */
  discY: number;
  clouds: boolean;
  rays: boolean;
  birds: boolean;
};

export const PRAYER_THEMES: Record<PrayerKey, PrayerTheme> = {
  fajr: {
    sky: ["#0d0f2e", "#1f1c5c", "#3a2f7a"],
    glass: "rgba(5,6,20,0.55)",
    solid: "#05060f",
    win: "#ffd98a",
    winOpacity: 0.95,
    night: true,
    discY: 120,
    clouds: false,
    rays: false,
    birds: false,
  },
  sunrise: {
    sky: ["#4b3a8c", "#d9668c", "#f6b27a"],
    glass: "rgba(60,30,80,0.42)",
    solid: "#4a1f5e",
    win: "#ffe3b3",
    winOpacity: 0.9,
    night: false,
    discY: 180,
    clouds: true,
    rays: true,
    birds: true,
  },
  dhuhr: {
    sky: ["#3aa6ec", "#6cc0f2", "#8fd3f7"],
    glass: "rgba(20,70,130,0.38)",
    solid: "#2b6aa8",
    win: "#ffffff",
    winOpacity: 0.5,
    night: false,
    discY: 108,
    clouds: true,
    rays: false,
    birds: true,
  },
  asr: {
    sky: ["#58b2e6", "#bfe3f5", "#f6dcaa"],
    glass: "rgba(20,80,120,0.38)",
    solid: "#3b7fae",
    win: "#ffffff",
    winOpacity: 0.5,
    night: false,
    discY: 110,
    clouds: true,
    rays: false,
    birds: true,
  },
  maghrib: {
    sky: ["#ff5a3c", "#ff8c5c", "#f9b66e"],
    glass: "rgba(120,30,20,0.32)",
    solid: "#7a2a30",
    win: "#ffe9b0",
    winOpacity: 0.85,
    night: false,
    discY: 170,
    clouds: true,
    rays: true,
    birds: false,
  },
  isha: {
    sky: ["#6b4fa8", "#8a6cc0", "#5b5aa0"],
    glass: "rgba(40,25,80,0.38)",
    solid: "#2c2468",
    win: "#ffe3a0",
    winOpacity: 0.95,
    night: true,
    discY: 130,
    clouds: false,
    rays: false,
    birds: false,
  },
};

/**
 * مفتاح سماء الآن: الصلاة القادمة، إلا بين الفجر والشروق فتظهر سماء الفجر الوردية.
 * (nextPrayer لا يعيد الشروق لأنه ليس من الخمس.)
 */
export function skyKey(now: Date, s: PrayerSettings, nextKey: PrayerKey): PrayerKey {
  const t = getPrayerTimes(now, s);
  const n = now.getTime();
  return n >= t.fajr.getTime() && n < t.sunrise.getTime() ? "sunrise" : nextKey;
}
