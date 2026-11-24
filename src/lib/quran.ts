import * as FileSystem from "expo-file-system/legacy";

import { SURAHS, SURAH_START_PAGE } from "@/lib/quranMeta";
export { SURAHS, SURAH_START_PAGE };

const DIR = (FileSystem.documentDirectory ?? "") + "quran/";
const pad = (n: number) => String(n);

export const remoteAudio = (n: number) => `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${n}.mp3`;
export const audioPath = (n: number) => `${DIR}audio-${pad(n)}.mp3`;

async function ensureDir() {
  const i = await FileSystem.getInfoAsync(DIR);
  if (!i.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
}

/** أرقام السور المنزَّلة صوتيًا */
export async function downloadedSurahs(): Promise<Set<number>> {
  await ensureDir();
  const files = await FileSystem.readDirectoryAsync(DIR);
  const out = new Set<number>();
  for (const f of files) {
    const m = /^audio-(\d+)\.mp3$/.exec(f);
    if (m) out.add(Number(m[1]));
  }
  return out;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** مصادر احتياطية لنفس التلاوة (العفاسي) تُجرَّب بالترتيب */
const audioSources = (n: number) => [
  remoteAudio(n),
  `https://server8.mp3quran.net/afs/${String(n).padStart(3, "0")}.mp3`,
  `https://cdn.islamic.network/quran/audio-surah/64/ar.alafasy/${n}.mp3`,
];

const STALL_MS = 60000; // لا تقدّم لمدة طويلة = اتصال معلّق فنقطعه ونعيد المحاولة
const HEADERS = { "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36", Accept: "audio/mpeg,*/*" };
const TRIES_PER_SOURCE = 3;

async function tryDownload(url: string, tmp: string, onProgress?: (p: number) => void): Promise<void> {
  await FileSystem.deleteAsync(tmp, { idempotent: true });
  let last = Date.now();
  const dl = FileSystem.createDownloadResumable(url, tmp, { headers: HEADERS }, (p) => {
    last = Date.now();
    if (p.totalBytesExpectedToWrite > 0) onProgress?.(Math.min(1, p.totalBytesWritten / p.totalBytesExpectedToWrite));
  });
  const watchdog = setInterval(() => {
    if (Date.now() - last > STALL_MS) dl.cancelAsync().catch(() => undefined);
  }, 5000);
  try {
    const res = await dl.downloadAsync();
    if (!res || res.status !== 200) throw new Error(`status ${res?.status}`);
    const info = await FileSystem.getInfoAsync(tmp);
    const size = info.exists ? (info as { size?: number }).size ?? 0 : 0;
    if (size < 100 * 1024) throw new Error("file too small");
    // مقارنة الحجم بالمتوقع مسموحة بهامش (الترميز قد يغيّر content-length) وإلا نرفض الملف الناقص بوضوح
    const hdr = res.headers ?? {};
    const lenKey = Object.keys(hdr).find((k) => k.toLowerCase() === "content-length");
    const expected = lenKey ? Number(hdr[lenKey]) : 0;
    if (expected > 0 && size < expected * 0.98) throw new Error("incomplete file");
  } finally {
    clearInterval(watchdog);
  }
}

/** ينزّل الصوت إلى ملف مؤقت ثم يعيد تسميته؛ يعيد المحاولة ويجرّب مصادر بديلة ويتحقق من اكتمال الملف */
export async function downloadAudio(n: number, onProgress?: (p: number) => void): Promise<void> {
  await ensureDir();
  const tmp = audioPath(n) + ".part";
  let lastErr: unknown = null;
  for (const url of audioSources(n)) {
    for (let t = 0; t < TRIES_PER_SOURCE; t++) {
      try {
        onProgress?.(0);
        await tryDownload(url, tmp, onProgress);
        await FileSystem.deleteAsync(audioPath(n), { idempotent: true });
        await FileSystem.moveAsync({ from: tmp, to: audioPath(n) });
        return;
      } catch (e) {
        lastErr = e;
        await FileSystem.deleteAsync(tmp, { idempotent: true }).catch(() => undefined);
        await wait(1200 * (t + 1));
      }
    }
  }
  // آخر محاولة: تنزيل مباشر بلا استئناف (بعض الشبكات تكسر التنزيل المتقطّع)
  try {
    onProgress?.(0);
    const r = await FileSystem.downloadAsync(remoteAudio(n), tmp, { headers: HEADERS });
    const info = await FileSystem.getInfoAsync(tmp);
    const size = info.exists ? (info as { size?: number }).size ?? 0 : 0;
    if (r.status === 200 && size > 100 * 1024) {
      await FileSystem.deleteAsync(audioPath(n), { idempotent: true });
      await FileSystem.moveAsync({ from: tmp, to: audioPath(n) });
      return;
    }
    lastErr = new Error(`status ${r.status}, size ${size}`);
  } catch (e) {
    lastErr = e;
  }
  await FileSystem.deleteAsync(tmp, { idempotent: true }).catch(() => undefined);
  throw lastErr instanceof Error ? lastErr : new Error("download failed");
}

export async function deleteAudio(n: number): Promise<void> {
  await FileSystem.deleteAsync(audioPath(n), { idempotent: true });
}

/** طلب JSON مع مهلة وإعادة محاولة */
async function getJSON(url: string, tries = 3, timeoutMs = 15000): Promise<any> {
  let err: unknown = null;
  for (let i = 0; i < tries; i++) {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const r = await fetch(url, { signal: ctl.signal, headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error(`http ${r.status}`);
      const j = await r.json();
      if (!j?.data) throw new Error("bad payload");
      return j;
    } catch (e) {
      err = e;
      await wait(700 * (i + 1));
    } finally {
      clearTimeout(to);
    }
  }
  throw err instanceof Error ? err : new Error("network");
}

export type Ayah = { n: number; ar: string; tr?: string };

/** النص (والترجمة) من alquran.cloud، مع تخزين محلي للقراءة بلا إنترنت */
export async function loadSurah(n: number, tr: string): Promise<Ayah[]> {
  await ensureDir();
  const cache = `${DIR}text-${n}-${tr}.json`;
  const ci = await FileSystem.getInfoAsync(cache);
  if (ci.exists) {
    try {
      return JSON.parse(await FileSystem.readAsStringAsync(cache));
    } catch {
      await FileSystem.deleteAsync(cache, { idempotent: true });
    }
  }
  try {
    const ed = "quran-uthmani" + (tr !== "none" ? `,${tr}` : "");
    const j = await getJSON(`https://api.alquran.cloud/v1/surah/${n}/editions/${ed}`);
    const a = j.data[0].ayahs as Array<{ numberInSurah: number; text: string }>;
    const t = j.data[1]?.ayahs as Array<{ text: string }> | undefined;
    const out: Ayah[] = a.map((x, i) => ({ n: x.numberInSurah, ar: x.text, tr: t?.[i]?.text }));
    await FileSystem.writeAsStringAsync(cache, JSON.stringify(out));
    return out;
  } catch {
    throw new Error("offline");
  }
}

export type PageAyah = { s: number; n: number; ar: string; tj?: string; juz: number };
export type MushafPage = { page: number; ayahs: PageAyah[] };

const BASMALA_WORDS = 4;
/** يحذف البسملة المضافة في أول آية (غير الفاتحة والتوبة) لتُعرض في ترويسة السورة */
function stripBasmala(text: string, s: number, n: number): string {
  if (n !== 1 || s === 1 || s === 9) return text;
  const parts = text.split(" ");
  return parts.length > BASMALA_WORDS ? parts.slice(BASMALA_WORDS).join(" ") : text;
}

/** بيانات المصحف المضمَّنة في التطبيق (تُولَّد في البناء: scripts/gen-quran.js). تُحمَّل عند أول طلب فقط */
type BundledQuran = { text: { ok: boolean; pages: Record<string, [number, number, number, string][]> }; tajweed: Record<string, string[]> };
let bundled: BundledQuran | null | undefined;
function getBundled(): BundledQuran | null {
  if (bundled !== undefined) return bundled;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const text = require("@/data/quran-text.json");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const tajweed = require("@/data/quran-tajweed.json");
    bundled = text?.ok ? { text, tajweed } : null;
  } catch {
    bundled = null;
  }
  return bundled;
}

function bundledPage(page: number): MushafPage | null {
  const b = getBundled();
  const rows = b?.text.pages[String(page)];
  if (!rows) return null;
  const tj = b?.tajweed[String(page)];
  return {
    page,
    ayahs: rows.map(([s, n, juz, ar], i) => ({
      s,
      n,
      juz,
      ar: stripBasmala(ar, s, n),
      tj: tj?.[i] ? stripBasmala(tj[i], s, n) : undefined,
    })),
  };
}

/** صفحة من المصحف (نص عثماني + تجويد): من المضمَّن في التطبيق أولًا (بلا إنترنت)، ثم المخزَّن، ثم الشبكة */
export async function loadPage(page: number): Promise<MushafPage> {
  const inApp = bundledPage(page);
  if (inApp) return inApp;
  await ensureDir();
  const cache = `${DIR}page-${page}.json`;
  const ci = await FileSystem.getInfoAsync(cache);
  if (ci.exists) {
    try {
      return JSON.parse(await FileSystem.readAsStringAsync(cache));
    } catch {
      await FileSystem.deleteAsync(cache, { idempotent: true });
    }
  }
  try {
    const j = await getJSON(`https://api.alquran.cloud/v1/page/${page}/editions/quran-uthmani,quran-tajweed`);
    const a = j.data[0].ayahs as Array<{ numberInSurah: number; text: string; juz: number; surah: { number: number } }>;
    const t = j.data[1]?.ayahs as Array<{ text: string }> | undefined;
    const out: MushafPage = {
      page,
      ayahs: a.map((x, i) => ({
        s: x.surah.number,
        n: x.numberInSurah,
        juz: x.juz,
        ar: stripBasmala(x.text, x.surah.number, x.numberInSurah),
        tj: t?.[i] ? stripBasmala(t[i].text, x.surah.number, x.numberInSurah) : undefined,
      })),
    };
    await FileSystem.writeAsStringAsync(cache, JSON.stringify(out));
    return out;
  } catch {
    throw new Error("offline");
  }
}

/** تفسير/ترجمة آية واحدة عند الطلب (يُخزَّن مؤقتًا في الذاكرة) */
const memo = new Map<string, string>();
export async function loadAyahText(s: number, n: number, edition: string): Promise<string> {
  const k = `${s}:${n}:${edition}`;
  const hit = memo.get(k);
  if (hit) return hit;
  if (edition === "ar.muyassar") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const t = (require("@/data/quran-tafsir.json") as Record<string, string>)[`${s}:${n}`];
      if (t) return t;
    } catch {
      // نكمل بالشبكة
    }
  }
  const j = await getJSON(`https://api.alquran.cloud/v1/ayah/${s}:${n}/${edition}`);
  const txt = String(j.data.text);
  memo.set(k, txt);
  return txt;
}
