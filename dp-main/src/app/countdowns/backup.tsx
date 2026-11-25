import { useState } from "react";
import { Alert, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { applyDecrypted, decryptText, exportEncrypted, pickEncrypted } from "@/lib/countdown/backup";
import { useCountdowns } from "@/store/useCountdowns";

/** نسخ احتياطي مشفّر لكل العدّادات (ملف JSON) واستعادته */
export default function CountdownsBackup() {
  const router = useRouter();
  const count = useCountdowns((s) => s.items.length);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [ipw, setIpw] = useState("");
  const [fileText, setFileText] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // التشفير يعمل على خيط JS: نُظهر حالة «جارٍ…» أولًا ثم نبدأ العمل
  const later = (label: string, job: () => Promise<void> | void) => {
    setBusy(label);
    setTimeout(async () => {
      try {
        await job();
      } finally {
        setBusy(null);
      }
    }, 60);
  };

  const doExport = () => {
    if (pw.length < 6) return Alert.alert("كلمة المرور قصيرة", "استخدم 6 أحرف على الأقل.");
    if (pw !== pw2) return Alert.alert("غير متطابقتين", "أعد كتابة كلمة المرور.");
    later("جارٍ التشفير…", async () => {
      const err = await exportEncrypted(pw);
      if (err) Alert.alert("تعذّر", err);
      else {
        setPw("");
        setPw2("");
      }
    });
  };

  const pickFile = async () => {
    const r = await pickEncrypted();
    if (r.text) setFileText(r.text);
  };

  const doImport = () => {
    if (!fileText) return;
    const run = (mode: "merge" | "replace") =>
      later("جارٍ فك التشفير…", async () => {
        const d = decryptText(fileText, ipw);
        if (!d.ok) return Alert.alert("تعذّرت الاستعادة", d.error);
        const res = await applyDecrypted(d.plain, mode);
        if ("error" in res) return Alert.alert("تعذّرت الاستعادة", res.error);
        setFileText(null);
        setIpw("");
        Alert.alert("تمت الاستعادة", `${res.count} لحظة.`, [{ text: "حسنًا", onPress: () => router.back() }]);
      });
    Alert.alert("طريقة الاستعادة", "دمج مع الحالية (الأحدث تعديلًا يفوز) أم استبدالها بالكامل؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "دمج", onPress: () => run("merge") },
      { text: "استبدال", style: "destructive", onPress: () => run("replace") },
    ]);
  };

  return (
    <Screen title="نسخ احتياطي للحظاتي" back>
      <Card className="mb-4">
        <Text w="bold" className="text-lg mb-1">
          تصدير مشفّر
        </Text>
        <Text className="text-xs text-muted mb-3">
          {count} لحظة. الملف مشفّر بكلمة مرور (AES-256 مع توثيق). لا يمكن استرجاعه إن نسيتها. الصور والفيديو لا تُضمَّن.
        </Text>
        <Field label="كلمة المرور" value={pw} onChangeText={setPw} secureTextEntry autoCapitalize="none" />
        <Field label="تأكيد كلمة المرور" value={pw2} onChangeText={setPw2} secureTextEntry autoCapitalize="none" />
        <Button label={busy && busy.includes("التشفير") ? busy : "تصدير ومشاركة"} icon="lock-closed-outline" onPress={doExport} disabled={!!busy || count === 0} />
      </Card>

      <Card>
        <Text w="bold" className="text-lg mb-1">
          استعادة من ملف
        </Text>
        <Text className="text-xs text-muted mb-3">«استبدال» يحذف لحظاتك الحالية ويضع محتوى الملف مكانها، فاختر «دمج» إن لم تكن متأكدًا.</Text>
        <Button label={fileText ? "تم اختيار ملف ✓ (غيّر)" : "اختر ملف النسخة"} icon="document-outline" variant="outline" onPress={pickFile} disabled={!!busy} />
        {fileText ? (
          <View className="mt-3">
            <Field label="كلمة مرور الملف" value={ipw} onChangeText={setIpw} secureTextEntry autoCapitalize="none" />
            <Button label={busy && busy.includes("فك") ? busy : "فك التشفير واستعادة"} icon="download-outline" onPress={doImport} disabled={!!busy || !ipw} />
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}
