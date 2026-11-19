import { useState } from "react";
import { Alert, Pressable, ScrollView, Switch, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Field, FieldRow } from "@/components/ui/Field";
import { Text } from "@/components/ui/Text";
import { SWATCHES } from "@/constants/palette";
import { TYPE_META } from "@/constants/shiftTypes";
import { useActiveTypes } from "@/hooks/useActiveTypes";
import { normalizeHex } from "@/lib/color";
import { uid } from "@/lib/id";
import { ROUTE_PRESETS, itemLook } from "@/store/useQuickAdd";
import { useSettings } from "@/store/useSettings";
import type { QuickAddItem, ShiftType } from "@/types";

const ROW_H = 64;
const BLUE = "#0E6FA5";

/** أيقونات Ionicons للاختيار (40 فأكثر) */
const ICONS = [
  "checkbox-outline", "create-outline", "person-add-outline", "calendar-outline", "calendar-number-outline", "leaf-outline",
  "alarm-outline", "document-text-outline", "briefcase-outline", "medkit-outline", "moon-outline", "storefront-outline",
  "heart-outline", "star-outline", "home-outline", "school-outline", "book-outline", "car-outline",
  "fitness-outline", "people-outline", "flask-outline", "bandage-outline", "pulse-outline", "walk-outline",
  "restaurant-outline", "construct-outline", "cash-outline", "cart-outline", "call-outline", "chatbubble-outline",
  "mail-outline", "camera-outline", "image-outline", "folder-outline", "clipboard-outline", "list-outline",
  "bulb-outline", "time-outline", "timer-outline", "notifications-outline", "location-outline", "airplane-outline",
  "bicycle-outline", "cafe-outline", "gift-outline", "musical-notes-outline", "paw-outline", "bed-outline",
  "shield-checkmark-outline", "bar-chart-outline", "cube-outline", "sparkles-outline",
];

type Dest = { key: string; label: string; icon: string; kind: "event-type" | "route"; route?: string; type?: ShiftType };

type Form = {
  id: string;
  isNew: boolean;
  kind: "event-type" | "route";
  type?: ShiftType;
  route?: string;
  label: string;
  icon: string;
  hex: string;
  visible: boolean;
};

// ───────────────────────── صف قابل للسحب ─────────────────────────

