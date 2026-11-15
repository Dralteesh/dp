import { useEffect, useState } from "react";
import { Alert, Linking, View } from "react-native";
import * as Notifications from "expo-notifications";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { alarmSupported } from "@/lib/alarm";
import { ensureNotificationPermission, sendTestNotification } from "@/lib/notifications";
import { refreshWidgets } from "@/widgets/updateWidgets";

function Step({ n, children }: { n: number; children: string }) {
  return (
    <View className="flex-row gap-3 mb-2.5">
      <View className="w-7 h-7 rounded-full bg-hospital-soft items-center justify-center">
        <Text w="bold" className="text-hospital-ink text-sm">
          {n}
        </Text>
      </View>
      <Text className="flex-1 leading-6">{children}</Text>
    </View>
  );
}

function StatusRow({ ok, label }: { ok: boolean | null; label: string }) {
  return (
    <View className="flex-row items-center gap-2 py-1">
      <Ionicons
        name={ok ? "checkmark-circle" : ok === false ? "close-circle" : "ellipse-outline"}
        size={20}
        color={ok ? "#16A34A" : ok === false ? "#DC2626" : "#94A3B8"}
      />
      <Text>{label}</Text>
    </View>
  );
}

export default function ConnectScreen() {
  const [notifOk, setNotifOk] = useState<boolean | null>(null);

  useEffect(() => {
    Notifications.getPermissionsAsync().then((p) => setNotifOk(p.granted));
  }, []);

  const askPermission = async () => setNotifOk(await ensureNotificationPermission());

  const test = async () => {
    const ok = await ensureNotificationPermission();
    setNotifOk(ok);
    if (!ok) {
      Alert.alert("الإذن مطلوب", "فعّل الإشعارات للتطبيق من إعدادات الهاتف.");
      return;
    }
    await sendTestNotification(5);
    Alert.alert("تم", "سيصلك إشعار تجريبي خلال 5 ثوانٍ. تأكد أنه ظهر على الساعة أيضًا.");
  };

  const openBattery = async () => {
    try {
      await Linking.sendIntent("android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS");
    } catch {
      Linking.openSettings();
    }
  };

  return (
    <Screen title="الأدوات المصغرة والساعة" back>
      <Card>
        <Text w="bold" className="mb-1">
          الحالة
        </Text>
        <StatusRow ok={notifOk} label="إذن الإشعارات" />
        <StatusRow ok={alarmSupported()} label="المنبّه الإجباري (يحتاج Development Build)" />
        {notifOk === false ? (
          <View className="mt-2">
            <Button label="طلب إذن الإشعارات" icon="notifications" onPress={askPermission} />
          </View>
        ) : null}
      </Card>

      <SectionHeader title="الأدوات المصغرة (Widgets)" />
      <Card>
        <Text className="text-sm text-muted mb-3">
          ودجتان: «جدول اليوم» يعرض أقرب 4 مواعيد بألوان الأنواع مع الصلاة القادمة، و«الصلاة القادمة» بحجم صغير.
        </Text>
        <Step n={1}>اضغط مطوّلًا على مساحة فارغة في الشاشة الرئيسية.</Step>
        <Step n={2}>اختر «الأدوات» أو Widgets.</Step>
        <Step n={3}>ابحث عن DoctorPlanner واسحب الودجت إلى الشاشة.</Step>
        <View className="mt-2">
          <Button
            label="تحديث الودجت الآن"
            icon="refresh"
            variant="soft"
            onPress={async () => {
              await refreshWidgets();
              Alert.alert("تم", "طُلب تحديث الودجت.");
            }}
          />
        </View>
        <Text className="text-xs text-muted mt-3">
          الودجت لا يعمل في Expo Go، ويحتاج Development Build (راجع README).
        </Text>
      </Card>

      <SectionHeader title="إشعارات الساعة (Xiaomi Watch)" />
      <Card>
        <Text className="text-sm text-muted mb-3">
          لا يحتاج التطبيق ربطًا خاصًا: إشعاراته تُنقل إلى الساعة عبر تطبيق الساعة على هاتفك. الإشعارات (الصلاة
          والمواعيد والمناوبات) تُرسل بأولوية عالية لتصل فورًا.
        </Text>
        <Step n={1}>اقرن الساعة بالهاتف من تطبيق الساعة (Mi Fitness أو Xiaomi Wear حسب طراز ساعتك).</Step>
        <Step n={2}>
          في تطبيق الساعة افتح إعدادات الإشعارات (قد تُسمّى «إشعارات التطبيقات» أو «تنبيهات التطبيقات») وفعّل DoctorPlanner.
        </Step>
        <Step n={3}>في الهاتف: اسمح للتطبيق بالعمل في الخلفية وبدون قيود البطارية (الزر أدناه)، وعلى Xiaomi فعّل «التشغيل التلقائي».</Step>
        <Step n={4}>جرّب بالزر التالي: يجب أن يصل الإشعار إلى الهاتف والساعة.</Step>
        <View className="gap-2 mt-2">
          <Button label="إرسال إشعار تجريبي" icon="paper-plane" onPress={test} />
          <Button label="إعدادات البطارية" icon="battery-charging" variant="outline" onPress={openBattery} />
          <Button label="إعدادات التطبيق في النظام" icon="settings" variant="outline" onPress={() => Linking.openSettings()} />
        </View>
        <Text className="text-xs text-muted mt-3">
          ملاحظة: المنبّه الإجباري يرنّ على الهاتف. وصول أزرار الإيقاف إلى الساعة يعتمد على طراز الساعة ونظامها.
        </Text>
      </Card>
    </Screen>
  );
}
