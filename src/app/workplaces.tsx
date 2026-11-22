import { useState } from "react";
import { Alert, Pressable, Switch, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TimeField } from "@/components/pickers";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SectionHeader } from "@/components/ui/EmptyState";
import { Field, FieldRow } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { DEFAULT_TYPE_COLORS, SWATCHES, resolveTypeColors } from "@/constants/palette";
import { BUILTIN_TYPES, CUSTOM_SLOTS, TYPE_META, type IconName } from "@/constants/shiftTypes";
import { useActiveTypes } from "@/hooks/useActiveTypes";
import { useTheme } from "@/hooks/useTheme";
import { normalizeHex } from "@/lib/color";
import { inputAlign } from "@/lib/rtl";
import { useSettings } from "@/store/useSettings";
import type { ShiftType, WorkplaceConfig } from "@/types";

const ICONS: IconName[] = [
  "medkit", "moon", "storefront", "sparkles", "briefcase", "business", "home", "school", "book", "car",
  "fitness", "heart", "people", "flask", "star", "bandage", "pulse", "walk", "restaurant", "construct",
];
const ALARMS: { v: number | null; l: string }[] = [
  { v: null, l: "بدون" },
  { v: 0, l: "عند البدء" },
  { v: 30, l: "قبل 30 د" },
  { v: 60, l: "قبل ساعة" },
  { v: 90, l: "قبل ساعة ونصف" },
];

function TypeEditor({ type, initialOpen = false }: { type: ShiftType; initialOpen?: boolean }) {
  const workplaces = useSettings((s) => s.workplaces);
  const typeColors = useSettings((s) => s.typeColors);
  const places = useSettings((s) => s.places);
  const update = useSettings((s) => s.update);
  const [open, setOpen] = useState(initialOpen);

  const m = TYPE_META[type];
  const w: Partial<WorkplaceConfig> = workplaces[type] ?? {};
  const color = resolveTypeColors(type, typeColors[type]);
  const isCustom = !!w.custom;

  const patch = (p: Partial<WorkplaceConfig>) =>
    update({ workplaces: { ...workplaces, [type]: { ...workplaces[type], ...p } } });
  const setColor = (hex: string) => {
    const h = normalizeHex(hex);
    if (h) update({ typeColors: { ...typeColors, [type]: h } });
  };
  const remove = () =>
    Alert.alert("حذف مكان العمل", "ستبقى الأحداث القديمة لكن بلون واسم افتراضيين. متأكد؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: () => {
          const { [type]: _w, ...rest } = workplaces;
          const { [type]: _c, ...colors } = typeColors;
          update({ workplaces: rest, typeColors: colors });
        },
      },
    ]);

  return (
    <Card className="mb-3">
      <Pressable onPress={() => setOpen((o) => !o)} className="flex-row items-center gap-3">
        <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: color.hex }}>
          <Ionicons name={m.icon} size={20} color={color.onSolid} />
        </View>
        <View className="flex-1">
          <Text w="bold">{m.label}</Text>
          <Text className="text-xs text-muted" numberOfLines={1}>
            {m.defaults.start} - {m.defaults.end}
            {m.place ? ` • ${m.place}` : ""}
          </Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color="#94A3B8" />
      </Pressable>

      {open ? (
        <View className="mt-4">
          <Field label="الاسم" value={w.label ?? m.label} onChangeText={(v) => patch({ label: v })} />
          <Field label="اسم مختصر (للتقويم)" value={w.short ?? m.short} onChangeText={(v) => patch({ short: v })} />
          <Field
            label="عنوان افتراضي للحدث"
            value={w.defaultTitle ?? m.defaultTitle}
            onChangeText={(v) => patch({ defaultTitle: v })}
            placeholder="اختياري"
          />

          <FieldRow label="الأيقونة">
            <View className="flex-row flex-wrap gap-2">
              {ICONS.map((ic) => {
                const on = m.icon === ic;
                return (
                  <Pressable
                    key={ic}
                    onPress={() => patch({ icon: ic })}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: on ? color.hex : "#F1F5F9",
                    }}
                  >
                    <Ionicons name={ic} size={19} color={on ? color.onSolid : "#475569"} />
                  </Pressable>
                );
              })}
            </View>
          </FieldRow>

          <FieldRow label="اللون">
            <View className="flex-row flex-wrap gap-2">
              {SWATCHES.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: c,
                    borderWidth: color.hex.toLowerCase() === c.toLowerCase() ? 3 : 0,
                    borderColor: "#0F172A",
                  }}
                />
              ))}
            </View>
          </FieldRow>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <TimeField label="يبدأ عادةً" value={m.defaults.start} onChange={(v) => patch({ start: v })} />
            </View>
            <View className="flex-1">
              <TimeField label="ينتهي عادةً" value={m.defaults.end} onChange={(v) => patch({ end: v })} />
            </View>
          </View>
          <View className="flex-row items-center justify-between mb-3">
            <Text w="semi">ينتهي في اليوم التالي (مناوبة)</Text>
            <Switch
              value={m.defaults.endsNextDay}
              onValueChange={(v) => patch({ endsNextDay: v })}
              trackColor={{ true: color.hex, false: "#CBD5E1" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <FieldRow label="المكان الافتراضي">
            <View className="flex-row flex-wrap gap-2">
              <Chip label="بدون" selected={!m.place} color="#475569" onPress={() => patch({ place: "" })} />
              {places.map((p) => (
                <Chip key={p} label={p} selected={m.place === p} color={color.hex} textColor={color.onSolid} onPress={() => patch({ place: p })} />
              ))}
            </View>
          </FieldRow>

          <FieldRow label="منبّه إجباري افتراضي">
            <View className="flex-row flex-wrap gap-2">
              {ALARMS.map((a) => (
                <Chip
                  key={String(a.v)}
                  label={a.l}
                  selected={m.defaults.alarmMinutes === a.v}
                  color="#C2410C"
                  onPress={() => patch({ alarmMinutes: a.v })}
                />
              ))}
            </View>
          </FieldRow>

          <View className="flex-row gap-2 mt-1">
            {!isCustom ? (
              <View className="flex-1">
                <Button label="إخفاء من القوائم" icon="eye-off-outline" variant="outline" small onPress={() => patch({ hidden: true })} />
              </View>
            ) : (
              <View className="flex-1">
                <Button label="حذف" icon="trash-outline" variant="danger" small onPress={remove} />
              </View>
            )}
            <View className="flex-1">
              <Button
                label="إعادة الافتراضي"
                variant="ghost"
                small
                onPress={() => {
                  const { [type]: _w, ...rest } = workplaces;
                  const { [type]: _c, ...colors } = typeColors;
                  update({ workplaces: isCustom ? workplaces : rest, typeColors: colors });
                  if (isCustom) patch({ label: "مكان عمل جديد" });
                }}
              />
            </View>
          </View>
          {w.custom ? null : (
            <Text className="text-[11px] text-muted mt-2">اللون الافتراضي: {DEFAULT_TYPE_COLORS[type]}</Text>
          )}
        </View>
      ) : null}
    </Card>
  );
}

