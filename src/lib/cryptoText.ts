import CryptoJS from "crypto-js";
import * as Crypto from "expo-crypto";

/**
 * تشفير نص بكلمة مرور (للنسخ الاحتياطية): PBKDF2-SHA256 + ملح عشوائي ← مفتاحا تشفير وتوثيق،
 * ثم AES-256-CBC + HMAC-SHA256. كلمة خاطئة أو ملف معدَّل يُرفض قبل فك التشفير.
 * التكرارات تُخزَّن في الملف (PBKDF2 في crypto-js بطيء على Hermes، فاخترنا قيمة لا تجمّد الواجهة طويلًا؛ اختر كلمة مرور طويلة).
 */
export const BACKUP_ENC_APP = "dentist-planner-backup";
const ITER = 10_000;
const MAX_ITER = 1_000_000;

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

function keys(password: string, saltHex: string, iter: number) {
  const master = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(saltHex), { keySize: 8, iterations: iter, hasher: CryptoJS.algo.SHA256 });
  return { enc: CryptoJS.HmacSHA256("enc", master), mac: CryptoJS.HmacSHA256("mac", master) };
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** هل النص ملف نسخة مشفّرة؟ */
export function isEncryptedBackupText(text: string): boolean {
  try {
    const f = JSON.parse(text);
    return !!f && f.app === BACKUP_ENC_APP && f.enc === 1;
  } catch {
    return false;
  }
}

export function encryptBackupText(plain: string, password: string): string {
  const salt = hex(Crypto.getRandomBytes(16));
  const iv = hex(Crypto.getRandomBytes(16));
  const k = keys(password, salt, ITER);
  const ct = CryptoJS.AES.encrypt(plain, k.enc, { iv: CryptoJS.enc.Hex.parse(iv), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }).ciphertext.toString(
    CryptoJS.enc.Base64,
  );
  const mac = CryptoJS.HmacSHA256(`${salt}.${iv}.${ct}`, k.mac).toString();
  return JSON.stringify({ app: BACKUP_ENC_APP, enc: 1, kdf: "pbkdf2-sha256", iter: ITER, salt, iv, ct, mac });
}

export function decryptBackupText(fileText: string, password: string): { ok: true; plain: string } | { ok: false; error: string } {
  let f: any;
  try {
    f = JSON.parse(fileText);
  } catch {
    return { ok: false, error: "الملف ليس نسخة صالحة." };
  }
  if (!f || f.app !== BACKUP_ENC_APP || f.enc !== 1 || typeof f.ct !== "string") return { ok: false, error: "هذا الملف ليس نسخة مشفّرة من Dentist Planner." };
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
    return plain ? { ok: true, plain } : { ok: false, error: "تعذّر فك التشفير." };
  } catch {
    return { ok: false, error: "تعذّر فك التشفير." };
  }
}
