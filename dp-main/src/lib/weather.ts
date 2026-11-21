/** خدمة الطقس: Open-Meteo (مجانية وبلا مفتاح) + ألوان وأوصاف عربية حسب الحالة */

export type City = { id: string; name: string; sub?: string; lat: number; lng: number };

export type HourPoint = { time: string; temp: number; pop: number; code: number };
export type DayPoint = {
  date: string;
  code: number;
  max: number;
  min: number;
  pop: number;
  uv: number;
  sunrise: string;
  sunset: string;
};
export type Weather = {
  fetchedAt: number;
  now: { time: string; temp: number; feels: number; humidity: number; wind: number; pressure: number; code: number; isDay: boolean };
  hours: HourPoint[];
  days: DayPoint[];
};

export const DEFAULT_CITY: City = { id: "hama", name: "حماه", sub: "سوريا", lat: 35.1318, lng: 36.7578 };

const URL_F = "https://api.open-meteo.com/v1/forecast";
const URL_G = "https://geocoding-api.open-meteo.com/v1/search";

const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);

export async function fetchWeather(c: Pick<City, "lat" | "lng">): Promise<Weather> {
  const q =
    `${URL_F}?latitude=${c.lat}&longitude=${c.lng}&timezone=auto&forecast_days=7&wind_speed_unit=kmh` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,surface_pressure,weather_code,is_day` +
    `&hourly=temperature_2m,precipitation_probability,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset`;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch(q, { signal: ctl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const cur = j.current ?? {};
    const h = j.hourly ?? {};
    const d = j.daily ?? {};
    const hours: HourPoint[] = (h.time ?? []).map((time: string, i: number) => ({
      time,
      temp: num(h.temperature_2m?.[i]),
      pop: num(h.precipitation_probability?.[i]),
      code: num(h.weather_code?.[i]),
    }));
    const days: DayPoint[] = (d.time ?? []).map((date: string, i: number) => ({
      date,
      code: num(d.weather_code?.[i]),
      max: num(d.temperature_2m_max?.[i]),
      min: num(d.temperature_2m_min?.[i]),
      pop: num(d.precipitation_probability_max?.[i]),
      uv: num(d.uv_index_max?.[i]),
      sunrise: String(d.sunrise?.[i] ?? ""),
      sunset: String(d.sunset?.[i] ?? ""),
    }));
    return {
      fetchedAt: Date.now(),
      now: {
        time: String(cur.time ?? ""),
        temp: num(cur.temperature_2m),
        feels: num(cur.apparent_temperature, num(cur.temperature_2m)),
        humidity: num(cur.relative_humidity_2m),
        wind: num(cur.wind_speed_10m),
        pressure: num(cur.surface_pressure),
        code: num(cur.weather_code),
        isDay: num(cur.is_day, 1) === 1,
      },
      hours,
      days,
    };
  } finally {
    clearTimeout(t);
  }
}

export async function searchCities(name: string): Promise<City[]> {
  const q = name.trim();
  if (q.length < 2) return [];
  const r = await fetch(`${URL_G}?name=${encodeURIComponent(q)}&count=8&language=ar&format=json`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  return (j.results ?? []).map((x: { id: number; name: string; admin1?: string; country?: string; latitude: number; longitude: number }) => ({
    id: String(x.id),
    name: x.name,
    sub: [x.admin1, x.country].filter(Boolean).join("، "),
    lat: x.latitude,
    lng: x.longitude,
  }));
}

// ---------- الحالة والمظهر ----------
export type Kind = "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm";

export function kindOf(code: number): Kind {
  if (code === 0) return "clear";
  if (code === 1 || code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "cloudy";
}

const LABELS: Record<Kind, string> = {
  clear: "صافٍ",
  partly: "غائم جزئيًا",
  cloudy: "غائم",
  fog: "ضباب",
  drizzle: "رذاذ",
  rain: "أمطار",
  snow: "ثلوج",
  storm: "عواصف رعدية",
};
export const labelOf = (code: number, isDay = true) => (kindOf(code) === "clear" && !isDay ? "صافٍ ليلًا" : LABELS[kindOf(code)]);

export type Theme = { bg: string; ink: string; soft: string; shape: string; shape2: string; accent: string; dark: boolean };

export function themeOf(code: number, isDay: boolean): Theme {
  const k = kindOf(code);
  if (!isDay) {
    if (k === "clear" || k === "partly") return { bg: "#14203B", ink: "#F5F5F0", soft: "#22304F", shape: "#F6E7A8", shape2: "#3A4A70", accent: "#F6E7A8", dark: true };
    return { bg: "#222A3A", ink: "#F2F2EE", soft: "#313B50", shape: "#4A566E", shape2: "#6C7B96", accent: "#8FB4FF", dark: true };
  }
  switch (k) {
    case "clear":
      return { bg: "#FFF1C2", ink: "#111111", soft: "#F7E3A0", shape: "#FFC93C", shape2: "#FFE08A", accent: "#E32D0B", dark: false };
    case "partly":
      return { bg: "#FBEFC9", ink: "#111111", soft: "#F2DFA6", shape: "#FFC93C", shape2: "#D5D8DC", accent: "#E32D0B", dark: false };
    case "cloudy":
      return { bg: "#D3D6DB", ink: "#111111", soft: "#C2C6CD", shape: "#9AA1AB", shape2: "#B4BAC3", accent: "#0E6FA5", dark: false };
    case "fog":
      return { bg: "#DAD8D2", ink: "#111111", soft: "#CAC8C1", shape: "#B7B5AE", shape2: "#C8C6BF", accent: "#0E6FA5", dark: false };
    case "drizzle":
    case "rain":
      return { bg: "#AEBFCF", ink: "#0B1A2A", soft: "#9DB0C3", shape: "#6F88A3", shape2: "#3B6EA5", accent: "#0B4F73", dark: false };
    case "snow":
      return { bg: "#E6EFF7", ink: "#0B1A2A", soft: "#D3E2EF", shape: "#BCD2E6", shape2: "#FFFFFF", accent: "#0E6FA5", dark: false };
    case "storm":
      return { bg: "#7C7C7C", ink: "#111111", soft: "#6A6A6A", shape: "#575757", shape2: "#FFD23F", accent: "#FFD23F", dark: false };
  }
}

export const ICON_OF: Record<Kind, string> = {
  clear: "sunny",
  partly: "partly-sunny",
  cloudy: "cloudy",
  fog: "menu",
  drizzle: "rainy-outline",
  rain: "rainy",
  snow: "snow",
  storm: "thunderstorm",
};

export const hourOf = (iso: string) => Number(iso.slice(11, 13));
export const timeOf = (iso: string) => iso.slice(11, 16);
export const fmt12 = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "ص" : "م"}`;