export default function WorkplacesScreen() {
  useTheme();
  const types = useActiveTypes();
  const workplaces = useSettings((s) => s.workplaces);
  const places = useSettings((s) => s.places);
  const update = useSettings((s) => s.update);
  const [newPlace, setNewPlace] = useState("");
  // يفتح النوع المطلوب مباشرة (من «تعديل هذا النوع» في نموذج الموعد)
  const { type: openType } = useLocalSearchParams<{ type?: string }>();

  const hidden = BUILTIN_TYPES.filter((t) => workplaces[t]?.hidden);
  const freeSlot = CUSTOM_SLOTS.find((t) => !workplaces[t]?.custom);

  const addType = () => {
    if (!freeSlot) {
      Alert.alert("الحد الأقصى", "يمكنك إضافة حتى 8 أماكن عمل مخصّصة. احذف واحدًا أولًا.");
      return;
    }
    update({
      workplaces: {
        ...workplaces,
        [freeSlot]: { custom: true, label: "مكان عمل جديد", short: "جديد", icon: "briefcase", hidden: false },
      },
    });
  };

  const addPlace = () => {
    const p = newPlace.trim();
    if (!p || places.includes(p)) return;
    update({ places: [...places, p] });
    setNewPlace("");
  };

  return (
    <Screen title="أماكن العمل" subtitle="عدّل الأنواع وأضف أماكن جديدة" back>
      <SectionHeader title="الأنواع" />
      {types.map((t) => (
        <TypeEditor key={t} type={t} initialOpen={t === openType} />
      ))}
      <Button label="إضافة مكان عمل" icon="add-circle-outline" variant="soft" onPress={addType} />

      {hidden.length ? (
        <>
          <SectionHeader title="مخفية" />
          <View className="flex-row flex-wrap gap-2">
            {hidden.map((t) => (
              <Chip
                key={t}
                label={`إظهار: ${TYPE_META[t].label}`}
                icon="eye-outline"
                selected={false}
                color="#475569"
                onPress={() => update({ workplaces: { ...workplaces, [t]: { ...workplaces[t], hidden: false } } })}
              />
            ))}
          </View>
        </>
      ) : null}

      <SectionHeader title="الأماكن المعروفة" />
      <Card>
        <Text className="text-xs text-muted mb-3">تظهر كاختيارات سريعة عند إنشاء حدث. الأساسي مشفى حماه الوطني.</Text>
        <View className="flex-row flex-wrap gap-2 mb-3">
          {places.map((p) => (
            <Pressable
              key={p}
              onLongPress={() =>
                Alert.alert("حذف المكان", p, [
                  { text: "إلغاء", style: "cancel" },
                  { text: "حذف", style: "destructive", onPress: () => update({ places: places.filter((x) => x !== p) }) },
                ])
              }
              className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5 bg-slate-100"
            >
              <Ionicons name="location-outline" size={14} color="#475569" />
              <Text w="semi" className="text-xs">
                {p}
              </Text>
            </Pressable>
          ))}
        </View>
        <View className="flex-row gap-2 items-center">
          <TextInput
            value={newPlace}
            onChangeText={setNewPlace}
            onSubmitEditing={addPlace}
            placeholder="اسم مكان جديد"
            placeholderTextColor="#94A3B8"
            style={{
              flex: 1,
              fontFamily: "Cairo_400Regular",
              fontSize: 15,
              backgroundColor: "#F8FAFC",
              borderWidth: 1,
              borderColor: "#E3E6EB",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 8,
              textAlign: inputAlign(),
            }}
          />
          <Pressable onPress={addPlace} className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: "#0E6FA5" }}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
        <Text className="text-[11px] text-muted mt-2">اضغط مطوّلًا على مكان لحذفه.</Text>
      </Card>
    </Screen>
  );
}
