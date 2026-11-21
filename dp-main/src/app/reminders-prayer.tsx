import { useState } from "react";
import { Alert, Linking, Pressable, Switch, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Field, FieldRow } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/EmptyState";
import { Text } from "@/components/ui/Text";
import { TimeField } from "@/components/pickers";
import {
  ensureNotificationPermission,
  refreshPrayerSchedule,
  sendTestDhikr,
  sendTestPrayerReminder,
  setupNotifications,
} from "@/lib/notifications";
import { DEFAULT_DHIKR_TEXTS, useSettings } from "@/store/useSettings";

const BEFORE_OPTIONS = [15, 20, 30, 45, 60];
const REPEAT_OPTIONS = [5, 10, 15, 20];
const DHIKR_EVERY = [30, 60, 90, 120, 180];
const DHIKR_COUNT = [4, 6, 8, 12, 20];
const GREEN = "#16A34A";

/** صف مفتاح بعنوان وشرح */
function ToggleRow({
  title,
  hint,
  value,
  onChange,
}: {
  title: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between mb-3">
      <View className="flex-1 pe-3">
        <Text w="semi">{title}</Text>
        {hint ? <Text className="text-xs text-muted">{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: GREEN, false: "#CBD5E1" }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export default function PrayerRemindersScreen() {
  const prayerReminders = useSettings((s) => s.prayerReminders);
  const dhikr = useSettings((s) => s.dhikr);
  const update = useSettings((s) => s.update);
  const [newText, setNewText] = useState("");

  const setReminders = (patch: Partial<typeof prayerReminders>) =>
    update({ prayerReminders: { ...prayerReminders, ...patch } });
  const setDhikr = (patch: Partial<typeof dhikr>) => update({ dhikr: { ...dhikr, ...patch } });

  /** الاختبار يحتاج الإذن والقنوات؛ نطلبهما قبل الجدولة */
  const test = async (fn: () => Promise<void>, msg: string) => {
    await setupNotifications();
    if (!(await ensureNotificationPermission())) {
      Alert.alert("الإشعارات متوقفة", "فعّل إذن الإشعارات للتطبيق من إعدادات الهاتف.");
      return;
    }
    await fn();
    Alert.alert("تم", msg);
  };

  const addText = () => {
    const t = newText.trim();
    if (!t) return;
    setDhikr({ texts: [...dhikr.texts, t] });
    setNewText("");
  };

  const removeText = (i: number) => {
    if (dhikr.texts.length <= 1) {
      Alert.alert("لا يمكن الحذف", "يجب أن يبقى ذكر واحد على الأقل.");
      return;
    }
    setDhikr({ texts: dhikr.texts.filter((_, j) => j !== i) });
  };

  return (
    <Screen title="تذكيرات الصلاة والأذكار" back>
      {/* قبل الصلاة */}
      <SectionHeader title="قبل الصلاة" />
      <Card>
        <ToggleRow
          title="تذكير قبل الصلاة"
          hint="للصلوات الخمس المفعّلة في شاشة الصلاة"
          value={prayerReminders.before.enabled}
          onChange={(v) => setReminders({ before: { ...prayerReminders.before, enabled: v } })}
        />
        {prayerReminders.before.enabled && (
          <FieldRow label="قبل كم دقيقة">
            <View className="flex-row flex-wrap gap-2">
              {BEFORE_OPTIONS.map((m) => (
                <Chip
                  key={m}
                  label={`${m} د`}
                  color={GREEN}
                  selected={prayerReminders.before.minutes === m}
                  onPress={() => setReminders({ before: { ...prayerReminders.before, minutes: m } })}
                />
              ))}
            </View>
          </FieldRow>
        )}
      </Card>

      {/* عند الأذان */}
      <SectionHeader title="عند الأذان" />
      <Card>
        <ToggleRow
          title="إشعار وقت الصلاة"
          value={prayerReminders.atAdhan.enabled}
          onChange={(v) => setReminders({ atAdhan: { enabled: v } })}
        />
      </Card>

      {/* عدم الإزعاج الذكي */}
      <SectionHeader title="عدم الإزعاج أثناء الصلاة" />
      <Card>
        <ToggleRow
          title="إشعارات هادئة وقت الصلاة"
          hint="مواعيد العيادة والمناوبات والمهام التي تحين أثناء الصلاة تصل بلا صوت ولا اهتزاز"
          value={prayerReminders.quiet.enabled}
          onChange={(v) => setReminders({ quiet: { ...prayerReminders.quiet, enabled: v } })}
        />
        {prayerReminders.quiet.enabled && (
          <FieldRow label="مدة النافذة بعد الأذان">
            <View className="flex-row flex-wrap gap-2">
              {[10, 15, 20, 30].map((m) => (
                <Chip
                  key={m}
                  label={`${m} د`}
                  color={GREEN}
                  selected={prayerReminders.quiet.minutes === m}
                  onPress={() => setReminders({ quiet: { ...prayerReminders.quiet, minutes: m } })}
                />
              ))}
            </View>
          </FieldRow>
        )}
      </Card>

      {/* التكرار */}
      <SectionHeader title="تكرار بعد الأذان" />
      <Card>
        <ToggleRow
          title="ذكّرني حتى أصلّي"
          hint="يتكرر حتى الصلاة التالية (الفجر حتى الشروق) أو تضغط «صليت»"
          value={prayerReminders.repeat.enabled}
          onChange={(v) => setReminders({ repeat: { ...prayerReminders.repeat, enabled: v } })}
        />
        {prayerReminders.repeat.enabled && (
          <>
            <FieldRow label="كل كم دقيقة">
              <View className="flex-row flex-wrap gap-2">
                {REPEAT_OPTIONS.map((m) => (
                  <Chip
                    key={m}
                    label={`${m} د`}
                    color={GREEN}
                    selected={prayerReminders.repeat.everyMin === m}
                    onPress={() => setReminders({ repeat: { ...prayerReminders.repeat, everyMin: m } })}
                  />
                ))}
              </View>
            </FieldRow>
            <Text w="semi" className="text-sm text-slate-600 mb-1.5">
              ساعات الهدوء (لا تكرار فيها)
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <TimeField
                  label="من"
                  value={prayerReminders.repeat.quietFrom}
                  onChange={(t) => setReminders({ repeat: { ...prayerReminders.repeat, quietFrom: t } })}
                />
              </View>
              <View className="flex-1">
                <TimeField
                  label="إلى"
                  value={prayerReminders.repeat.quietTo}
                  onChange={(t) => setReminders({ repeat: { ...prayerReminders.repeat, quietTo: t } })}
                />
              </View>
            </View>
          </>
        )}
        <Button
          label="تجربة تذكير بزر «صليت»"
          variant="soft"
          icon="notifications-outline"
          onPress={() => test(() => sendTestPrayerReminder(5), "سيصلك إشعار بعد ثوانٍ. أغلق التطبيق وجرّب الأزرار.")}
        />
      </Card>

      {/* الأذكار */}
      <SectionHeader title="الأذكار" />
      <Card>
        <ToggleRow
          title="تذكير الأذكار"
          hint="إشعارات هادئة موزّعة على اليوم وتتجنب أوقات الصلاة"
          value={dhikr.enabled}
          onChange={(v) => setDhikr({ enabled: v })}
        />
        {dhikr.enabled && (
          <>
            <FieldRow label="النمط">
              <View className="flex-row gap-2">
                <Chip label="كل فترة" color={GREEN} selected={dhikr.mode === "interval"} onPress={() => setDhikr({ mode: "interval" })} />
                <Chip label="عدد في اليوم" color={GREEN} selected={dhikr.mode === "count"} onPress={() => setDhikr({ mode: "count" })} />
              </View>
            </FieldRow>

            {dhikr.mode === "interval" ? (
              <FieldRow label="كل كم دقيقة">
                <View className="flex-row flex-wrap gap-2">
                  {DHIKR_EVERY.map((m) => (
                    <Chip key={m} label={`${m} د`} color={GREEN} selected={dhikr.everyMin === m} onPress={() => setDhikr({ everyMin: m })} />
                  ))}
                </View>
              </FieldRow>
            ) : (
              <FieldRow label="عدد الأذكار في اليوم">
                <View className="flex-row flex-wrap gap-2">
                  {DHIKR_COUNT.map((n) => (
                    <Chip key={n} label={`${n}`} color={GREEN} selected={dhikr.countPerDay === n} onPress={() => setDhikr({ countPerDay: n })} />
                  ))}
                </View>
              </FieldRow>
            )}

            <Text w="semi" className="text-sm text-slate-600 mb-1.5">
              نافذة الوقت
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <TimeField label="من" value={dhikr.from} onChange={(t) => setDhikr({ from: t })} />
              </View>
              <View className="flex-1">
                <TimeField label="إلى" value={dhikr.to} onChange={(t) => setDhikr({ to: t })} />
              </View>
            </View>

            <FieldRow label="ابتعد عن وقت الصلاة بمقدار">
              <View className="flex-row flex-wrap gap-2">
                {[5, 10, 15, 20].map((m) => (
                  <Chip key={m} label={`${m} د`} color={GREEN} selected={dhikr.avoidPrayerMin === m} onPress={() => setDhikr({ avoidPrayerMin: m })} />
                ))}
              </View>
            </FieldRow>

            <Text w="semi" className="text-sm text-slate-600 mb-1.5">
              قائمة الأذكار (تُدوَّر بالترتيب)
            </Text>
            {dhikr.texts.map((t, i) => (
              <View
                key={`${i}-${t}`}
                className="flex-row items-center gap-2 py-2"
                style={{ borderBottomWidth: 1, borderBottomColor: "#EFEDE5" }}
              >
                <Text className="flex-1 text-sm">{t}</Text>
                <Pressable onPress={() => removeText(i)} hitSlop={10}>
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </Pressable>
              </View>
            ))}
            <View className="mt-3">
              <Field placeholder="أضف ذكرًا جديدًا" value={newText} onChangeText={setNewText} onSubmitEditing={addText} returnKeyType="done" />
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Button label="إضافة" icon="add" variant="soft" onPress={addText} />
                </View>
                <View className="flex-1">
                  <Button
                    label="الافتراضي"
                    icon="refresh"
                    variant="ghost"
                    onPress={() =>
                      Alert.alert("استعادة الأذكار", "ستعود القائمة للأذكار الافتراضية.", [
                        { text: "إلغاء", style: "cancel" },
                        { text: "استعادة", onPress: () => setDhikr({ texts: DEFAULT_DHIKR_TEXTS }) },
                      ])
                    }
                  />
                </View>
              </View>
            </View>
            <View className="mt-3">
              <Button
                label="إشعار تجريبي"
                icon="notifications-outline"
                variant="soft"
                onPress={() => test(() => sendTestDhikr(dhikr.texts[0] ?? DEFAULT_DHIKR_TEXTS[0], 5), "سيصلك ذكر بعد ثوانٍ.")}
              />
            </View>
          </>
        )}
      </Card>

      <SectionHeader title="لضمان وصول التذكيرات" />
      <Card>
        <View className="flex-row items-start gap-3">
          <Ionicons name="battery-charging-outline" size={22} color="#C2410C" />
          <View className="flex-1">
            <Text w="semi">هواتف Xiaomi</Text>
            <Text className="text-sm text-muted mt-0.5">
              أوقف توفير البطارية عن التطبيق وفعّل «التشغيل التلقائي»، وإلا قد يؤخّر النظام الإشعارات أو يمنعها.
            </Text>
          </View>
        </View>
        <View className="mt-3 gap-2">
          <Button label="فتح إعدادات التطبيق" icon="settings-outline" variant="soft" onPress={() => Linking.openSettings()} />
          <Button
            label="تحديث جدول الإشعارات الآن"
            icon="sync-outline"
            variant="ghost"
            onPress={() => {
              refreshPrayerSchedule().then(() => Alert.alert("تم", "جُدّدت إشعارات الصلاة والأذكار."));
            }}
          />
        </View>
      </Card>
    </Screen>
  );
}
