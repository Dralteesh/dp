import { Alert, Linking, Pressable, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Field, FieldRow } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/EmptyState";
import { TimelinePrefsPanel } from "@/components/home/TimelinePrefsPanel";
import { Text } from "@/components/ui/Text";
import { setCity } from "@/lib/prayer";
import { CITY, PRAYER_LABELS, PRAYER_METHODS, PRAYER_ORDER } from "@/lib/prayer";
import { useClinic } from "@/store/useClinic";
import { usePlanner } from "@/store/usePlanner";
import { useSettings } from "@/store/useSettings";
import { CHALLENGE_LABELS } from "@/lib/alarmChallenge";
import type { AlarmChallenge, PrayerMethodKey } from "@/types";

const REMINDER_OPTIONS = [0, 15, 30, 60, 120];

type LinkProps = { icon: keyof typeof Ionicons.glyphMap; title: string; hint: string; href: string; last?: boolean };

/** صف تنقّل داخل الإعدادات */
function SettingsLink({ icon, title, hint, href, last }: LinkProps) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(href as never)}
      className="flex-row items-center gap-3 py-3"
      style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: "#EFEDE5" }}
    >
      <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: "#E8F1F7" }}>
        <Ionicons name={icon} size={20} color="#0E6FA5" />
      </View>
      <View className="flex-1">
        <Text w="semi">{title}</Text>
        <Text className="text-xs text-muted">{hint}</Text>
      </View>
      <Ionicons name="chevron-back" size={18} color="#94A3B8" />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const s = useSettings();

  const resetPlanner = usePlanner((p) => p.resetAll);
  const resetClinic = useClinic((c) => c.resetAll);

  const confirm = (title: string, msg: string, action: () => void) =>
    Alert.alert(title, msg, [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: action },
    ]);

  return (
    <Screen title="الإعدادات" back>
      <Card>
        <Field
          label="اسمك (يظهر في التحية)"
          value={s.doctorName}
          onChangeText={(v) => s.update({ doctorName: v })}
          placeholder="مثال: حسن"
        />
        <Field
          label="العملة"
          value={s.currency}
          onChangeText={(v) => s.update({ currency: v })}
          placeholder="ل.س أو $"
        />
      </Card>

      <SectionHeader title="التخصيص" />
      <Card>
        <SettingsLink icon="cash-outline" title="دخلي الشهري" hint="الراتب والدوامات والمناوبات وصافي العيادة" href="/income" />
        <SettingsLink icon="calendar-number-outline" title="جدولة الدوامات" hint="املأ الشهر بالدوامات والمناوبات بضغطة" href="/shifts-bulk" />
        <SettingsLink icon="briefcase-outline" title="أماكن العمل" hint="أنواع الدوام والمناوبة، الألوان، الأماكن الافتراضية" href="/workplaces" />
        <SettingsLink icon="color-palette-outline" title="المظهر والشعارات" hint="ألوان الأنواع، اسم التطبيق وشعار العيادة" href="/appearance" />
        <SettingsLink icon="images-outline" title="شعارات العيادة في الخط الزمني" hint="بدّل شعار كل إجراء: جاهز أو صورة من المعرض" href="/appearance" />
        <SettingsLink icon="cloud-outline" title="الحساب والمزامنة" hint="نسخ احتياطي سحابي ومزامنة بين الأجهزة" href="/account" />
        <SettingsLink icon="hourglass-outline" title="لحظاتي (العدّادات)" hint="عدّ تنازلي وتصاعدي، تذكيرات، ودجات، نسخ مشفّر" href="/countdowns" />
        <SettingsLink icon="shield-checkmark-outline" title="الأمان والنسخ الاحتياطي" hint="قفل التطبيق، تصدير واستعادة بياناتك" href="/security" last />
      </Card>

      <SectionHeader title="الشاشة الرئيسية" />
      <Card>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pe-3">
            <Text w="semi">إظهار المنبّهات القادمة</Text>
            <Text className="text-xs text-muted">أخفها إن أردت رئيسية أخف</Text>
          </View>
          <Switch
            value={s.homeShowTasks}
            onValueChange={(v) => s.update({ homeShowTasks: v })}
            trackColor={{ true: "#0E6FA5", false: "#CBD5E1" }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View className="flex-row items-center justify-between mt-4">
          <View className="flex-1 pe-3">
            <Text w="semi">إظهار المستندات الأخيرة</Text>
            <Text className="text-xs text-muted">آخر 3 مستندات أضفتها تحت المهام</Text>
          </View>
          <Switch
            value={s.homeShowDocs}
            onValueChange={(v) => s.update({ homeShowDocs: v })}
            trackColor={{ true: "#0E6FA5", false: "#CBD5E1" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Card>

      <SectionHeader title="الجدول الأسبوعي (الرئيسية)" />
      <Card>
        <TimelinePrefsPanel />
      </Card>

      <SectionHeader title="المنبّه الإجباري" />
      <Card>
        <FieldRow label="تحدّي الإيقاف الافتراضي لمنبّهات المناوبات">
          <View className="flex-row flex-wrap gap-2">
            {(["math", "memory", "phrase", "shake", "hold", "none"] as AlarmChallenge[]).map((c) => (
              <Chip
                key={c}
                label={CHALLENGE_LABELS[c].label}
                selected={s.defaultAlarmChallenge === c}
                color="#C2410C"
                onPress={() => s.update({ defaultAlarmChallenge: c })}
              />
            ))}
          </View>
        </FieldRow>
      </Card>

      <SectionHeader title="الصلاة" />
      <Card>
        <SettingsLink icon="moon-outline" title="إعدادات الصلاة" hint="الموقع، طريقة الحساب، المذهب، المسجد، التذكيرات والأذكار" href="/prayer-settings" last />
      </Card>

      <SectionHeader title="التذكيرات" />
      <Card>
        <SettingsLink
          icon="moon-outline"
          title="تذكيرات الصلاة والأذكار"
          hint="قبل الصلاة، بعد الأذان حتى تصلّي، الأذكار"
          href="/reminders-prayer"
          last
        />
      </Card>
      <Card>
        <View className="flex-row items-start gap-3">
          <Ionicons name="battery-charging-outline" size={22} color="#C2410C" />
          <View className="flex-1">
            <Text w="semi">لضمان وصول التذكيرات على هواتف Xiaomi</Text>
            <Text className="text-sm text-muted mt-0.5">
              أوقف توفير البطارية عن التطبيق وفعّل «التشغيل التلقائي».
            </Text>
          </View>
        </View>
        <View className="mt-3">
          <Button label="فتح إعدادات التطبيق" variant="soft" icon="settings-outline" onPress={() => Linking.openSettings()} />
        </View>
      </Card>
      <View style={{ height: 8 }} />
      <Card>
        <FieldRow label="تذكير افتراضي للأحداث الجديدة (دقائق قبل البدء)">
          <View className="flex-row flex-wrap gap-2">
            {REMINDER_OPTIONS.map((m) => (
              <Chip
                key={m}
                label={m === 0 ? "عند البدء" : `${m} د`}
                selected={s.defaultReminder === m}
                onPress={() => s.update({ defaultReminder: m })}
              />
            ))}
          </View>
        </FieldRow>
        <FieldRow label="تذكير مواعيد العيادة الخاصة قبل الموعد">
          <View className="flex-row flex-wrap gap-2">
            {REMINDER_OPTIONS.map((m) => (
              <Chip
                key={m}
                label={m === 0 ? "عند الموعد" : `${m} د`}
                selected={s.appointmentReminder === m}
                color="#16A34A"
                onPress={() => s.update({ appointmentReminder: m })}
              />
            ))}
          </View>
        </FieldRow>
      </Card>

      <SectionHeader title="البيانات" />
      <Card>
        <SettingsLink
          icon="download-outline"
          title="استيراد ملف JSON"
          hint="من البرنامج السابق: معاينة ثم دمج دون حذف بياناتك"
          href="/clinic/import"
        />
        <Text className="text-sm text-muted mb-3">
          بيانات المرضى والمواعيد محفوظة على هذا الهاتف مشفّرة (مفتاحها في Keystore)، وتُزامَن مع حسابك عند تسجيل الدخول.
        </Text>
        <View className="gap-2">
          <Button
            label="حذف الأحداث والمهام والملاحظات"
            variant="danger"
            icon="trash-outline"
            onPress={() => confirm("حذف بيانات المخطّط", "سيتم حذف كل الأحداث والمهام والملاحظات نهائيًا.", resetPlanner)}
          />
          <Button
            label="حذف بيانات العيادة الخاصة"
            variant="danger"
            icon="trash-outline"
            onPress={() => confirm("حذف بيانات العيادة", "سيتم حذف المرضى والمواعيد والجلسات والدفعات نهائيًا.", resetClinic)}
          />
          <Button
            label="استعادة الإعدادات الافتراضية"
            variant="soft"
            icon="refresh"
            onPress={() => confirm("استعادة الإعدادات", "ستعود كل الإعدادات لقيمها الأولى.", s.reset)}
          />
        </View>
      </Card>

      <SectionHeader title="متقدّم" />
      <Card>
        <SettingsLink icon="watch-outline" title="الأدوات المصغرة والساعة" hint="ودجت الشاشة الرئيسية وإشعارات Xiaomi Watch" href="/connect" last />
      </Card>
    </Screen>
  );
}
