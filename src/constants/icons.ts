/** أيقونات مرسلة مع التطبيق (assets/nav، assets/treatments، assets/icons) — require ثابت لأن Metro لا يقبل أسماء ديناميكية */
export const NAV_ICONS = {
  alarms: { on: require("../../assets/nav/alarms.png"), off: require("../../assets/nav/alarms-off.png") },
  home: { on: require("../../assets/nav/home.png"), off: require("../../assets/nav/home-off.png") },
  prayer: { on: require("../../assets/nav/prayer.png"), off: require("../../assets/nav/prayer-off.png") },
  docs: { on: require("../../assets/nav/docs.png"), off: require("../../assets/nav/docs-off.png") },
} as const;

export const TREATMENT_ICONS: Record<string, number> = {
  exam: require("../../assets/treatments/exam.png"),
  filling: require("../../assets/treatments/filling.png"),
  rct: require("../../assets/treatments/rct.png"),
  extraction: require("../../assets/treatments/extraction.png"),
  cleaning: require("../../assets/treatments/cleaning.png"),
  crown: require("../../assets/treatments/crown.png"),
  followup: require("../../assets/treatments/followup.png"),
  ortho: require("../../assets/treatments/ortho.png"),
  whitening: require("../../assets/treatments/whitening.png"),
  implant: require("../../assets/treatments/implant.png"),
};

/** أيقونات عامة للأقسام (متاحة لأي شاشة) */
export const APP_ICONS: Record<string, number> = {
  appointments: require("../../assets/icons/appointments.png"),
  tasks: require("../../assets/icons/tasks.png"),
  finance: require("../../assets/icons/finance.png"),
  habits: require("../../assets/icons/habits.png"),
  patients: require("../../assets/icons/patients.png"),
  plan: require("../../assets/icons/plan.png"),
  inventory: require("../../assets/icons/inventory.png"),
  reports: require("../../assets/icons/reports.png"),
};
