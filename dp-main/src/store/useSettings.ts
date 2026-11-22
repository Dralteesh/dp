import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_PLACE, applyTypeSettings } from "@/constants/shiftTypes";
import { setCity } from "@/lib/prayer";
import { STORAGE_KEYS, storage } from "@/lib/storage";
import type { DhikrSettings, PrayerKey, PrayerReminders, Settings } from "@/types";

export const DEFAULT_DHIKR_TEXTS = [
  "سبحان الله وبحمده، سبحان الله العظيم",
  "أستغفر الله العظيم وأتوب إليه",
  "لا إله إلا الله وحده لا شريك له",
  "اللهم صلِّ وسلم على نبينا محمد",
  "لا حول ولا قوة إلا بالله",
  "سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر",
];

export const DEFAULT_PRAYER_REMINDERS: PrayerReminders = {
  before: { enabled: true, minutes: 30 },
  atAdhan: { enabled: true, sound: true },
  repeat: { enabled: true, everyMin: 10, quietFrom: "23:30", quietTo: "04:00" },
  quiet: { enabled: true, minutes: 20 },
};

export const DEFAULT_DHIKR: DhikrSettings = {
  enabled: false,
  mode: "interval",
  everyMin: 90,
  countPerDay: 8,
  from: "08:00",
  to: "22:00",
  avoidPrayerMin: 10,
  texts: DEFAULT_DHIKR_TEXTS,
};

export const DEFAULT_TIMELINE = { days: 5, densePx: 15, basePx: 4, maxH: 420, minCardH: 30, longHours: 4 };

export const DEFAULT_SETTINGS: Settings = {
  doctorName: "",
  prayerMethod: "mwl",
  madhab: "shafi",
  prayerAdjust: {},
  prayerNotify: {
    fajr: true,
    sunrise: false,
    dhuhr: true,
    asr: true,
    maghrib: true,
    isha: true,
  },
  incomeSplit: { doctorPct: 0, materialsPct: 0 },
  location: null,
  mosque: null,
  quranTranslation: "none",
  prayerReminders: DEFAULT_PRAYER_REMINDERS,
  dhikr: DEFAULT_DHIKR,
  defaultReminder: 30,
  appointmentReminder: 30,
  currency: "ل.س",
  typeColors: {},
  workplaces: {},
  places: [DEFAULT_PLACE],
  homeShowTasks: true,
  homeShowDocs: true,
  quickAdd: null,
  prayerTools: null,
  clinicTools: null,
  timeline: DEFAULT_TIMELINE,
  procedures: null,
  defaultAlarmChallenge: "math",
  appName: "",
  logo: "",
  clinicName: "",
  clinicLogo: "",
  usdRate: 0,
  payRates: {},
  monthlySalary: 0,
};

type SettingsState = Settings & {
  update: (patch: Partial<Settings>) => void;
  setAdjust: (key: PrayerKey, minutes: number) => void;
  toggleNotify: (key: PrayerKey) => void;
  reset: () => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
      setAdjust: (key, minutes) =>
        set((s) => ({ prayerAdjust: { ...s.prayerAdjust, [key]: minutes } })),
      toggleNotify: (key) =>
        set((s) => ({ prayerNotify: { ...s.prayerNotify, [key]: !s.prayerNotify[key] } })),
      reset: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: STORAGE_KEYS.settings,
      storage,
      partialize: (s) => ({
        doctorName: s.doctorName,
        prayerMethod: s.prayerMethod,
        madhab: s.madhab,
        prayerAdjust: s.prayerAdjust,
        prayerNotify: s.prayerNotify,
        prayerReminders: s.prayerReminders,
        incomeSplit: s.incomeSplit,
        location: s.location,
        mosque: s.mosque,
        quranTranslation: s.quranTranslation,
        dhikr: s.dhikr,
        defaultReminder: s.defaultReminder,
        appointmentReminder: s.appointmentReminder,
        currency: s.currency,
        typeColors: s.typeColors,
        workplaces: s.workplaces,
        places: s.places,
        homeShowTasks: s.homeShowTasks,
        homeShowDocs: s.homeShowDocs,
        quickAdd: s.quickAdd,
        prayerTools: s.prayerTools,
        clinicTools: s.clinicTools,
        timeline: s.timeline,
        procedures: s.procedures,
        defaultAlarmChallenge: s.defaultAlarmChallenge,
        appName: s.appName,
        logo: s.logo,
        clinicName: s.clinicName,
        clinicLogo: s.clinicLogo,
        usdRate: s.usdRate,
        payRates: s.payRates,
        monthlySalary: s.monthlySalary,
      }),
      // دمج عميق للقيم الجديدة حتى لا تنكسر نسخ قديمة أو مزامنة ناقصة
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Settings>;
        return {
          ...current,
          ...p,
          prayerReminders: {
            before: { ...DEFAULT_PRAYER_REMINDERS.before, ...p.prayerReminders?.before },
            atAdhan: { ...DEFAULT_PRAYER_REMINDERS.atAdhan, ...p.prayerReminders?.atAdhan },
            repeat: { ...DEFAULT_PRAYER_REMINDERS.repeat, ...p.prayerReminders?.repeat },
            quiet: { ...DEFAULT_PRAYER_REMINDERS.quiet, ...p.prayerReminders?.quiet },
          },
          incomeSplit: { ...DEFAULT_SETTINGS.incomeSplit, ...p.incomeSplit },
          timeline: { ...DEFAULT_TIMELINE, ...p.timeline },
          dhikr: { ...DEFAULT_DHIKR, ...p.dhikr, texts: p.dhikr?.texts ?? DEFAULT_DHIKR_TEXTS },
        };
      },
      // بعد قراءة التخزين: طبّق الألوان المحفوظة قبل أول رسم
      onRehydrateStorage: () => (state) => {
        applyTypeSettings(state?.typeColors, state?.workplaces);
        setCity(state?.location);
      },
    },
  ),
);

// أي تغيير في الألوان أو أماكن العمل (تعديل، مزامنة، استعادة) يُطبَّق فورًا
let lastColors: unknown = useSettings.getState().typeColors;
let lastPlaces: unknown = useSettings.getState().workplaces;
useSettings.subscribe((s) => {
  if (s.typeColors !== lastColors || s.workplaces !== lastPlaces) {
    lastColors = s.typeColors;
    lastPlaces = s.workplaces;
    applyTypeSettings(s.typeColors, s.workplaces);
  }
});

// الموقع يتبع الإعدادات دائمًا (يشمل المزامنة السحابية والاستعادة)
useSettings.subscribe((st, prev) => {
  if (st.location !== prev.location) setCity(st.location);
});
