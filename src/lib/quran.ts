import * as FileSystem from "expo-file-system/legacy";

export const SURAHS = "الفاتحة,البقرة,آل عمران,النساء,المائدة,الأنعام,الأعراف,الأنفال,التوبة,يونس,هود,يوسف,الرعد,إبراهيم,الحجر,النحل,الإسراء,الكهف,مريم,طه,الأنبياء,الحج,المؤمنون,النور,الفرقان,الشعراء,النمل,القصص,العنكبوت,الروم,لقمان,السجدة,الأحزاب,سبأ,فاطر,يس,الصافات,ص,الزمر,غافر,فصلت,الشورى,الزخرف,الدخان,الجاثية,الأحقاف,محمد,الفتح,الحجرات,ق,الذاريات,الطور,النجم,القمر,الرحمن,الواقعة,الحديد,المجادلة,الحشر,الممتحنة,الصف,الجمعة,المنافقون,التغابن,الطلاق,التحريم,الملك,القلم,الحاقة,المعارج,نوح,الجن,المزمل,المدثر,القيامة,الإنسان,المرسلات,النبأ,النازعات,عبس,التكوير,الانفطار,المطففين,الانشقاق,البروج,الطارق,الأعلى,الغاشية,الفجر,البلد,الشمس,الليل,الضحى,الشرح,التين,العلق,القدر,البينة,الزلزلة,العاديات,القارعة,التكاثر,العصر,الهمزة,الفيل,قريش,الماعون,الكوثر,الكافرون,النصر,المسد,الإخلاص,الفلق,الناس".split(",");

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

/** ينزّل الصوت إلى ملف مؤقت ثم يعيد تسميته، فلا يبقى ملف ناقص إن انقطع التنزيل */
export async function downloadAudio(n: number, onProgress?: (p: number) => void): Promise<void> {
  await ensureDir();
  const tmp = audioPath(n) + ".part";
  const dl = FileSystem.createDownloadResumable(remoteAudio(n), tmp, {}, (p) => {
    if (p.totalBytesExpectedToWrite > 0) onProgress?.(p.totalBytesWritten / p.totalBytesExpectedToWrite);
  });
  const res = await dl.downloadAsync();
  if (!res || res.status !== 200) {
    await FileSystem.deleteAsync(tmp, { idempotent: true });
    throw new Error("download failed");
  }
  await FileSystem.moveAsync({ from: tmp, to: audioPath(n) });
}

export async function deleteAudio(n: number): Promise<void> {
  await FileSystem.deleteAsync(audioPath(n), { idempotent: true });
}

export type Ayah = { n: number; ar: string; tr?: string };

/** النص (والترجمة) من alquran.cloud، مع تخزين محلي للقراءة بلا إنترنت */
export async function loadSurah(n: number, tr: string): Promise<Ayah[]> {
  await ensureDir();
  const cache = `${DIR}text-${n}-${tr}.json`;
  try {
    const ed = "quran-uthmani" + (tr !== "none" ? `,${tr}` : "");
    const r = await fetch(`https://api.alquran.cloud/v1/surah/${n}/editions/${ed}`);
    const j = await r.json();
    const a = j.data[0].ayahs as Array<{ numberInSurah: number; text: string }>;
    const t = j.data[1]?.ayahs as Array<{ text: string }> | undefined;
    const out: Ayah[] = a.map((x, i) => ({ n: x.numberInSurah, ar: x.text, tr: t?.[i]?.text }));
    await FileSystem.writeAsStringAsync(cache, JSON.stringify(out));
    return out;
  } catch {
    const i = await FileSystem.getInfoAsync(cache);
    if (!i.exists) throw new Error("offline");
    return JSON.parse(await FileSystem.readAsStringAsync(cache));
  }
}