type RowProps = {
  item: QuickAddItem;
  index: number;
  count: number;
  activeIdx: SharedValue<number>;
  overIdx: SharedValue<number>;
  dragY: SharedValue<number>;
  onReorder: (from: number, to: number) => void;
  onScroll: (enabled: boolean) => void;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

function EditRow({ item, index, count, activeIdx, overIdx, dragY, onReorder, onScroll, onToggle, onEdit, onDelete }: RowProps) {
  const look = itemLook(item);

  const pan = Gesture.Pan()
    .minDistance(2)
    .onBegin(() => {
      activeIdx.value = index;
      overIdx.value = index;
      dragY.value = 0;
      runOnJS(onScroll)(false);
    })
    .onUpdate((e) => {
      dragY.value = e.translationY;
      const target = Math.round(index + e.translationY / ROW_H);
      overIdx.value = Math.max(0, Math.min(count - 1, target));
    })
    .onEnd(() => {
      runOnJS(onReorder)(index, overIdx.value);
    })
    .onFinalize(() => {
      activeIdx.value = -1;
      dragY.value = 0;
      runOnJS(onScroll)(true);
    });

  const anim = useAnimatedStyle(() => {
    const a = activeIdx.value;
    if (a === index) {
      return { transform: [{ translateY: dragY.value }, { scale: 1.02 }], zIndex: 10, opacity: 0.96 };
    }
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
      <View
        className="flex-row items-center gap-2 bg-bg border border-line rounded-2xl px-2"
        style={{ height: ROW_H - 8, opacity: item.visible ? 1 : 0.55 }}
      >
        <GestureDetector gesture={pan}>
          <View className="w-9 h-10 items-center justify-center" accessibilityLabel="اسحب لإعادة الترتيب">
            <Ionicons name="reorder-three" size={24} color="#94A3B8" />
          </View>
        </GestureDetector>

        <Pressable onPress={onEdit} className="flex-1 flex-row items-center gap-2.5">
          <View
            className="w-9 h-9 rounded-xl items-center justify-center"
            style={{ backgroundColor: item.kind === "event-type" ? look.hex : "#FFFFFF", borderWidth: item.kind === "event-type" ? 0 : 1, borderColor: "#D6EAF6" }}
          >
            <Ionicons
              name={look.icon as never}
              size={18}
              color={item.kind === "event-type" ? look.onSolid : item.hex || "#0F172A"}
            />
          </View>
          <Text w="semi" className="flex-1 text-sm" numberOfLines={1}>
            {look.label}
          </Text>
        </Pressable>

        <Switch value={item.visible} onValueChange={onToggle} trackColor={{ true: BLUE, false: "#CBD5E1" }} thumbColor="#FFFFFF" />
        {item.kind === "route" ? (
          <Pressable onPress={onDelete} hitSlop={8} className="w-8 h-10 items-center justify-center" accessibilityLabel="حذف">
            <Ionicons name="trash-outline" size={19} color="#DC2626" />
          </Pressable>
        ) : (
          <View style={{ width: 32 }} />
        )}
      </View>
    </Animated.View>
  );
}

// ───────────────────────── المحرّر ─────────────────────────

/** وضع التعديل: قائمة عمودية قابلة للسحب + نموذج تعديل بند + إضافة اختصار + استعادة الافتراضي */
export function QuickAddEditor({ items }: { items: QuickAddItem[] }) {
  const update = useSettings((s) => s.update);
  const types = useActiveTypes();
  const [form, setForm] = useState<Form | null>(null);
  const [scrollOn, setScrollOn] = useState(true);
  const activeIdx = useSharedValue(-1);
  const overIdx = useSharedValue(-1);
  const dragY = useSharedValue(0);

  /** كل تغيير يُحفظ فورًا (القائمة المدمجة بترتيب المستخدم) */
  const save = (next: QuickAddItem[]) => update({ quickAdd: next });

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    save(next);
  };

  const toggle = (id: string) => save(items.map((i) => (i.id === id ? { ...i, visible: !i.visible } : i)));

  const remove = (it: QuickAddItem) =>
    Alert.alert("حذف الاختصار", itemLook(it).label, [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: () => save(items.filter((i) => i.id !== it.id)) },
    ]);

  const restore = () =>
    Alert.alert("استعادة الافتراضي", "ستعود الإضافة السريعة لقائمتها الأولى وتُفقد تعديلاتك.", [
      { text: "إلغاء", style: "cancel" },
      { text: "استعادة", onPress: () => update({ quickAdd: null }) },
    ]);

  // ───── الوجهات المتاحة في النموذج ─────
  const dests: Dest[] = [
    ...ROUTE_PRESETS.map((p) => ({ key: p.route, label: p.label, icon: p.icon, kind: "route" as const, route: p.route })),
    ...types.map((t) => ({ key: `type:${t}`, label: `حدث: ${TYPE_META[t].label}`, icon: TYPE_META[t].icon as string, kind: "event-type" as const, type: t })),
  ];
  const destKey = (f: Form) => (f.kind === "event-type" ? `type:${f.type}` : f.route ?? "");

  const openEdit = (it: QuickAddItem) => {
    const look = itemLook(it);
    setForm({
      id: it.id,
      isNew: false,
      kind: it.kind,
      type: it.type,
      route: it.route,
      label: look.label,
      icon: look.icon,
      hex: it.hex ?? "",
      visible: it.visible,
    });
  };

  const openNew = () => {
    const p = ROUTE_PRESETS[0];
    setForm({ id: uid(), isNew: true, kind: "route", route: p.route, label: p.label, icon: p.icon, hex: "", visible: true });
  };

  /** اختيار وجهة: نملأ النص والأيقونة تلقائيًا إن لم يعدّلهما المستخدم */
  const pickDest = (d: Dest) => {
    if (!form) return;
    const prev = dests.find((x) => x.key === destKey(form));
    const textUntouched = !form.label.trim() || form.label === prev?.label.replace("حدث: ", "") || form.label === prev?.label;
    const iconUntouched = !form.icon || form.icon === prev?.icon;
    setForm({
      ...form,
      kind: d.kind,
      type: d.type,
      route: d.route,
      label: textUntouched ? d.label.replace("حدث: ", "") : form.label,
      icon: iconUntouched ? d.icon : form.icon,
    });
  };

  const submit = () => {
    if (!form) return;
    const label = form.label.trim();
    if (!label) {
      Alert.alert("النص مطلوب", "اكتب اسمًا للاختصار.");
      return;
    }
    const hex = normalizeHex(form.hex) ?? undefined;
    if (form.hex.trim() && !hex) {
      Alert.alert("لون غير صالح", "اكتب اللون بصيغة hex مثل #2563EB.");
      return;
    }
    const isType = form.kind === "event-type" && !!form.type;
    const meta = isType ? TYPE_META[form.type as ShiftType] : null;
    const item: QuickAddItem = {
      id: form.id,
      kind: form.kind,
      type: isType ? form.type : undefined,
      route: form.kind === "route" ? form.route : undefined,
      // لنوع الحدث: ما يطابق الافتراضي يُخزَّن فارغًا ليتبع تسمية النوع وأيقونته لاحقًا
      label: meta && label === meta.label ? "" : label,
      icon: meta && form.icon === meta.icon ? "" : form.icon,
      hex,
      visible: form.visible,
    };
    // لا نكرر نوع حدث موجودًا أصلًا
    if (form.isNew && isType && items.some((i) => i.kind === "event-type" && i.type === item.type)) {
      Alert.alert("موجود", "هذا النوع موجود في القائمة. أظهره بالمفتاح بدل إضافته.");
      return;
    }
    save(form.isNew ? [...items, item] : items.map((i) => (i.id === item.id ? item : i)));
    setForm(null);
  };

  // ───── نموذج تعديل بند ─────
  if (form) {
    return (
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => setForm(null)} className="flex-row items-center gap-1.5 mb-3 self-start" hitSlop={8}>
          <Ionicons name="arrow-forward" size={18} color="#0F172A" />
          <Text w="semi">{form.isNew ? "إضافة اختصار" : "تعديل البند"}</Text>
        </Pressable>

        <Field label="النص" value={form.label} onChangeText={(v) => setForm({ ...form, label: v })} placeholder="مثال: مهمة" />

        <FieldRow label="الوجهة">
          <View className="flex-row flex-wrap gap-2">
            {dests.map((d) => {
              const on = destKey(form) === d.key;
              return (
                <Pressable
                  key={d.key}
                  onPress={() => pickDest(d)}
                  className="flex-row items-center gap-1.5 rounded-full px-3 py-2 border"
                  style={{ backgroundColor: on ? BLUE : "#FFFFFF", borderColor: on ? BLUE : "#D6EAF6" }}
                >
                  <Ionicons name={d.icon as never} size={14} color={on ? "#FFFFFF" : "#475569"} />
                  <Text w="semi" className="text-xs" style={{ color: on ? "#FFFFFF" : "#475569" }}>
                    {d.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </FieldRow>

        <FieldRow label="الأيقونة">
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {ICONS.map((n) => {
              const on = form.icon === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => setForm({ ...form, icon: n })}
                  className="w-11 h-11 rounded-xl items-center justify-center border"
                  style={{ backgroundColor: on ? BLUE : "#F8FAFC", borderColor: on ? BLUE : "#D6EAF6" }}
                >
                  <Ionicons name={n as never} size={20} color={on ? "#FFFFFF" : "#334155"} />
                </Pressable>
              );
            })}
          </View>
        </FieldRow>

        <FieldRow label="اللون">
          <View className="flex-row flex-wrap items-center" style={{ gap: 8 }}>
            <Pressable
              onPress={() => setForm({ ...form, hex: "" })}
              className="rounded-full px-3 py-2 border"
              style={{ backgroundColor: !form.hex ? "#0F172A" : "#FFFFFF", borderColor: !form.hex ? "#0F172A" : "#D6EAF6" }}
            >
              <Text w="semi" className="text-xs" style={{ color: !form.hex ? "#FFFFFF" : "#475569" }}>
                افتراضي
              </Text>
            </Pressable>
            {SWATCHES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setForm({ ...form, hex: c })}
                className="w-9 h-9 rounded-full items-center justify-center"
                style={{ backgroundColor: c, borderWidth: normalizeHex(form.hex) === c ? 3 : 0, borderColor: "#0F172A" }}
              />
            ))}
          </View>
          <View className="mt-2">
            <Field value={form.hex} onChangeText={(v) => setForm({ ...form, hex: v })} placeholder="#2563EB" autoCapitalize="characters" />
          </View>
        </FieldRow>

        <View className="flex-row gap-3 mt-1 mb-2">
          <View className="flex-1">
            <Button label="حفظ" icon="checkmark" onPress={submit} />
          </View>
          <View className="flex-1">
            <Button label="إلغاء" variant="soft" onPress={() => setForm(null)} />
          </View>
        </View>
      </ScrollView>
    );
  }

  // ───── القائمة ─────
  return (
    <ScrollView scrollEnabled={scrollOn} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text className="text-xs text-muted mb-2">اسحب المقبض لإعادة الترتيب، واضغط على البند لتعديله.</Text>
      <View style={{ height: items.length * ROW_H }}>
        {items.map((it, i) => (
          <EditRow
            key={it.id}
            item={it}
            index={i}
            count={items.length}
            activeIdx={activeIdx}
            overIdx={overIdx}
            dragY={dragY}
            onReorder={reorder}
            onScroll={setScrollOn}
            onToggle={() => toggle(it.id)}
            onEdit={() => openEdit(it)}
            onDelete={() => remove(it)}
          />
        ))}
      </View>
      <View className="gap-2 mt-3 mb-2">
        <Button label="إضافة اختصار" icon="add-circle-outline" onPress={openNew} />
        <Button label="استعادة الافتراضي" icon="refresh" variant="ghost" onPress={restore} />
      </View>
    </ScrollView>
  );
}
