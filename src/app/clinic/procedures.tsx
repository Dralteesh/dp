import { useState } from "react";
import { Alert, Image, Pressable, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { ProcedureGlyph } from "@/components/clinic/ProcedureIcon";
import { Button } from "@/components/ui/Button";
import { Field, FieldRow } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { TREATMENT_ICONS } from "@/constants/icons";
import { TYPE_META } from "@/constants/shiftTypes";
import { useProcedures } from "@/hooks/useProcedures";
import { useTheme } from "@/hooks/useTheme";
import { uid } from "@/lib/id";
import { pickLogo } from "@/lib/logo";
import { useSettings } from "@/store/useSettings";
import type { ProcedureDef, ProcedureIcon } from "@/types";

const ROW_H = 68;

/** أيقونات Ionicons مناسبة للإجراءات (40) */
const IONICONS = [
  "medical-outline", "medkit-outline", "bandage-outline", "pulse-outline", "fitness-outline", "flask-outline", "sparkles-outline",
  "shield-checkmark-outline", "hammer-outline", "construct-outline", "cut-outline", "color-wand-outline", "water-outline",
  "happy-outline", "heart-outline", "star-outline", "eye-outline", "body-outline", "clipboard-outline", "document-text-outline",
  "calendar-outline", "time-outline", "camera-outline", "image-outline", "bulb-outline", "build-outline", "ribbon-outline",
  "thermometer-outline", "nutrition-outline", "rose-outline", "snow-outline", "flame-outline", "flash-outline", "diamond-outline",
  "cube-outline", "funnel-outline", "brush-outline", "magnet-outline", "scan-outline", "locate-outline",
];

type Form = { id: string; isNew: boolean; name: string; minutes: string; keywords: string; icon: ProcedureIcon };

type RowProps = {
  item: ProcedureDef;
  index: number;
  count: number;
  activeIdx: SharedValue<number>;
  overIdx: SharedValue<number>;
  dragY: SharedValue<number>;
  onReorder: (from: number, to: number) => void;
  onEdit: () => void;
  onDelete: () => void;
};

function Row({ item, index, count, activeIdx, overIdx, dragY, onReorder, onEdit, onDelete }: RowProps) {
  const pan = Gesture.Pan()
    .minDistance(2)
    .onBegin(() => {
      activeIdx.value = index;
      overIdx.value = index;
      dragY.value = 0;
    })
    .onUpdate((e) => {
      dragY.value = e.translationY;
      overIdx.value = Math.max(0, Math.min(count - 1, Math.round(index + e.translationY / ROW_H)));
    })
    .onEnd(() => {
      runOnJS(onReorder)(index, overIdx.value);
    })
    .onFinalize(() => {
      activeIdx.value = -1;
      dragY.value = 0;
    });

  const anim = useAnimatedStyle(() => {
    const a = activeIdx.value;
    if (a === index) return { transform: [{ translateY: dragY.value }, { scale: 1.02 }], zIndex: 10, opacity: 0.96 };
    let ty = 0;
    const o = overIdx.value;
    if (a >= 0) {
      if (a < o && index > a && index <= o) ty = -ROW_H;
      else if (a > o && index < a && index >= o) ty = ROW_H;
    }
    return { transform: [{ translateY: withTiming(ty, { duration: 120 }) }, { scale: 1 }], zIndex: 0, opacity: 1 };
  });

  return (
    <Animated.View style={[{ height: ROW_H }, anim]}>
      <View className="flex-row items-center gap-2 bg-surface border border-line rounded-2xl px-2" style={{ height: ROW_H - 8 }}>
        <GestureDetector gesture={pan}>
          <View className="w-9 h-10 items-center justify-center" accessibilityLabel="اسحب لإعادة الترتيب">
            <Ionicons name="reorder-three" size={24} color="#94A3B8" />
          </View>
        </GestureDetector>
        <Pressable onPress={onEdit} className="flex-1 flex-row items-center gap-3">
          <ProcedureGlyph icon={item.icon} size={40} />
          <View className="flex-1">
            <Text w="semi" numberOfLines={1}>
              {item.name}
            </Text>
            <Text className="text-xs text-muted">{item.minutes} دقيقة</Text>
          </View>
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={8} className="w-9 h-10 items-center justify-center" accessibilityLabel="حذف">
          <Ionicons name="trash-outline" size={19} color="#DC2626" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

/** تعديل الإجراءات: إضافة/حذف/ترتيب بالسحب، مدة افتراضية، كلمات مفتاحية، وأيقونة (من التطبيق أو Ionicons أو صورة من المعرض) */
export default function ProceduresScreen() {
  useTheme();
  const update = useSettings((s) => s.update);
  const list = useProcedures();
  const hex = TYPE_META.private.hex;
  const [form, setForm] = useState<Form | null>(null);
  const [tab, setTab] = useState<"asset" | "ionicon" | "image">("asset");
  const activeIdx = useSharedValue(-1);
  const overIdx = useSharedValue(-1);
  const dragY = useSharedValue(0);

  const save = (next: ProcedureDef[]) => update({ procedures: next });

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    save(next);
  };

  const remove = (p: ProcedureDef) =>
    Alert.alert("حذف الإجراء", `${p.name}\nلن تتأثر المواعيد والجلسات المسجّلة سابقًا.`, [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: () => save(list.filter((x) => x.id !== p.id)) },
    ]);

  const restore = () =>
    Alert.alert("استعادة الافتراضي", "ستعود القائمة للإجراءات العشرة الأولى وتُفقد تعديلاتك.", [
      { text: "إلغاء", style: "cancel" },
      { text: "استعادة", onPress: () => update({ procedures: null }) },
    ]);

  const openNew = () => {
    setTab("asset");
    setForm({ id: uid(), isNew: true, name: "", minutes: "30", keywords: "", icon: { kind: "asset", key: "exam" } });
  };
  const openEdit = (p: ProcedureDef) => {
    setTab(p.icon.kind);
    setForm({ id: p.id, isNew: false, name: p.name, minutes: String(p.minutes), keywords: p.keywords.join("، "), icon: p.icon });
  };

  const submit = () => {
    if (!form) return;
    const name = form.name.trim();
    const minutes = Math.round(Number(form.minutes.replace(/[^\d.]/g, "")));
    if (!name) return Alert.alert("اكتب اسم الإجراء");
    if (!minutes || minutes < 5 || minutes > 600) return Alert.alert("المدة بين 5 و600 دقيقة");
    if (list.some((p) => p.id !== form.id && p.name.trim() === name)) return Alert.alert("هذا الاسم موجود");
    const keywords = form.keywords
      .split(/[,،\n]/)
      .map((k) => k.trim())
      .filter(Boolean);
    const def: ProcedureDef = { id: form.id, name, minutes, icon: form.icon, keywords };
    save(form.isNew ? [...list, def] : list.map((p) => (p.id === form.id ? def : p)));
    setForm(null);
  };

  const pickImage = async () => {
    try {
      const uri = await pickLogo();
      if (uri) setForm((f) => (f ? { ...f, icon: { kind: "image", uri } } : f));
    } catch {
      Alert.alert("تعذّر فتح المعرض", "تحقق من إذن الصور.");
    }
  };

  const Tab = ({ id, label }: { id: typeof tab; label: string }) => (
    <Pressable
      onPress={() => setTab(id)}
      className="flex-1 items-center py-2 rounded-xl"
      style={{ backgroundColor: tab === id ? hex : "#F1F5F9" }}
    >
      <Text w="semi" className="text-xs" style={{ color: tab === id ? "#FFFFFF" : "#475569" }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Screen title="تعديل الإجراءات" subtitle="الاسم والمدة والأيقونة والكلمات المفتاحية" back>
      <View style={{ height: list.length * ROW_H }}>
        {list.map((p, i) => (
          <Row
            key={p.id}
            item={p}
            index={i}
            count={list.length}
            activeIdx={activeIdx}
            overIdx={overIdx}
            dragY={dragY}
            onReorder={reorder}
            onEdit={() => openEdit(p)}
            onDelete={() => remove(p)}
          />
        ))}
      </View>
      <View className="mt-4 gap-3">
        <Button label="إجراء جديد" icon="add" type="private" onPress={openNew} />
        <Button label="استعادة الافتراضي" icon="refresh" variant="ghost" onPress={restore} />
      </View>
      <Text className="text-xs text-muted mt-3">
        الكلمات المفتاحية تُطابق الأسماء المكتوبة حرًّا (مثل «سحب عصب» ← معالجة لبية) فتظهر الأيقونة المناسبة تلقائيًا. الترتيب ينعكس في كل نماذج العيادة.
      </Text>

      <Sheet visible={!!form} onClose={() => setForm(null)} title={form?.isNew ? "إجراء جديد" : "تعديل الإجراء"}>
        {form ? (
          <>
            <View className="items-center mb-3">
              <ProcedureGlyph icon={form.icon} size={72} />
            </View>
            <Field label="الاسم" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
            <Field label="المدة الافتراضية (دقيقة)" value={form.minutes} onChangeText={(v) => setForm({ ...form, minutes: v })} keyboardType="number-pad" />
            <Field
              label="كلمات مفتاحية (اختياري)"
              value={form.keywords}
              onChangeText={(v) => setForm({ ...form, keywords: v })}
              placeholder="عصب، لبية، RCT"
              multiline
            />
            <FieldRow label="الأيقونة">
              <View className="flex-row gap-2 mb-3">
                <Tab id="asset" label="أيقونات التطبيق" />
                <Tab id="ionicon" label="رموز" />
                <Tab id="image" label="صورة" />
              </View>
              {tab === "asset" ? (
                <View className="flex-row flex-wrap gap-2">
                  {Object.keys(TREATMENT_ICONS).map((k) => {
                    const on = form.icon.kind === "asset" && form.icon.key === k;
                    return (
                      <Pressable
                        key={k}
                        onPress={() => setForm({ ...form, icon: { kind: "asset", key: k } })}
                        className="rounded-2xl p-1"
                        style={{ borderWidth: 2, borderColor: on ? hex : "transparent" }}
                      >
                        <Image source={TREATMENT_ICONS[k]} style={{ width: 52, height: 52 }} resizeMode="contain" />
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
              {tab === "ionicon" ? (
                <View className="flex-row flex-wrap gap-2">
                  {IONICONS.map((n) => {
                    const on = form.icon.kind === "ionicon" && form.icon.name === n;
                    return (
                      <Pressable
                        key={n}
                        onPress={() => setForm({ ...form, icon: { kind: "ionicon", name: n } })}
                        className="w-11 h-11 rounded-xl items-center justify-center"
                        style={{ backgroundColor: on ? hex : "#F1F5F9" }}
                      >
                        <Ionicons name={n as never} size={22} color={on ? "#FFFFFF" : "#334155"} />
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
              {tab === "image" ? (
                <Button label="اختيار صورة من المعرض" icon="image-outline" variant="ghost" onPress={pickImage} />
              ) : null}
            </FieldRow>
            <Button label="حفظ" icon="checkmark" type="private" onPress={submit} />
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}

