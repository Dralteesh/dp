/**
 * الإملاء الصوتي عبر expo-speech-recognition (اختياري).
 * إن لم تكن الحزمة مثبّتة يبقى التطبيق يعمل ويُخفى زر الميكروفون.
 */
let mod: any = null;
try {
  mod = require("expo-speech-recognition");
} catch {
  mod = null;
}

export const dictationAvailable: boolean = !!mod?.ExpoSpeechRecognitionModule;

/** hook ثابت لكل جلسة تشغيل: إما hook الحزمة أو دالة فارغة */
export const useDictationEvent: (name: "result" | "end" | "error", cb: (e: any) => void) => void =
  mod?.useSpeechRecognitionEvent ?? (() => {});

/** يبدأ الاستماع. يعيد null عند النجاح أو رسالة خطأ. */
export async function startDictation(lang = "ar-SA"): Promise<string | null> {
  if (!dictationAvailable) return "الإملاء الصوتي يحتاج تثبيت expo-speech-recognition وإعادة بناء التطبيق.";
  const M = mod.ExpoSpeechRecognitionModule;
  try {
    const perm = await M.requestPermissionsAsync();
    if (!perm.granted) return "لم يُمنح إذن الميكروفون.";
    M.start({ lang, interimResults: true, continuous: true, addsPunctuation: true });
    return null;
  } catch (e: any) {
    return e?.message ?? "تعذّر بدء الإملاء.";
  }
}

export function stopDictation() {
  try {
    mod?.ExpoSpeechRecognitionModule?.stop();
  } catch {
    // لا شيء
  }
}

/** يضيف نصًا إملائيًا إلى نص موجود بمسافة واحدة */
export function appendText(base: string, add: string): string {
  const a = add.trim();
  if (!a) return base;
  return base.trim() ? `${base.replace(/\s+$/, "")} ${a}` : a;
}
