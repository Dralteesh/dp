/** تحليلات محلية للطقس: تنبيهات، مطر قريب، جودة الهواء، القمر، توصيات، الوحدات (بلا إنترنت وبلا بيانات تُرسَل) */
import type { AirQuality, HourPoint, Weather } from "@/lib/weather";
import { kindOf, labelOf } from "@/lib/weather";

// ---------- الوحدات ----------
export type Units = { temp: "c" | "f"; wind: "kmh" | "mph" | "ms"; clock24: boolean };
export const DEFAULT_UNITS: Units = { temp: "c", wind: "kmh", clock24: false };

export const fmtTemp = (c: number, u: Units) => `\u200E${Math.round(u.temp === "f" ? (c * 9) / 5 + 32 : c)}°\u200E`;
export const fmtWind = (kmh: number, u: Units) =>
  u.wind === "mph" ? `${Math.round(kmh * 0.621371)} ميل/س` : u.wind === "ms" ? `${Math.round(kmh / 3.6)} م/ث` : `${Math.round(kmh)} كم/س`;
export const fmtDist = (m: number, u: Units) =>
  u.wind === "mph" ? `${(m / 1609.34).toFixed(m >= 16093 ? 0 : 1)} ميل` : `${(m / 1000).toFixed(m >= 10000 ? 0 : 1)} كم`;
