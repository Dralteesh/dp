import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { uid } from "@/lib/id";

const DIR = `${FileSystem.documentDirectory}countdowns/`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
}

/** يختار صورة، يصغّرها (عرض 1280) ويحفظها داخل التطبيق ليبقى الملف حتى لو حُذفت من المعرض */
export async function pickBackgroundImage(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [4, 3], quality: 1 });
  if (res.canceled || !res.assets?.[0]) return null;
  const out = await ImageManipulator.manipulateAsync(res.assets[0].uri, [{ resize: { width: 1280 } }], {
    compress: 0.8,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  await ensureDir();
  const dest = `${DIR}${uid()}.jpg`;
  await FileSystem.copyAsync({ from: out.uri, to: dest });
  return dest;
}

/** يختار فيديو قصيرًا (حتى 30 ثانية) ويحفظه داخل التطبيق */
export async function pickBackgroundVideo(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], videoMaxDuration: 30, quality: 0.6 });
  if (res.canceled || !res.assets?.[0]) return null;
  await ensureDir();
  const dest = `${DIR}${uid()}.mp4`;
  await FileSystem.copyAsync({ from: res.assets[0].uri, to: dest });
  return dest;
}

/** يحذف ملف وسائط يخص التطبيق فقط (داخل مجلد countdowns) */
export async function deleteMedia(uri?: string) {
  if (!uri || !uri.startsWith(DIR)) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // لا نكسر الواجهة بسبب ملف
  }
}

export async function mediaExists(uri?: string): Promise<boolean> {
  if (!uri) return false;
  try {
    return (await FileSystem.getInfoAsync(uri)).exists;
  } catch {
    return false;
  }
}
