/** كتالوج ودجات احتياطي — غير مسجَّل في app.json ولا في widget-task-handler (انظر README.md). */
export type WidgetSize = "small" | "medium" | "wide";

export type WidgetSpec = {
  name: string;
  title: string;
  size: WidgetSize;
  /** ما يحتاجه من لقطة البيانات في widgetData.ts */
  needs: string[];
  /** دقائق التحديث الدوري */
  refreshMin: number;
};

export const WIDGET_CATALOG: WidgetSpec[] = [
  { name: "NextApptWidget", title: "الموعد القادم", size: "small", needs: ["nextAppointment"], refreshMin: 30 },
  { name: "DayApptsWidget", title: "مواعيد اليوم", size: "medium", needs: ["todayAppointments"], refreshMin: 30 },
  { name: "NextShiftWidget", title: "مناوبتي القادمة", size: "small", needs: ["nextShift"], refreshMin: 60 },
  { name: "MonthIncomeWidget", title: "دخلي هذا الشهر", size: "small", needs: ["monthIncomeTotal", "currency"], refreshMin: 60 },
  { name: "PrayerWidget", title: "الصلاة التالية (موجود)", size: "wide", needs: ["prayers"], refreshMin: 30 },
];
