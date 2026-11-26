import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { decryptBackupText, encryptBackupText, isEncryptedBackupText } from "@/lib/cryptoText";
import { flushSecure, secureStateStorage } from "@/lib/secureStore";
import { CLINIC_KEYS, EXTRAS_KEYS, PLANNER_KEYS, makeBackup, parseBackup, type Backup } from "@/lib/backupFormat";
import { DEFAULT_SETTINGS, useSettings } from "@/store/useSettings";
import { useAlarms } from "@/store/useAlarms";
import { useClinic } from "@/store/useClinic";
import { useExtras } from "@/store/useExtras";
import { usePlanner } from "@/store/usePlanner";
import { useDevice } from "@/store/useDevice";

function snapshot(): Backup {
  const settings: Record<string, unknown> = {};
  const st = useSettings.getState() as unknown as Record<string, unknown>;
  for (const k of Object.keys(DEFAULT_SETTINGS)) settings[k] = st[k];
  return makeBackup(
    usePlanner.getState() as unknown as Record<string, unknown>,
    useClinic.getState() as unknown as Record<string, unknown>,
    useAlarms.getState().alarms,
    settings,
    useExtras.getState() as unknown as Record<string, unknown>,
  );
}

/** يكتب ملف النسخة ويفتح قائمة المشاركة (حفظ في الملفات، Drive، واتساب...). بكلمة مرور يكون الملف مشفّرًا */
export async function exportBackup(password?: string): Promise<string | null> {
  await flushSecure();
  const b = snapshot();
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const plain = JSON.stringify(b);
  const uri = `${FileSystem.cacheDirectory}DentistPlanner-${stamp}${password ? ".enc" : ""}.json`;
  await FileSystem.writeAsStringAsync(uri, password ? encryptBackupText(plain, password) : plain);
  try {
    if (!(await Sharing.isAvailableAsync())) return "المشاركة غير متاحة على هذا الجهاز.";
    await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "حفظ النسخة الاحتياطية" });
    useDevice.getState().set({ lastBackupAt: Date.now() });
    return null;
  } finally {
    // لا نترك نسخة بيانات المرضى في الكاش بعد المشاركة
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
  }
}

export type PickResult = { backup?: Backup; error?: string; canceled?: boolean; encryptedText?: string };

/** يختار ملفًا ويتحقق منه دون تطبيقه. الملف المشفّر يعاد نصه ليُفكّ بكلمة المرور (decryptPicked) */
export async function pickBackup(): Promise<PickResult> {
  const res = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/*", "*/*"], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.[0]) return { canceled: true };
  const uri = res.assets[0].uri;
  const text = await FileSystem.readAsStringAsync(uri);
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
  if (isEncryptedBackupText(text)) return { encryptedText: text };
  const parsed = parseBackup(text);
  return parsed.ok ? { backup: parsed.backup } : { error: parsed.error };
}

/** يفكّ تشفير نسخة مشفّرة ويتحقق من محتواها */
export function decryptPicked(text: string, password: string): { backup?: Backup; error?: string } {
  const dec = decryptBackupText(text, password);
  if (!dec.ok) return { error: dec.error };
  const parsed = parseBackup(dec.plain);
  return parsed.ok ? { backup: parsed.backup } : { error: parsed.error };
}

/** يستبدل بيانات الهاتف بمحتوى النسخة (المزامنة السحابية ستتبع الحالة الجديدة) */
export function applyBackup(b: Backup) {
  // نسخة أمان تلقائية بالحالة الحالية قبل الاستبدال (للتراجع إن اخترت ملفًا خاطئًا): تُحفظ مشفّرة، لا كملف عادي
  try {
    secureStateStorage.setItem("dp.pre-restore-backup", JSON.stringify(snapshot()));
  } catch {
    // لا نمنع الاستعادة بسبب فشل نسخة الأمان
  }
  const planner: Record<string, unknown> = {};
  for (const k of PLANNER_KEYS) planner[k] = b.data.planner[k];
  usePlanner.setState(planner as never);

  const clinic: Record<string, unknown> = {};
  for (const k of CLINIC_KEYS) clinic[k] = b.data.clinic[k];
  useClinic.setState(clinic as never);

  const extras: Record<string, unknown> = {};
  for (const k of EXTRAS_KEYS) extras[k] = b.data.extras[k];
  useExtras.setState(extras as never);

  useAlarms.setState({ alarms: b.data.alarms as never });

  const patch: Record<string, unknown> = {};
  for (const k of Object.keys(DEFAULT_SETTINGS)) if (k in b.data.settings) patch[k] = b.data.settings[k];
  useSettings.setState(patch as never);
}
