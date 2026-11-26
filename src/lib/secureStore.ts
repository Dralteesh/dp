import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { AppState } from "react-native";
import { isSealed, open, seal } from "@/lib/vault";

/**
 * تخزين مشفّر لبيانات المرضى على الهاتف.
 * - المفتاح الرئيسي عشوائي (32 بايت) ويُحفظ في Android Keystore عبر expo-secure-store، لا في AsyncStorage.
 * - القيم تُكتب مشفّرة (enc1:...). القيم القديمة غير المشفّرة تُقرأ كما هي ثم يُعاد حفظها مشفّرة تلقائيًا.
 * - الكتابات تُجمَّع نحو 200ms لتخفيف كلفة التشفير، وتُفرَّغ فورًا عند خروج التطبيق للخلفية.
 * - إن تعذّر فك التشفير لا نفقد شيئًا: نُبقي نسخة الملف الخام في المفتاح `.unreadable` قبل أن يُكتب شيء جديد.
 */
const KEY_NAME = "dp.vault.master.v1";
const FLUSH_MS = 200;

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

let masterCache: string | null = null;

async function getMaster(create: boolean): Promise<string | null> {
  if (masterCache) return masterCache;
  let m = await SecureStore.getItemAsync(KEY_NAME);
  if (m && /^[0-9a-f]{64}$/.test(m)) return (masterCache = m);
  if (!create) return null;
  m = hex(Crypto.getRandomBytes(32));
  await SecureStore.setItemAsync(KEY_NAME, m);
  return (masterCache = m);
}

const pending = new Map<string, string>();
let timer: ReturnType<typeof setTimeout> | null = null;
let chain: Promise<void> = Promise.resolve();

async function writeOne(key: string, value: string) {
  let out = value;
  try {
    const m = await getMaster(true);
    if (m) out = seal(value, m, hex(Crypto.getRandomBytes(16)));
  } catch (e) {
    // لا نخسر البيانات إن تعذّر Keystore على جهاز غريب: نكتب كما كان قبل التشفير ونعيد المحاولة لاحقًا في الكتابة التالية
    console.warn("secureStore: encryption unavailable, writing plain", (e as Error)?.message);
  }
  await AsyncStorage.setItem(key, out);
}

function flush(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  chain = chain.then(async () => {
    const entries = Array.from(pending.entries());
    for (const [k, v] of entries) {
      // قد تُحدَّث القيمة أثناء الانتظار؛ نكتب الأحدث ونحذف من الطابور فقط إن لم تتغيّر
      try {
        await writeOne(k, v);
        if (pending.get(k) === v) pending.delete(k);
      } catch (e) {
        console.warn("secureStore: write failed", k, (e as Error)?.message);
      }
    }
    if (pending.size && !timer) timer = setTimeout(() => void flush(), 2000);
  });
  return chain;
}

function schedule() {
  if (!timer) timer = setTimeout(() => void flush(), FLUSH_MS);
}

let hooked = false;
function hook() {
  if (hooked) return;
  hooked = true;
  AppState.addEventListener("change", (s) => {
    if (s !== "active") void flush();
  });
}

/** يقرأ قيمة (مشفّرة أو قديمة) دون أي كتابة جانبية ودون إنشاء مفتاح. للودجات التي تعمل والتطبيق مغلق. */
export async function peekSecure(key: string): Promise<string | null> {
  const raw = await AsyncStorage.getItem(key);
  if (raw == null || !isSealed(raw)) return raw;
  const m = await getMaster(false);
  if (!m) return null;
  try {
    return open(raw, m);
  } catch {
    return null;
  }
}

export const secureStateStorage = {
  getItem: async (key: string): Promise<string | null> => {
    hook();
    const queued = pending.get(key);
    if (queued !== undefined) return queued;
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return null;
    if (!isSealed(raw)) {
      // بيانات قديمة غير مشفّرة: نقرؤها ونعيد حفظها مشفّرة
      pending.set(key, raw);
      schedule();
      return raw;
    }
    try {
      const m = await getMaster(false);
      if (!m) throw new Error("no key");
      const plain = open(raw, m);
      if (!plain) throw new Error("empty");
      return plain;
    } catch (e) {
      console.warn("secureStore: unreadable", key, (e as Error)?.message);
      await AsyncStorage.setItem(`${key}.unreadable`, raw).catch(() => undefined);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    hook();
    pending.set(key, value);
    schedule();
  },
  removeItem: async (key: string): Promise<void> => {
    pending.delete(key);
    await AsyncStorage.removeItem(key);
  },
};

/** يفرّغ الكتابات المؤجَّلة الآن (قبل التصدير أو الاستعادة) */
export const flushSecure = flush;
