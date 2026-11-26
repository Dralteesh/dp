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
  for (let i = 0; i < 8; i++) {
    try {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 180000);
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
      await wait(2500 * (i + 1));
    }
  }
  throw err;
}

function alreadyGenerated() {
  try {
    const t = JSON.parse(fs.readFileSync(path.join(outDir, "quran-text.json"), "utf8"));
    return t.ok === true && Object.keys(t.pages || {}).length === 604;
  } catch {
    return false;
  }
}

(async () => {
  try {
    if (process.env.SKIP_QURAN_GEN) return console.log("quran data skipped (SKIP_QURAN_GEN)");
    // بيانات سليمة موجودة (من الكاش أو توليد سابق): لا حاجة لإعادة التنزيل
    if (alreadyGenerated()) return console.log("quran offline data already present");
    // النص إلزامي. التجويد والتفسير اختياريان: إن تعذّرا يعمل المصحف بلا تلوين/تفسير مضمَّن (والتفسير يعود للشبكة)
    const uth = await getEdition("quran-uthmani");
    let taj = null;
    let taf = null;
    try { taj = await getEdition("quran-tajweed"); } catch (e) { console.warn("tajweed skipped:", e.message); }
    try { taf = await getEdition("ar.muyassar"); } catch (e) { console.warn("tafsir skipped:", e.message); }
    const text = { ok: true, pages: {} };
    const tajweed = {};
    const tafsir = {};
    uth.forEach((a, i) => {
      const k = String(a.page);
      (text.pages[k] = text.pages[k] || []).push([a.s, a.n, a.juz, a.text]);
      if (taj) (tajweed[k] = tajweed[k] || []).push(taj[i].text);
      if (taf) tafsir[a.s + ":" + a.n] = taf[i].text;
    });
    if (Object.keys(text.pages).length !== 604) throw new Error("pages " + Object.keys(text.pages).length);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "quran-text.json"), JSON.stringify(text));
    fs.writeFileSync(path.join(outDir, "quran-tajweed.json"), JSON.stringify(tajweed));
    fs.writeFileSync(path.join(outDir, "quran-tafsir.json"), JSON.stringify(tafsir));
    console.log("quran offline data generated: 604 pages,", uth.length, "ayahs", "| tajweed:", !!taj, "| tafsir:", !!taf);
  } catch (e) {
    console.warn("quran offline data skipped:", e.message);
    // في بناء السحابة نفشل صراحةً: لا نريد APK بلا مصحف مضمَّن
    if (process.env.CI) process.exit(1);
  }
})();
