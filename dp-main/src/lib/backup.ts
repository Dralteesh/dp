import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
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

/** يكتب ملف النسخة ويفتح قائمة المشاركة (حفظ في الملفات، Drive، واتساب...) */
export async function exportBackup(): Promise<string | null> {
  const b = snapshot();
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const uri = `${FileSystem.cacheDirectory}DentistPlanner-${stamp}.json`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(b));
  if (!(await Sharing.isAvailableAsync())) return "المشاركة غير متاحة على هذا الجهاز.";
  await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "حفظ النسخة الاحتياطية" });
  useDevice.getState().set({ lastBackupAt: Date.now() });
  return null;
}

/** يختار ملفًا ويتحقق منه دون تطبيقه */
export async function pickBackup(): Promise<{ backup?: Backup; error?: string; canceled?: boolean }> {
  const res = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/*", "*/*"], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.[0]) return { canceled: true };
  const text = await FileSystem.readAsStringAsync(res.assets[0].uri);
  const parsed = parseBackup(text);
  return parsed.ok ? { backup: parsed.backup } : { error: parsed.error };
}

/** يستبدل بيانات الهاتف بمحتوى النسخة (المزامنة السحابية ستتبع الحالة الجديدة) */
export function applyBackup(b: Backup) {
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
