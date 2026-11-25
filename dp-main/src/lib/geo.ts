export type LL = { lat: number; lng: number };
/** نقطة مسار: [خط العرض، خط الطول، الارتفاع؟، الزمن بالمللي ثانية؟] */
export type Pt = [number, number, number?, number?];

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export function distM(a: LL, b: LL): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function bearing(a: LL, b: LL): number {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

const DIRS = ["شمال", "شمال شرق", "شرق", "جنوب شرق", "جنوب", "جنوب غرب", "غرب", "شمال غرب"];
export const dirName = (b: number) => DIRS[Math.round(b / 45) % 8];

export function fmtDist(m: number): string {
  if (m < 1000) return `${Math.round(m)} م`;
  return `${(m / 1000).toFixed(m < 10000 ? 2 : 1)} كم`;
}
export function fmtDur(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

const valid = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

/** يفهم: "24.71, 46.67" أو رابط خرائط (@lat,lng أو q=lat,lng أو !3d..!4d..) أو geo:lat,lng */
export function parseCoords(input: string): LL | null {
  const s = decodeURIComponent(input.trim().replace(/[،٫]/g, ",")).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const pats = [/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/, /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/, /[?&](?:q|query|ll|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/, /geo:(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/, /^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/];
  for (const p of pats) {
    const m = s.match(p);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (valid(lat, lng)) return { lat, lng };
    }
  }
  return null;
}

export function trackStats(pts: Pt[]): { distance: number; ascent: number; durationSec: number } {
  let distance = 0;
  let ascent = 0;
  for (let i = 1; i < pts.length; i++) {
    distance += distM({ lat: pts[i - 1][0], lng: pts[i - 1][1] }, { lat: pts[i][0], lng: pts[i][1] });
    const e0 = pts[i - 1][2];
    const e1 = pts[i][2];
    if (e0 != null && e1 != null && e1 - e0 > 0.5) ascent += e1 - e0;
  }
  const t0 = pts[0]?.[3];
  const t1 = pts[pts.length - 1]?.[3];
  return { distance, ascent, durationSec: t0 != null && t1 != null ? Math.max(0, (t1 - t0) / 1000) : 0 };
}

const xmlEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const xmlUnesc = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

export type GpxWpt = { name: string; lat: number; lng: number; desc?: string };
export type GpxTrk = { name: string; pts: Pt[] };

/** قراءة GPX بلا DOMParser (غير متوفر في React Native) */
export function parseGpx(xml: string): { wpts: GpxWpt[]; trks: GpxTrk[] } {
  const wpts: GpxWpt[] = [];
  const trks: GpxTrk[] = [];
  const attr = (tag: string, n: string) => {
    const m = tag.match(new RegExp(`${n}\\s*=\\s*["']([^"']+)["']`));
    return m ? Number(m[1]) : NaN;
  };
  const inner = (s: string, tag: string) => {
    const m = s.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
    return m ? xmlUnesc(m[1]).trim() : "";
  };
  for (const m of xml.matchAll(/<wpt\b([^>]*)>([\s\S]*?)<\/wpt>/g)) {
    const lat = attr(m[1], "lat");
    const lng = attr(m[1], "lon");
    if (valid(lat, lng)) wpts.push({ name: inner(m[2], "name") || "نقطة", lat, lng, desc: inner(m[2], "desc") || undefined });
  }
  for (const t of xml.matchAll(/<trk\b[^>]*>([\s\S]*?)<\/trk>/g)) {
    const pts: Pt[] = [];
    for (const p of t[1].matchAll(/<trkpt\b([^>]*?)(?:\/>|>([\s\S]*?)<\/trkpt>)/g)) {
      const lat = attr(p[1], "lat");
      const lng = attr(p[1], "lon");
      if (!valid(lat, lng)) continue;
      const body = p[2] ?? "";
      const ele = Number(inner(body, "ele"));
      const time = Date.parse(inner(body, "time"));
      pts.push([lat, lng, Number.isFinite(ele) && inner(body, "ele") !== "" ? ele : undefined, Number.isFinite(time) ? time : undefined]);
    }
    if (pts.length > 1) trks.push({ name: inner(t[1].replace(/<trkseg[\s\S]*<\/trkseg>/g, ""), "name") || "مسار", pts });
  }
  return { wpts, trks };
}

export function buildGpx(name: string, wpts: GpxWpt[], trks: GpxTrk[]): string {
  const w = wpts.map((p) => `<wpt lat="${p.lat}" lon="${p.lng}"><name>${xmlEsc(p.name)}</name>${p.desc ? `<desc>${xmlEsc(p.desc)}</desc>` : ""}</wpt>`).join("\n");
  const t = trks
    .map(
      (k) =>
        `<trk><name>${xmlEsc(k.name)}</name><trkseg>${k.pts
          .map((p) => `<trkpt lat="${p[0]}" lon="${p[1]}">${p[2] != null ? `<ele>${p[2].toFixed(1)}</ele>` : ""}${p[3] != null ? `<time>${new Date(p[3]).toISOString()}</time>` : ""}</trkpt>`)
          .join("")}</trkseg></trk>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="DoctorPlanner" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>${xmlEsc(name)}</name></metadata>\n${w}\n${t}\n</gpx>`;
}
