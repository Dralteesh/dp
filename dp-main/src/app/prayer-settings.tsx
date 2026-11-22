import { Alert, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { FieldRow } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { CITY, PRAYER_LABELS, PRAYER_METHODS, PRAYER_ORDER, setCity } from "@/lib/prayer";
import { useSettings } from "@/store/useSettings";
import type { PrayerMethodKey } from "@/types";

type LinkProps = { icon: keyof typeof Ionicons.glyphMap; title: string; hint: string; href: string; last?: boolean };

/** صف تنقّل */
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

/** إعدادات الصلاة: الموقع، طريقة الحساب، المذهب، التعديل اليدوي، المسجد، التذكيرات والأذكار */
export default function PrayerSettingsScreen() {
  const s = useSettings();

  const locate = async () => {
    try {
      const Location = await import("expo-location");
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("الإذن مطلوب", "فعّل إذن الموقع للتطبيق من إعدادات الهاتف.");
        return;
      }
      const pos =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      const { latitude: lat, longitude: lng } = pos.coords;
      let name = "موقعي";
      try {
        const g = (await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }))[0];
        name = g?.city || g?.subregion || g?.region || name;
      } catch {}
      s.update({ location: { name, lat, lng } });
      setCity({ name, lat, lng });
      Alert.alert("تم", `الموقع: ${name}`);
    } catch {
      Alert.alert("تعذّر تحديد الموقع", "شغّل GPS وجرّب مجددًا.");
    }
  };

  return (
    <Screen title={`إعدادات الصلاة • ${s.location?.name ?? CITY.name}`} back>
      <Card>
        <FieldRow label="الموقع (للمواقيت والقبلة)">
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button label="تحديد موقعي" icon="locate" variant="soft" onPress={locate} />
            </View>
            <View className="flex-1">
              <Button label="حماه (الافتراضي)" icon="refresh" variant="soft" onPress={() => { s.update({ location: null }); setCity(null); }} />
            </View>
          </View>
          <Text className="text-xs text-muted mt-1">
            يُحفظ الموقع على الجهاز، وتعمل المواقيت والقبلة بعدها بلا إنترنت.
          </Text>
        </FieldRow>
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
        <SettingsLink icon="business" title="مسجدي" hint="أوقات الإقامة في مسجدك" href="/mosque" />
        <SettingsLink icon="moon-outline" title="تذكيرات الصلاة" hint="قبل الصلاة، بعد الأذان حتى تصلّي" href="/reminders-prayer" />
        <SettingsLink icon="sparkles-outline" title="الأذكار" hint="تذكير الأذكار ونصوصها" href="/reminders-prayer?only=dhikr" last />
      </Card>
    </Screen>
  );
}
