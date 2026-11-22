import { useState } from "react";
import { Alert, Switch, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { applyBackup, exportBackup, pickBackup } from "@/lib/backup";
import { backupCounts } from "@/lib/backupFormat";
import { useDevice } from "@/store/useDevice";

const DAY = 86_400_000;

function ago(ts?: number): string {
  if (!ts) return "لم تؤخذ نسخة بعد";
  const d = Math.floor((Date.now() - ts) / DAY);
  return d <= 0 ? "اليوم" : d === 1 ? "أمس" : `منذ ${d} يومًا`;
}

export default function SecurityScreen() {
  const lockEnabled = useDevice((s) => s.lockEnabled);
  const lastBackupAt = useDevice((s) => s.lastBackupAt);
  const setDevice = useDevice((s) => s.set);
  const [busy, setBusy] = useState(false);

  const toggleLock = async (v: boolean) => {
    if (!v) return setDevice({ lockEnabled: false });
    const hw = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    if (!hw || (!enrolled && level === LocalAuthentication.SecurityLevel.NONE)) {
      Alert.alert("لا يوجد قفل على الهاتف", "فعّل بصمة أو رمزًا/نمطًا لشاشة القفل من إعدادات الهاتف أولًا، ثم أعد المحاولة.");
      return;
    }
    // نتأكد أنك تستطيع الفتح قبل التفعيل حتى لا تُقفل خارج تطبيقك
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: "أكّد هويتك لتفعيل القفل", cancelLabel: "إلغاء" });
    if (r.success) setDevice({ lockEnabled: true });
  };

  const doExport = async () => {
    setBusy(true);
    try {
      const err = await exportBackup();
      if (err) Alert.alert("تعذّر التصدير", err);
    } catch (e) {
      Alert.alert("تعذّر التصدير", String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async () => {
    setBusy(true);
    try {
      const res = await pickBackup();
      if (res.canceled) return;
      if (res.error || !res.backup) return Alert.alert("ملف غير صالح", res.error ?? "تعذّرت قراءة الملف.");
      const b = res.backup;
      const date = b.exportedAt && new Date(b.exportedAt).getTime() > 0 ? new Date(b.exportedAt).toLocaleDateString("ar-SY") : "غير معروف";
      const lines = backupCounts(b).filter((c) => c.n > 0).map((c) => `${c.label}: ${c.n}`).join(" • ") || "نسخة فارغة";
      Alert.alert(
        "استعادة النسخة؟",
        `تاريخ النسخة: ${date}\n${lines}\n\nستُستبدل بيانات هذا الهاتف بالكامل بمحتوى النسخة. وإن كنت مسجّلًا للدخول فستُزامَن النتيجة مع حسابك (أي شيء أحدث من النسخة سيُحذف من السحابة أيضًا).`,
        [
          { text: "إلغاء", style: "cancel" },
          {
            text: "استعادة",
            style: "destructive",
            onPress: () => {
              applyBackup(b);
              Alert.alert("تمت الاستعادة", "استُعيدت البيانات من النسخة.");
            },
          },
        ],
      );
    } catch (e) {
      Alert.alert("تعذّرت الاستعادة", String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const stale = !lastBackupAt || Date.now() - lastBackupAt > 7 * DAY;

  return (
    <Screen title="الأمان والنسخ الاحتياطي" back>
      <SectionHeader title="قفل التطبيق" />
      <Card>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pe-3">
            <Text w="semi">القفل ببصمة الهاتف أو رمزه</Text>
            <Text className="text-sm text-muted">
              يُطلب عند فتح التطبيق وبعد غيابه أكثر من نصف دقيقة. لا يمنع رنين المنبّه. خاص بهذا الهاتف.
            </Text>
          </View>
          <Switch value={lockEnabled} onValueChange={toggleLock} trackColor={{ true: "#16A34A", false: "#CBD5E1" }} thumbColor="#FFFFFF" />
        </View>
      </Card>

      <SectionHeader title="النسخة الاحتياطية" />
      <Card>
        <Text className="text-sm" style={{ color: stale ? "#B45309" : "#166534" }}>
          آخر نسخة: {ago(lastBackupAt)}
          {stale ? " — يُنصح بنسخة أسبوعيًا" : ""}
        </Text>
        <Text className="text-xs text-muted mt-1 mb-3">
          ملف واحد يضم المرضى والمواعيد والجلسات والدفعات والوصفات والمخزون والأحداث والمهام والمنبّهات والإعدادات. احفظه
          في Drive أو أرسله لنفسك. الملف غير مشفّر، فاحفظه في مكان خاص.
        </Text>
        <View className="gap-2">
          <Button label={busy ? "..." : "تصدير نسخة احتياطية"} icon="download" type="private" onPress={doExport} disabled={busy} />
          <Button label="استعادة من ملف" icon="cloud-upload" variant="soft" onPress={doRestore} disabled={busy} />
        </View>
      </Card>
    </Screen>
  );
}
