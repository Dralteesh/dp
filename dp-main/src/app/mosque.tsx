import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { FARD, PRAYER_LABELS } from "@/lib/prayer";
import { useSettings } from "@/store/useSettings";

/** مسجدي: يدخل المستخدم أوقات الإقامة من لوحة المسجد (دقائق بعد الأذان) فتظهر بجانب كل صلاة */
export default function MosqueScreen() {
  const mosque = useSettings((s) => s.mosque);
  const update = useSettings((s) => s.update);
  const [name, setName] = useState(mosque?.name ?? "");
  const iqama = mosque?.iqama ?? {};

  const save = (patch: Partial<NonNullable<typeof mosque>>) =>
    update({ mosque: { name, iqama, ...patch } });

  return (
    <Screen title="مسجدي" back>
      <Card>
        <Field
          label="اسم المسجد"
          value={name}
          onChangeText={setName}
          onEndEditing={() => save({ name })}
          placeholder="مثال: جامع الحاضر"
        />
        <Text className="text-xs text-muted mb-2">
          أدخل الدقائق بين الأذان والإقامة كما هي معلّقة في المسجد. تظهر في شاشة الصلاة بجانب كل صلاة.
        </Text>
        {FARD.map((k) => {
          const v = iqama[k] ?? 0;
          const set = (n: number) => save({ iqama: { ...iqama, [k]: Math.max(0, Math.min(90, n)) } });
          return (
            <View key={k} className="flex-row items-center justify-between py-1.5">
              <Text w="semi">{PRAYER_LABELS[k]}</Text>
              <View className="flex-row items-center gap-3">
                <Pressable onPress={() => set(v - 1)} className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
                  <Ionicons name="remove" size={18} color="#0F172A" />
                </Pressable>
                <Text w="bold" className="w-14 text-center" style={{ fontVariant: ["tabular-nums"] }}>
                  {v ? `${v} د` : "—"}
                </Text>
                <Pressable onPress={() => set(v + 1)} className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
                  <Ionicons name="add" size={18} color="#0F172A" />
                </Pressable>
              </View>
            </View>
          );
        })}
        {mosque ? (
          <View className="mt-3">
            <Button label="إزالة المسجد" icon="trash-outline" variant="soft" onPress={() => update({ mosque: null })} />
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}
