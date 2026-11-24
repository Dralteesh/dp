/** تنسيقات عربية للعدّادات (نقية: تُستعمل في الواجهة والودجت والإشعارات) */
import { DAYS, MONTHS } from "../../constants/arabic";
import type { CdRepeat, Countdown } from "../../types/countdown";
import { STATE_CAPTION, breakdown, fmtNum, partsFor, phrase, statusOf, unitTag, type Part, type UnitKey } from "./engine";

const pad = (n: number) => String(n).padStart(2, "0");

function localParts(cd: Countdown): Date {
  if (cd.instantMs != null) return new Date(cd.instantMs);
  const [y, m, d] = cd.date.split("-").map(Number);
  const [h, mi] = cd.time.split(":").map(Number);
  return new Date(y, m - 1, d, h || 0, mi || 0);
}

export function clock12(d: Date): string {
  const h = d.getHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(d.getMinutes())} ${h >= 12 ? "م" : "ص"}`;
}

/** «الجمعة 5 آذار 2027 • 9:00 ص» */
export function whenLabel(cd: Countdown, withTime = true): string {
  const d = localParts(cd);
  const day = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return withTime ? `${day} • ${clock12(d)}` : day;
}

export function shortWhen(cd: Countdown): string {
  const d = localParts(cd);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function repeatLabel(r: CdRepeat): string {
  switch (r.type) {
    case "daily": return "يوميًا";
    case "weekly": return "أسبوعيًا";
    case "monthly": return "شهريًا";
    case "yearly": return "سنويًا";
    case "days": return `كل ${phrase("days", Math.max(1, r.every ?? 1))}`;
    default: return "";
  }
}

export function reminderLabel(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m === 0) return "عند الحدث";
  if (m % 10080 === 0) return `قبل ${phrase("weeks", m / 10080)}`;
  if (m % 1440 === 0) return `قبل ${phrase("days", m / 1440)}`;
  if (m % 60 === 0) return `قبل ${phrase("hours", m / 60)}`;
  return `قبل ${phrase("minutes", m)}`;
}

export type View = {
  state: ReturnType<typeof statusOf>["state"];
  caption: string;
  parts: (Part & { tag: string; text: string })[];
  progress: number | null;
  /** عدد الأيام الكلي (للإحصاءات) */
  totalDays: number;
};

/** كل ما تحتاجه الواجهة لرسم عدّاد في لحظة معيّنة */
export function viewOf(cd: Countdown, nowMs: number): View {
  const st = statusOf(cd, nowMs);
  const b = breakdown(st.from, st.to);
  const parts = st.state === "now" ? [] : partsFor(b, cd.unit);
  return {
    state: st.state,
    caption: STATE_CAPTION[st.state],
    parts: parts.map((p) => ({ ...p, tag: unitTag(p.key as UnitKey, p.value), text: fmtNum(p.value) })),
    progress: st.progress,
    totalDays: b.totalDays,
  };
}

/** عرض مختصر في سطر واحد (الودجت، الرئيسية، الإشعارات) */
export function compactOf(cd: Countdown, nowMs: number): { value: string; unit: string; caption: string } {
  const st = statusOf(cd, nowMs);
  const caption = STATE_CAPTION[st.state];
  if (st.state === "now") return { value: "الآن", unit: "", caption };
  const b = breakdown(st.from, st.to);
  if (b.totalDays >= 1) return { value: fmtNum(b.totalDays), unit: unitTag("days", b.totalDays), caption };
  if (b.totalHours >= 1) return { value: `${b.hours}:${pad(b.minutes)}`, unit: "ساعة", caption };
  if (b.totalMinutes >= 1) return { value: String(b.totalMinutes), unit: unitTag("minutes", b.totalMinutes), caption };
  return { value: String(b.totalSeconds), unit: unitTag("seconds", b.totalSeconds), caption };
}
