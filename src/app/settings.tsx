import { Alert, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Field, FieldRow } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/EmptyState";
import { Text } from "@/components/ui/Text";
import { CITY, PRAYER_LABELS, PRAYER_METHODS, PRAYER_ORDER } from "@/lib/prayer";
import { useClinic } from "@/store/useClinic";
import { usePlanner } from "@/store/usePlanner";
import { useSettings } from "@/store/useSettings";
import type { PrayerMethodKey } from "@/types";

const REMINDER_OPTIONS = [0, 15, 30, 60, 120];

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

      <SectionHeader title={`الصلاة • ${CITY.name}`} />
      <Card>
        <FieldRow label="طريقة الحساب">
          {(Object.keys(PRAYER_METHODS) as PrayerMethodKey[]).map((k) => {
            const active = s.prayerMethod === k;
            return (
              <Pressable
                key={k}
                onPress={() => s.update({ prayerMethod: k })}
                className="flex-row items-center gap-3 py-2.5"
              >
                <Ionicons
                  name={active ? "radio-button-on" : "radio-button-off"}
                  size={22}
                  color={active ? "#16A34A" : "#94A3B8"}
                />
                <Text w={active ? "bold" : "regular"}>{PRAYER_METHODS[k].label}</Text>
              </Pressable>
            );
          })}
        </FieldRow>

        <FieldRow label="المذهب (وقت العصر)">
          <View className="flex-row gap-2">
            <Chip label="جمهور (ظل مثل)" selected={s.madhab === "shafi"} color="#16A34A" onPress={() => s.update({ madhab: "shafi" })} />
            <Chip label="حنفي (ظلان)" selected={s.madhab === "hanafi"} color="#16A34A" onPress={() => s.update({ madhab: "hanafi" })} />
          </View>
        </FieldRow>

        <FieldRow label="تعديل يدوي بالدقائق (لمطابقة تقويم الأوقاف)">
          {PRAYER_ORDER.map((k) => {
            const v = s.prayerAdjust[k] ?? 0;
            return (
              <View key={k} className="flex-row items-center justify-between py-1.5">
                <Text w="semi">{PRAYER_LABELS[k]}</Text>
                <View className="flex-row items-center gap-3">
                  <Pressable
                    onPress={() => s.setAdjust(k, v - 1)}
                    className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
                  >
                    <Ionicons name="remove" size={18} color="#0F172A" />
                  </Pressable>
                  <Text w="bold" className="w-10 text-center" style={{ fontVariant: ["tabular-nums"] }}>
                    {v > 0 ? `+${v}` : v}
                  </Text>
                  <Pressable
                    onPress={() => s.setAdjust(k, v + 1)}
                    className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
                  >
                    <Ionicons name="add" size={18} color="#0F172A" />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </FieldRow>
      </Card>

      <SectionHeader title="التذكيرات" />
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
        <Text className="text-sm text-muted mb-3">
          البيانات محفوظة على هذا الهاتف فقط (AsyncStorage). المزامنة السحابية عبر Supabase ستُضاف لاحقًا.
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
    </Screen>
  );
}
