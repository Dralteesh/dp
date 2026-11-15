import {
  CalculationMethod,
  Coordinates,
  Madhab,
  PrayerTimes,
  type CalculationParameters,
} from "adhan";
import type { PrayerKey, PrayerMethodKey, Settings } from "@/types";

/** حماه، سوريا */
export const CITY = { name: "حماه", lat: 35.1318, lng: 36.7578 };

export const PRAYER_LABELS: Record<PrayerKey, string> = {
  fajr: "الفجر",
  sunrise: "الشروق",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

export const PRAYER_ORDER: PrayerKey[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
/** الصلوات الخمس (بدون الشروق) */
export const FARD: PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export const PRAYER_METHODS: Record<
  PrayerMethodKey,
  { label: string; make: () => CalculationParameters }
> = {
  mwl: { label: "رابطة العالم الإسلامي", make: () => CalculationMethod.MuslimWorldLeague() },
  egyptian: { label: "الهيئة المصرية العامة للمساحة", make: () => CalculationMethod.Egyptian() },
  umm_al_qura: { label: "أم القرى (مكة)", make: () => CalculationMethod.UmmAlQura() },
  karachi: { label: "جامعة العلوم الإسلامية - كراتشي", make: () => CalculationMethod.Karachi() },
  turkey: { label: "رئاسة الشؤون الدينية التركية", make: () => CalculationMethod.Turkey() },
};

export type PrayerSettings = Pick<Settings, "prayerMethod" | "madhab" | "prayerAdjust">;

export function getPrayerTimes(date: Date, s: PrayerSettings): Record<PrayerKey, Date> {
  const params = PRAYER_METHODS[s.prayerMethod].make();
  params.madhab = s.madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  for (const k of PRAYER_ORDER) {
    const v = s.prayerAdjust[k];
    if (typeof v === "number") params.adjustments[k] = v;
  }
  const t = new PrayerTimes(new Coordinates(CITY.lat, CITY.lng), date, params);
  return {
    fajr: t.fajr,
    sunrise: t.sunrise,
    dhuhr: t.dhuhr,
    asr: t.asr,
    maghrib: t.maghrib,
    isha: t.isha,
  };
}

/** الصلاة القادمة (من الخمس) بعد الوقت المعطى */
export function nextPrayer(
  now: Date,
  s: PrayerSettings,
): { key: PrayerKey; time: Date; previous: Date } {
  const today = getPrayerTimes(now, s);
  for (let i = 0; i < FARD.length; i++) {
    const k = FARD[i];
    if (today[k].getTime() > now.getTime()) {
      const previous =
        i === 0
          ? getPrayerTimes(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1), s).isha
          : today[FARD[i - 1]];
      return { key: k, time: today[k], previous };
    }
  }
  const tomorrow = getPrayerTimes(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    s,
  );
  return { key: "fajr", time: tomorrow.fajr, previous: today.isha };
}
