import CryptoJS from "crypto-js";

/**
 * تشفير نصوص التخزين المحلي (منطق نقي: العشوائية تُمرَّر من الخارج).
 * المفتاح الرئيسي (32 بايت hex) ← مفتاحا تشفير وتوثيق، ثم AES-256-CBC + HMAC-SHA256 (تشفير ثم توثيق).
 * الصيغة: enc1:<iv hex>.<ciphertext base64>.<mac hex>
 */
export const VAULT_PREFIX = "enc1:";

const cache = new Map<string, { enc: CryptoJS.lib.WordArray; mac: CryptoJS.lib.WordArray }>();

function subkeys(masterHex: string) {
  let k = cache.get(masterHex);
  if (!k) {
    const master = CryptoJS.enc.Hex.parse(masterHex);
    k = { enc: CryptoJS.HmacSHA256("enc", master), mac: CryptoJS.HmacSHA256("mac", master) };
    cache.set(masterHex, k);
  }
  return k;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export const isSealed = (raw: string) => raw.startsWith(VAULT_PREFIX);

export function seal(plain: string, masterHex: string, ivHex: string): string {
  const k = subkeys(masterHex);
  const ct = CryptoJS.AES.encrypt(plain, k.enc, { iv: CryptoJS.enc.Hex.parse(ivHex), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }).ciphertext.toString(
    CryptoJS.enc.Base64,
  );
  const mac = CryptoJS.HmacSHA256(`${ivHex}.${ct}`, k.mac).toString();
  return `${VAULT_PREFIX}${ivHex}.${ct}.${mac}`;
}

/** يرمي خطأً إن كان التوثيق أو فك التشفير فاشلًا (مفتاح خاطئ أو بيانات تالفة) */
export function open(sealed: string, masterHex: string): string {
  if (!isSealed(sealed)) throw new Error("not sealed");
  const [iv, ct, mac] = sealed.slice(VAULT_PREFIX.length).split(".");
  if (!iv || !ct || !mac) throw new Error("bad format");
  const k = subkeys(masterHex);
  const expect = CryptoJS.HmacSHA256(`${iv}.${ct}`, k.mac).toString();
  if (!safeEqual(expect, mac)) throw new Error("bad mac");
  const dec = CryptoJS.AES.decrypt({ ciphertext: CryptoJS.enc.Base64.parse(ct) } as any, k.enc, {
    iv: CryptoJS.enc.Hex.parse(iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return dec.toString(CryptoJS.enc.Utf8);
}
