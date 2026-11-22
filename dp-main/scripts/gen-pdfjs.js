// يولّد src/lib/pdfjsInline.ts من pdfjs-dist ليعمل قارئ PDF بدون إنترنت.
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const dir = path.join(root, "node_modules", "pdfjs-dist", "build");
const safe = (s) => JSON.stringify(s).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
try {
  const main = fs.readFileSync(path.join(dir, "pdf.min.js"), "utf8");
  const worker = fs.readFileSync(path.join(dir, "pdf.worker.min.js"), "utf8");
  const out =
    "// ملف مُولَّد تلقائيًا (scripts/gen-pdfjs.js) — لا تعدّله يدويًا\n" +
    "export const PDFJS_MAIN: string = " + safe(main) + ";\n" +
    "export const PDFJS_WORKER: string = " + safe(worker) + ";\n";
  fs.writeFileSync(path.join(root, "src", "lib", "pdfjsInline.ts"), out);
  console.log("pdfjs inline generated:", main.length, worker.length);
} catch (e) {
  console.warn("pdfjs inline skipped:", e.message);
}
