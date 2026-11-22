import { useState } from "react";
import { Alert, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { getOwner, setOwner, syncAll, wipeLocal } from "@/lib/cloudSync";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/store/useAuth";

const STATUS_LABEL = {
  idle: "جاهز",
  syncing: "جارٍ المزامنة…",
  ok: "تمت المزامنة",
  error: "فشلت المزامنة",
} as const;

export default function AccountScreen() {
  const session = useAuth((s) => s.session);
  const status = useAuth((s) => s.syncStatus);
  const lastSyncAt = useAuth((s) => s.lastSyncAt);
  const syncError = useAuth((s) => s.syncError);
  const setSync = useAuth((s) => s.setSync);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const claimDevice = async (userId: string) => {
    const owner = await getOwner();
    if (owner && owner !== userId) {
      Alert.alert(
        "حساب مختلف",
        "هذا الجهاز يحتوي بيانات حساب آخر. للمتابعة ستُحذف بيانات الجهاز المحلية ويُحمَّل محتوى هذا الحساب.",
        [
          { text: "إلغاء", style: "cancel", onPress: () => supabase.auth.signOut() },
          {
            text: "متابعة",
            style: "destructive",
            onPress: async () => {
              wipeLocal();
              await setOwner(userId);
              syncNow(userId);
            },
          },
        ],
      );
      return;
    }
    await setOwner(userId);
    syncNow(userId);
  };

  const syncNow = async (userId: string) => {
    setSync({ syncStatus: "syncing", syncError: null });
    try {
      await syncAll(userId);
      setSync({ syncStatus: "ok", lastSyncAt: Date.now() });
    } catch (e: any) {
      setSync({ syncStatus: "error", syncError: e?.message ?? "تعذّرت المزامنة" });
    }
  };

  const submit = async (mode: "in" | "up") => {
    if (!email.trim() || password.length < 8) {
      Alert.alert("بيانات ناقصة", "أدخل بريدًا صحيحًا وكلمة مرور من 8 أحرف على الأقل (بيانات المرضى حساسة).");
      return;
    }
    setBusy(true);
    try {
      const creds = { email: email.trim(), password };
      const res =
        mode === "in"
          ? await supabase.auth.signInWithPassword(creds)
          : await supabase.auth.signUp(creds);
      if (res.error) throw res.error;
      if (!res.data.session) {
        Alert.alert("تحقق من بريدك", "أرسلنا رابط تأكيد. افتحه ثم سجّل الدخول.");
        return;
      }
      setPassword("");
      await claimDevice(res.data.session.user.id);
    } catch (e: any) {
      Alert.alert("تعذّر الدخول", e?.message ?? "حدث خطأ غير متوقع");
    } finally {
      setBusy(false);
    }
  };

  if (!session) {
    return (
      <Screen title="الحساب والمزامنة" back>
        <Card>
          <Text className="text-muted mb-3">
            سجّل الدخول لحفظ بياناتك في السحابة ومزامنتها بين أجهزتك. التطبيق يعمل بدون حساب أيضًا.
          </Text>
          <Field
            label="البريد الإلكتروني"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
          />
          <Field
            label="كلمة المرور"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            textContentType="password"
          />
          <Button label="تسجيل الدخول" icon="log-in" disabled={busy} onPress={() => submit("in")} />
          <View className="h-2" />
          <Button label="إنشاء حساب جديد" variant="outline" disabled={busy} onPress={() => submit("up")} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="الحساب والمزامنة" back>
      <Card>
        <Text w="semi">{session.user.email}</Text>
        <Text className="text-muted text-sm mt-1">
          {STATUS_LABEL[status]}
          {lastSyncAt ? ` • ${new Date(lastSyncAt).toLocaleTimeString("ar")}` : ""}
        </Text>
        {syncError ? <Text className="text-danger text-sm mt-1">{syncError}</Text> : null}
        <View className="h-3" />
        <Button
          label="مزامنة الآن"
          icon="sync"
          disabled={status === "syncing"}
          onPress={() => syncNow(session.user.id)}
        />
        <View className="h-2" />
        <Button
          label="تسجيل الخروج"
          variant="danger"
          icon="log-out"
          onPress={() => supabase.auth.signOut()}
        />
      </Card>
      <Text className="text-muted text-xs mt-3">
        بعد الخروج تبقى بيانات هذا الجهاز كما هي. إن دخل حساب آخر سيُطلب تأكيد استبدالها.
      </Text>
    </Screen>
  );
}
