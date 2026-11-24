import type { Planned } from "@/lib/notifications";
import { upcomingOccurrences } from "@/lib/countdown/engine";
import { reminderLabel } from "@/lib/countdown/format";
import type { Countdown } from "@/types/countdown";

/** أفق الجدولة وعدد المرّات لكل عدّاد (الميزانية العامة للإشعارات محدودة) */
const HORIZON_MS = 30 * 86_400_000;
const MAX_OCCURRENCES = 6;

/**
 * إشعارات العدّادات التنازلية: كل تذكير + لحظة الحدث.
 * المعرّف cd-<id>-<وقت الحدث>-<دقائق|at> فيُلغى ويُعاد بناؤه مع كل مزامنة (انظر notifications.ts).
 */
export function buildCountdownItems(items: Countdown[], nowMs: number = Date.now(), channel = "countdowns"): Planned[] {
  const out: Planned[] = [];
  for (const cd of items) {
    if (cd.direction !== "down") continue;
    const title = `${cd.emoji ? cd.emoji + " " : ""}${cd.title || "لحظة"}`;
    for (const t of upcomingOccurrences(cd, nowMs, HORIZON_MS, MAX_OCCURRENCES)) {
      if (cd.notifyAtEvent) {
        out.push({ id: `cd-${cd.id}-${t}-at`, title, body: "حان الموعد الآن", date: new Date(t), channel, data: { cdId: cd.id } });
      }
      for (const r of cd.reminders) {
        const at = t - r.minutes * 60_000;
        if (at <= nowMs || r.minutes <= 0) continue;
        out.push({
          id: `cd-${cd.id}-${t}-${r.minutes}`,
          title,
          body: `${reminderLabel(r.minutes)} • ${cd.description?.trim() || "اقترب الموعد"}`,
          date: new Date(at),
          channel,
          data: { cdId: cd.id },
        });
      }
    }
  }
  return out;
}