export const fmtClock = (hhmm: string, u: Units) => {
  const [h, m] = hhmm.split(":").map(Number);
  if (u.clock24) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "ص" : "م"}`;
};
export const fmtHourLabel = (h: number, u: Units) => (u.clock24 ? `${String(h).padStart(2, "0")}:00` : `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "ص" : "م"}`);
export const fmtMm = (mm: number) => `${mm < 10 ? mm.toFixed(1) : Math.round(mm)} مم`;

// ---------- اتجاه الرياح ----------
const DIRS = ["شمال", "شمال شرق", "شرق", "جنوب شرق", "جنوب", "جنوب غرب", "غرب", "شمال غرب"];
export const compass = (deg: number) => DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

// ---------- جودة الهواء ----------
export function aqiInfo(us: number): { label: string; color: string; hint: string } {
  if (us <= 50) return { label: "جيدة", color: "#16A34A", hint: "الهواء نقي، لا قيود" };
  if (us <= 100) return { label: "مقبولة", color: "#CA8A04", hint: "حسّاسو الجهاز التنفسي يخففون الجهد الطويل" };
  if (us <= 150) return { label: "ضارّة للحسّاسين", color: "#EA580C", hint: "مرضى الربو والأطفال يقلّلون الخروج" };
  if (us <= 200) return { label: "غير صحية", color: "#DC2626", hint: "قلّل النشاط الخارجي الشاق" };
  if (us <= 300) return { label: "سيئة جدًا", color: "#9333EA", hint: "تجنّب الخروج غير الضروري" };
  return { label: "خطرة", color: "#7F1D1D", hint: "ابقَ في الداخل" };
}

// ---------- القمر ----------
const SYNODIC = 29.530588853;
export function moonPhase(d: Date = new Date()): { age: number; illum: number; label: string; icon: string } {
  const ref = Date.UTC(2000, 0, 6, 18, 14);
  const days = (d.getTime() - ref) / 86400000;
  const age = ((days % SYNODIC) + SYNODIC) % SYNODIC;
  const illum = (1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2;
  let label = "محاق";
  let icon = "moon-outline";
  if (age >= 1.85 && age < 5.54) label = "هلال متزايد";
  else if (age >= 5.54 && age < 9.23) label = "تربيع أول";
  else if (age >= 9.23 && age < 12.92) label = "أحدب متزايد";
  else if (age >= 12.92 && age < 16.61) {
    label = "بدر";
    icon = "moon";
  } else if (age >= 16.61 && age < 20.3) label = "أحدب متناقص";
  else if (age >= 20.3 && age < 23.99) label = "تربيع أخير";
  else if (age >= 23.99 && age < 27.68) label = "هلال متناقص";
  return { age, illum, label, icon };
}

// ---------- ساعات من الآن ----------
export function hoursFromNow(w: Weather, count: number): HourPoint[] {
  const key = w.now.time.slice(0, 13);
  let i = w.hours.findIndex((h) => h.time.slice(0, 13) === key);
  if (i < 0) i = 0;
  return w.hours.slice(i, i + count);
}

const minutesBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);

// ---------- مطر قريب ----------
export type RainSoon = { state: "now" | "soon" | "later" | "none"; inMin?: number; text: string };

export function rainSoon(w: Weather): RainSoon {
  const m = w.minutely ?? [];
  if (m.length > 0) {
    const nowT = w.now.time;
    const slots = m.filter((x) => x.time >= nowT.slice(0, 16) || minutesBetween(x.time, nowT) < 15);
    const first = slots.find((x) => x.mm >= 0.1);
    if (first) {
      const inMin = Math.max(0, minutesBetween(nowT, first.time));
      if (inMin <= 5) return { state: "now", inMin: 0, text: "يهطل مطر الآن" };
      return { state: "soon", inMin, text: `مطر بعد ${inMin > 120 ? `${Math.round(inMin / 60)} ساعات` : `${inMin} دقيقة`}` };
    }
  }
  const hrs = hoursFromNow(w, 8);
  const idx = hrs.findIndex((h, i) => i > 0 && (h.pop >= 60 || (h.precip ?? 0) >= 0.3));
  if (idx > 0) return { state: "later", inMin: idx * 60, text: `احتمال مطر بعد نحو ${idx} ${idx <= 10 ? "ساعات" : "ساعة"}` };
  return { state: "none", text: "لا مطر متوقع خلال الساعات القادمة" };
}

// ---------- تنبيهات الطقس الخطير (خلال 48 ساعة) ----------
export type Severe = { kind: "storm" | "rain" | "wind" | "heat" | "cold" | "snow" | "fog"; title: string; time: string; level: 1 | 2 };

export function severeAlerts(w: Weather): Severe[] {
  const out: Severe[] = [];
  const seen = new Set<string>();
  const add = (kind: Severe["kind"], title: string, time: string, level: 1 | 2 = 1) => {
    if (seen.has(kind)) return;
    seen.add(kind);
    out.push({ kind, title, time, level });
  };
  for (const h of hoursFromNow(w, 48)) {
    if (h.code >= 95) add("storm", "عاصفة رعدية", h.time, 2);
    if ((h.precip ?? 0) >= 7) add("rain", "أمطار غزيرة", h.time, 2);
    if ([71, 73, 75, 77, 85, 86].includes(h.code)) add("snow", "تساقط ثلوج", h.time);
    if ((h.gust ?? 0) >= 60) add("wind", `رياح قوية (هبّات ${Math.round(h.gust ?? 0)} كم/س)`, h.time, (h.gust ?? 0) >= 80 ? 2 : 1);
    if (h.temp >= 40) add("heat", "حرارة شديدة", h.time, h.temp >= 45 ? 2 : 1);
    if (h.temp <= 0) add("cold", h.temp <= -5 ? "برد قارس" : "صقيع", h.time, h.temp <= -5 ? 2 : 1);
    if (h.code === 45 || h.code === 48) {
      if ((h.vis ?? 9999) >= 0 && (h.vis ?? 9999) < 500) add("fog", "ضباب كثيف", h.time);
    }
  }
  return out;
}

/** «الآن» أو «بعد X ساعة» أو «اليوم/غدًا الساعة …» لوقت تنبيه */
export function whenText(w: Weather, time: string): string {
  const mins = minutesBetween(w.now.time, time);
  if (mins <= 30) return "الآن";
  if (mins < 60) return `بعد ${mins} دقيقة`;
  if (mins < 120) return "بعد ساعة";
  const hrs = Math.round(mins / 60);
  return hrs < 24 ? `بعد ${hrs} ساعة` : `بعد ${Math.round(hrs / 24)} يوم`;
}

// ---------- توصيات ----------
export type Advice = { icon: string; text: string; tone: "ok" | "warn" | "info" };

/** درجة الملاءمة للخروج لساعة (أصغر = أفضل) */
function outingPenalty(h: HourPoint): number {
  let p = Math.abs(h.temp - 21) * 1.2;
  p += h.pop * 0.35 + (h.precip ?? 0) * 12;
  p += Math.max(0, (h.gust ?? 0) - 25) * 0.5;
  if (h.code >= 95) p += 100;
  return p;
}

export function bestOutingHour(w: Weather): HourPoint | null {
  const cands = hoursFromNow(w, 16).filter((h) => {
    const hr = Number(h.time.slice(11, 13));
    return hr >= 7 && hr <= 21;
  });
  if (cands.length === 0) return null;
  return cands.reduce((a, b) => (outingPenalty(b) < outingPenalty(a) ? b : a));
}

export function runSuitability(w: Weather): { ok: boolean; reason: string } {
  const h = hoursFromNow(w, 3);
  const maxPop = Math.max(...h.map((x) => x.pop), 0);
  const gust = Math.max(w.now.gust ?? 0, w.now.wind);
  const t = w.now.feels;
  if (maxPop >= 50) return { ok: false, reason: "مطر محتمل خلال ساعات" };
  if (w.now.code >= 95) return { ok: false, reason: "عواصف رعدية" };
  if (t >= 33) return { ok: false, reason: "الحرارة مرتفعة للجري" };
  if (t <= 0) return { ok: false, reason: "الجو متجمّد" };
  if (gust >= 40) return { ok: false, reason: "رياح قوية" };
  if (w.aqi && w.aqi.us > 100) return { ok: false, reason: "جودة الهواء ضعيفة" };
  return { ok: true, reason: "الجو مناسب للجري والمشي" };
}

export function buildAdvice(w: Weather, fmtT: (c: number) => string, cityName?: string): Advice[] {
  const out: Advice[] = [];
  const rain = rainSoon(w);
  if (rain.state === "now" || rain.state === "soon" || rain.state === "later") out.push({ icon: "umbrella-outline", text: `خذ مظلة · ${rain.text}`, tone: "warn" });
  else out.push({ icon: "umbrella-outline", text: "لا تحتاج مظلة اليوم", tone: "ok" });

  const f = w.now.feels;
  if (f <= 8) out.push({ icon: "shirt-outline", text: `معطف ثقيل · يُحسّ كـ ${fmtT(f)}`, tone: "info" });
  else if (f <= 17) out.push({ icon: "shirt-outline", text: "سترة خفيفة تكفي", tone: "info" });
  else if (f >= 32) out.push({ icon: "water-outline", text: "اشرب الماء كثيرًا واحذر الشمس", tone: "warn" });

  const today = w.days[0];
  if (today && today.uv >= 6) out.push({ icon: "sunny-outline", text: `UV ${Math.round(today.uv)}: كريم واقٍ من الشمس`, tone: "warn" });

  const run = runSuitability(w);
  out.push({ icon: "walk-outline", text: run.ok ? "مناسب للجري الآن" : `غير مناسب للجري: ${run.reason}`, tone: run.ok ? "ok" : "warn" });

  const best = bestOutingHour(w);
  if (best) out.push({ icon: "time-outline", text: `أفضل وقت للخروج: ${best.time.slice(11, 16)}`, tone: "info" });
  void cityName;
  return out;
}

/** «طقس اليوم في دقيقة»: فقرة قصيرة تُقرأ أو تُعرض */
export function dayBrief(w: Weather, city: string, fmtT: (c: number) => string): string {
  const today = w.days[0];
  const parts: string[] = [];
  parts.push(`${city}: ${labelOf(w.now.code, w.now.isDay)} الآن وحرارتها ${fmtT(w.now.temp)}.`);
  if (today) parts.push(`العظمى ${fmtT(today.max)} والصغرى ${fmtT(today.min)}.`);
  const rain = rainSoon(w);
  if (rain.state !== "none") parts.push(`${rain.text}.`);
  else if (today && today.pop >= 30) parts.push(`احتمال المطر خلال اليوم ${Math.round(today.pop)}٪.`);
  const sev = severeAlerts(w)[0];
  if (sev) parts.push(`تنبيه: ${sev.title} ${whenText(w, sev.time)}.`);
  if (w.aqi && w.aqi.us > 100) parts.push(`جودة الهواء ${aqiInfo(w.aqi.us).label}.`);
  const best = bestOutingHour(w);
  if (best) parts.push(`أفضل وقت للخروج الساعة ${best.time.slice(11, 16)}.`);
  return parts.join(" ");
}

/** نصائح نوم تتأثر بالحرارة (للشاشة الليلية) */
export function sleepWeatherTip(w: Weather | undefined): string | null {
  if (!w) return null;
  const night = w.hours.filter((h) => {
    const hr = Number(h.time.slice(11, 13));
    return h.time.slice(0, 10) === w.now.time.slice(0, 10) && (hr >= 22 || hr <= 5);
  });
  const t = night.length ? Math.min(...night.map((h) => h.temp)) : w.now.temp;
  if (t >= 26) return "ليلة حارّة: خفّف الغطاء وهوِّ الغرفة قبل النوم بساعة";
  if (t <= 10) return "ليلة باردة: غطاء دافئ وغرفة حول 18°م مثالية للنوم";
  return "حرارة الليل مناسبة لنوم هادئ";
}

export function aqiBreakdown(a: AirQuality): { label: string; value: string }[] {
  return [
    { label: "PM2.5", value: `${Math.round(a.pm25)} µg` },
    { label: "PM10", value: `${Math.round(a.pm10)} µg` },
    { label: "غبار", value: `${Math.round(a.dust)} µg` },
    { label: "أوزون", value: `${Math.round(a.ozone)} µg` },
    { label: "NO₂", value: `${Math.round(a.no2)} µg` },
  ];
}

/** يُستعمل خارج الواجهة: هل الحالة مطر؟ */
export const isRainy = (code: number) => ["drizzle", "rain", "storm"].includes(kindOf(code));
