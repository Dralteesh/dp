import { useMemo } from "react";
import { buildSuggestions, daySummary, type Suggestion } from "@/lib/smart";
import { toISO } from "@/lib/dates";
import { useAlarms } from "@/store/useAlarms";
import { useClinic } from "@/store/useClinic";
import { useExtras } from "@/store/useExtras";
import { usePlanner } from "@/store/usePlanner";
import { useSettings } from "@/store/useSettings";
import { useSmart } from "@/store/useSmart";

/** الاقتراحات الذكية الحالية (تُحسب من بيانات التطبيق كلها، وتتجدد كل دقيقة) */
export function useSmartSuggestions(now: Date, includeDismissed = false): { list: Suggestion[]; hidden: number; summary: string } {
  const tasks = usePlanner((s) => s.tasks);
  const events = usePlanner((s) => s.events);
  const alarms = useAlarms((s) => s.alarms);
  const patients = useClinic((s) => s.patients);
  const appointments = useClinic((s) => s.appointments);
  const sessions = useClinic((s) => s.sessions);
  const payments = useClinic((s) => s.payments);
  const inventory = useClinic((s) => s.inventory);
  const plans = useClinic((s) => s.plans);
  const installPlans = useExtras((s) => s.installPlans);
  const labOrders = useExtras((s) => s.labOrders);
  const sterilization = useExtras((s) => s.sterilization);
  const waitlist = useExtras((s) => s.waitlist);
  const currency = useSettings((s) => s.currency);
  const dismissedDay = useSmart((s) => s.day);
  const dismissed = useSmart((s) => s.dismissed);
  const minuteKey = Math.floor(now.getTime() / 60000);

  return useMemo(() => {
    const all = buildSuggestions({
      now,
      currency,
      tasks,
      alarms,
      events,
      appointments,
      patients,
      sessions,
      payments,
      inventory,
      plans,
      installPlans,
      labOrders,
      sterilization,
      waitlist,
    });
    const gone = new Set(dismissedDay === toISO(now) ? dismissed : []);
    const list = includeDismissed ? all : all.filter((s) => !gone.has(s.id));
    const summary = daySummary({ now, events, appointments, patients, tasks });
    return { list, hidden: all.length - all.filter((s) => !gone.has(s.id)).length, summary };
    // يُعاد الحساب كل دقيقة أو عند تغيّر البيانات
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minuteKey, currency, tasks, alarms, events, appointments, patients, sessions, payments, inventory, plans, installPlans, labOrders, sterilization, waitlist, dismissed, dismissedDay, includeDismissed]);
}
