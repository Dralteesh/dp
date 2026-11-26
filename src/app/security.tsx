import { useState } from "react";
import { Alert, Switch, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { applyBackup, decryptPicked, exportBackup, pickBackup } from "@/lib/backup";
import { Field } from "@/components/ui/Field";
import type { Backup } from "@/lib/backupFormat";
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
  const [pw, setPw] = useState("");
  const [encText, setEncText] = useState<string | null>(null);
  const [restorePw, setRestorePw] = useState("");

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

  const runExport = async (password?: string) => {
    setBusy(true);
    try {
      // نترك الواجهة ترسم حالة الانتظار قبل اشتقاق المفتاح (يستغرق ثوانيَ)
      await new Promise((r) => setTimeout(r, 60));
      const err = await exportBackup(password);
      if (err) Alert.alert("تعذّر التصدير", err);
    } catch (e) {
      Alert.alert("تعذّر التصدير", String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const doExport = () => {
    if (pw && pw.length < 8) return Alert.alert("كلمة المرور قصيرة", "استعمل 8 أحرف على الأقل (الأفضل عبارة طويلة).");
    if (pw) return void runExport(pw);
    Alert.alert(
      "تصدير بلا تشفير؟",
      "الملف سيحوي بيانات المرضى مكشوفة لمن يحصل عليه. اكتب كلمة مرور للنسخة لتشفيره، أو تابع دونها.",
      [
        { text: "إلغاء", style: "cancel" },
        { text: "تصدير غير مشفّر", style: "destructive", onPress: () => void runExport() },
      ],
    );
  };

  const confirmRestore = (b: Backup) => {
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
            setEncText(null);
            setRestorePw("");
            Alert.alert("تمت الاستعادة", "استُعيدت البيانات من النسخة.");
          },
        },
      ],
    );
  };

  const doRestore = async () => {
    setBusy(true);
    try {
      const res = await pickBackup();
      if (res.canceled) return;
      if (res.encryptedText) {
        setEncText(res.encryptedText);
        return;
      }
      if (res.error || !res.backup) return Alert.alert("ملف غير صالح", res.error ?? "تعذّرت قراءة الملف.");
      confirmRestore(res.backup);
    } catch (e) {
      Alert.alert("تعذّرت الاستعادة", String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const doDecrypt = async () => {
    if (!encText || !restorePw) return;
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 60));
      const res = decryptPicked(encText, restorePw);
      if (res.error || !res.backup) return Alert.alert("تعذّر فك التشفير", res.error ?? "تعذّرت قراءة الملف.");
      confirmRestore(res.backup);
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
          في Drive أو أرسله لنفسك. اكتب كلمة مرور لتشفيره (يلزم تذكّرها: لا يمكن استرجاع النسخة بدونها).
        </Text>
        <Field
          label="كلمة مرور النسخة (اختياري، 8 أحرف فأكثر)"
          value={pw}
          onChangeText={setPw}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          hint="التشفير والفك يستغرقان بضع ثوانٍ."
        />
        <View className="gap-2">
          <Button label={busy ? "..." : "تصدير نسخة احتياطية"} icon="download" type="private" onPress={doExport} disabled={busy} />
          <Button label="استعادة من ملف" icon="cloud-upload" variant="soft" onPress={doRestore} disabled={busy} />
        </View>
      </Card>

      {encText ? (
        <>
          <SectionHeader title="نسخة مشفّرة" />
          <Card>
            <Text className="text-sm mb-2">هذا الملف مشفّر. اكتب كلمة مرور النسخة لفتحه.</Text>
            <Field
              label="كلمة المرور"
              value={restorePw}
              onChangeText={setRestorePw}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View className="gap-2">
              <Button label={busy ? "..." : "فك التشفير"} icon="lock-open" type="private" onPress={doDecrypt} disabled={busy || !restorePw} />
              <Button
                label="إلغاء"
                variant="soft"
                onPress={() => {
                  setEncText(null);
                  setRestorePw("");
                }}
                disabled={busy}
              />
            </View>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
