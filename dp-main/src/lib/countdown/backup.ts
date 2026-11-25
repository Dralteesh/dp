import CryptoJS from "crypto-js";
import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { normalizeCountdown } from "@/lib/countdown/presets";
import { mediaExists } from "@/lib/countdown/media";
import { useCountdowns } from "@/store/useCountdowns";
import type { Countdown } from "@/types/countdown";

/**
 * نسخة احتياطية مشفّرة لملف JSON:
 * PBKDF2-SHA256 (مع ملح عشوائي) ← مفتاح رئيسي ← مفتاحا تشفير وتوثيق (HMAC)
 * ثم AES-256-CBC + HMAC-SHA256 (تشفير ثم توثيق)، فأي تعديل أو كلمة مرور خاطئة تُرفض قبل فك التشفير.
 * ملاحظة: الصور/الفيديو لا تُضمَّن (مسارات محلية)؛ عند الاستعادة على جهاز آخر تتحول الخلفية المفقودة إلى تدرّج لوني.
 */
const APP = "dp-countdowns";
/** تكلفة الاشتقاق: PBKDF2 بـ crypto-js بطيء على Hermes (يجمّد الواجهة لثوانٍ). القيمة تُخزَّن داخل الملف فيمكن رفعها لاحقًا دون كسر النسخ القديمة */
const ITER = 10_000;
const MAX_ITER = 1_000_000;

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

function keys(password: string, saltHex: string, iter: number) {
  const master = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(saltHex), { keySize: 8, iterations: iter, hasher: CryptoJS.algo.SHA256 });
  return {
    enc: CryptoJS.HmacSHA256("enc", master),
    mac: CryptoJS.HmacSHA256("mac", master),
  };
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function encryptText(plain: string, password: string): string {
  const salt = hex(Crypto.getRandomBytes(16));
  const iv = hex(Crypto.getRandomBytes(16));
  const k = keys(password, salt, ITER);
  const ct = CryptoJS.AES.encrypt(plain, k.enc, { iv: CryptoJS.enc.Hex.parse(iv), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 })
    .ciphertext.toString(CryptoJS.enc.Base64);
  const mac = CryptoJS.HmacSHA256(`${salt}.${iv}.${ct}`, k.mac).toString();
  return JSON.stringify({ app: APP, enc: 1, kdf: "pbkdf2-sha256", iter: ITER, salt, iv, ct, mac });
}

export function decryptText(fileText: string, password: string): { ok: true; plain: string } | { ok: false; error: string } {
  let f: any;
  try {
    f = JSON.parse(fileText);
  } catch {
    return { ok: false, error: "الملف ليس نسخة صالحة." };
  }
  if (!f || f.app !== APP || f.enc !== 1 || typeof f.ct !== "string") return { ok: false, error: "هذا الملف ليس نسخة عدّادات مشفّرة." };
  const iter = Number(f.iter);
  if (!Number.isInteger(iter) || iter < 1000 || iter > MAX_ITER) return { ok: false, error: "إعدادات التشفير غير صالحة." };
  const k = keys(password, String(f.salt), iter);
  const mac = CryptoJS.HmacSHA256(`${f.salt}.${f.iv}.${f.ct}`, k.mac).toString();
  if (!safeEqual(mac, String(f.mac))) return { ok: false, error: "كلمة المرور خاطئة أو الملف تالف." };
  try {
    const dec = CryptoJS.AES.decrypt({ ciphertext: CryptoJS.enc.Base64.parse(f.ct) } as any, k.enc, {
      iv: CryptoJS.enc.Hex.parse(String(f.iv)),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    const plain = dec.toString(CryptoJS.enc.Utf8);
    if (!plain) return { ok: false, error: "تعذّر فك التشفير." };
    return { ok: true, plain };
  } catch {
    return { ok: false, error: "تعذّر فك التشفير." };
  }
}

/** يكتب ملفًا مشفّرًا ويفتح قائمة المشاركة/الحفظ */
export async function exportEncrypted(password: string): Promise<string | null> {
  const items = useCountdowns.getState().items;
  const plain = JSON.stringify({ v: 1, exportedAt: new Date().toISOString(), items });
  const file = encryptText(plain, password);
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const uri = `${FileSystem.cacheDirectory}Countdowns-${stamp}.dpcd.json`;
  await FileSystem.writeAsStringAsync(uri, file);
  if (!(await Sharing.isAvailableAsync())) return "المشاركة غير متاحة على هذا الجهاز.";
  await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "حفظ نسخة العدّادات" });
  return null;
}

export async function pickEncrypted(): Promise<{ text?: string; canceled?: boolean }> {
  const res = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/*", "*/*"], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.[0]) return { canceled: true };
  return { text: await FileSystem.readAsStringAsync(res.assets[0].uri) };
}

/** يطبّق النسخة المفكوكة: خلفيات الوسائط المفقودة تتحول إلى تدرّج */
export async function applyDecrypted(plain: string, mode: "merge" | "replace"): Promise<{ count: number } | { error: string }> {
  let data: any;
  try {
    data = JSON.parse(plain);
  } catch {
    return { error: "المحتوى تالف." };
  }
  if (!data || !Array.isArray(data.items)) return { error: "لا توجد عدّادات في الملف." };
  const items: Countdown[] = [];
  for (const raw of data.items) {
    if (!raw || typeof raw.id !== "string") continue;
    const cd = normalizeCountdown(raw);
    if ((cd.bg.kind === "image" || cd.bg.kind === "video") && !(await mediaExists(cd.bg.uri))) {
      cd.bg = { kind: "gradient", gradient: "auto", dim: 0.35 };
    }
    items.push(cd);
  }
  useCountdowns.getState().importItems(items, mode);
  return { count: items.length };
}
