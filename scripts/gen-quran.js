// يولّد بيانات المصحف كاملة (604 صفحة: نص عثماني + تجويد + تفسير ميسّر) داخل التطبيق ليعمل بلا إنترنت.
// يُشغَّل تلقائيًا بعد npm install (postinstall). المصدر: api.alquran.cloud (طلب واحد لكل نسخة).
// الملفات المولَّدة: src/data/quran-text.json و quran-tajweed.json و quran-tafsir.json
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const outDir = path.join(root, "src", "data");
const API = "https://api.alquran.cloud/v1/quran/";
const EXPECTED_AYAHS = 6236;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function getEdition(ed) {
  let err = null;
  for (let i = 0; i < 5; i++) {
    try {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 120000);
      const r = await fetch(API + ed, { signal: ctl.signal, headers: { Accept: "application/json" } });
      clearTimeout(to);
      if (!r.ok) throw new Error("http " + r.status);
      const j = await r.json();
      const flat = [];
      for (const s of j.data.surahs) for (const a of s.ayahs) flat.push({ s: s.number, n: a.numberInSurah, juz: a.juz, page: a.page, text: a.text });
      if (flat.length !== EXPECTED_AYAHS) throw new Error("ayah count " + flat.length);
      return flat;
    } catch (e) {
      err = e;
      await wait(1500 * (i + 1));
    }
  }
  throw err;
}

(async () => {
  try {
    if (process.env.SKIP_QURAN_GEN) return console.log("quran data skipped (SKIP_QURAN_GEN)");
    const [uth, taj, taf] = await Promise.all([getEdition("quran-uthmani"), getEdition("quran-tajweed"), getEdition("ar.muyassar")]);
    const text = { ok: true, pages: {} };
    const tajweed = {};
    const tafsir = {};
    uth.forEach((a, i) => {
      const k = String(a.page);
      (text.pages[k] = text.pages[k] || []).push([a.s, a.n, a.juz, a.text]);
      (tajweed[k] = tajweed[k] || []).push(taj[i].text);
      tafsir[a.s + ":" + a.n] = taf[i].text;
    });
    if (Object.keys(text.pages).length !== 604) throw new Error("pages " + Object.keys(text.pages).length);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "quran-text.json"), JSON.stringify(text));
    fs.writeFileSync(path.join(outDir, "quran-tajweed.json"), JSON.stringify(tajweed));
    fs.writeFileSync(path.join(outDir, "quran-tafsir.json"), JSON.stringify(tafsir));
    console.log("quran offline data generated: 604 pages,", uth.length, "ayahs");
  } catch (e) {
    console.warn("quran offline data skipped:", e.message);
    // في بناء السحابة نفشل صراحةً: لا نريد APK بلا مصحف مضمَّن
    if (process.env.CI) process.exit(1);
  }
})();
