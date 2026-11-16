import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/EmptyState";
import { Text } from "@/components/ui/Text";
import { DEFAULT_TYPE_COLORS, PRESETS, SWATCHES, resolveTypeColors } from "@/constants/palette";
import { SHIFT_TYPES, TYPE_META } from "@/constants/shiftTypes";
import { useTheme } from "@/hooks/useTheme";
import { normalizeHex } from "@/lib/color";
import { pickLogo } from "@/lib/logo";
import { useSettings } from "@/store/useSettings";
import type { ShiftType } from "@/types";

function ColorRow({ type }: { type: ShiftType }) {
  const typeColors = useSettings((s) => s.typeColors);
  const update = useSettings((s) => s.update);
  const current = resolveTypeColors(type, typeColors[type]);
  const [draft, setDraft] = useState(current.hex);
  const [open, setOpen] = useState(false);

  const set = (hex: string) => {
    const h = normalizeHex(hex);
    if (!h) return;
    setDraft(h);
    update({ typeColors: { ...typeColors, [type]: h } });
  };

  return (
    <View className="mb-3">
      <Pressable onPress={() => setOpen((o) => !o)} className="flex-row items-center gap-3">
        <View
          className="w-11 h-11 rounded-xl items-center justify-center"
          style={{ backgroundColor: current.hex }}
        >
          <Ionicons name={TYPE_META[type].icon} size={20} color={current.onSolid} />
        </View>
        <View className="flex-1">
          <Text w="semi">{TYPE_META[type].label}</Text>
          <Text className="text-xs text-muted" style={{ writingDirection: "ltr", textAlign: "right" }}>
            {current.hex}
          </Text>
        </View>
        <View className="rounded-lg px-2.5 py-1" style={{ backgroundColor: current.soft }}>
          <Text w="semi" className="text-xs" style={{ color: current.inkHex }}>
            معاينة
          </Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color="#94A3B8" />
      </Pressable>

      {open ? (
        <View className="mt-3">
          <View className="flex-row flex-wrap gap-2 mb-2">
            {SWATCHES.map((c) => (
              <Pressable
                key={c}
                onPress={() => set(c)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: c,
                  borderWidth: current.hex === c ? 3 : 0,
                  borderColor: "#0F172A",
                }}
              />
            ))}
          </View>
          <Field
            label="أو اكتب رمز اللون (Hex)"
            value={draft}
            onChangeText={(v) => {
              setDraft(v);
              if (normalizeHex(v)) set(v);
            }}
            placeholder="#2563EB"
            autoCapitalize="characters"
            autoCorrect={false}
            style={{ textAlign: "left", writingDirection: "ltr" }}
          />
          <Button
            label="إعادة اللون الافتراضي"
            variant="ghost"
            onPress={() => {
              const { [type]: _x, ...rest } = typeColors;
              update({ typeColors: rest });
              setDraft(DEFAULT_TYPE_COLORS[type]);
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

function LogoPicker({
  title,
  hint,
  uri,
  icon,
  onChange,
}: {
  title: string;
  hint: string;
  uri: string;
  icon: "medkit" | "storefront";
  onChange: (v: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const choose = async () => {
    setBusy(true);
    try {
      const v = await pickLogo();
      if (v) onChange(v);
    } catch {
      Alert.alert("تعذّر اختيار الصورة", "تأكد من السماح للتطبيق بالوصول إلى الصور.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <View className="flex-row items-center gap-3 mb-3">
      <Logo uri={uri} size={64} icon={icon} bg={icon === "storefront" ? "#16A34A" : "#0F172A"} app={icon === "medkit"} />
      <View className="flex-1">
        <Text w="semi">{title}</Text>
        <Text className="text-xs text-muted mb-2">{hint}</Text>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button label={busy ? "..." : uri ? "تغيير" : "اختيار صورة"} icon="image" variant="soft" small onPress={choose} />
          </View>
          {uri ? (
            <View className="flex-1">
              <Button label="إزالة" icon="trash-outline" variant="ghost" small onPress={() => onChange("")} />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function AppearanceScreen() {
  useTheme();
  const s = useSettings();
  const typeColors = useSettings((x) => x.typeColors);

  return (
    <Screen title="المظهر والشعارات" back>
      <SectionHeader title="ألوان الأنواع" />
      <Card className="mb-3">
        <Text className="text-xs text-muted mb-3">تُطبَّق فورًا على التقويم والمهام والإضافة السريعة والودجت.</Text>
        <View className="flex-row flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => s.update({ typeColors: p.id === "default" ? {} : { ...p.colors } })}
              className="rounded-xl border border-line px-3 py-2"
            >
              <View className="flex-row gap-1 mb-1">
                {SHIFT_TYPES.map((t) => (
                  <View key={t} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: p.colors[t] }} />
                ))}
              </View>
              <Text w="semi" className="text-xs">
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>
      <Card>
        {SHIFT_TYPES.map((t) => (
          <ColorRow key={`${t}:${typeColors[t] ?? ""}`} type={t} />
        ))}
      </Card>

      <SectionHeader title="التطبيق" />
      <Card>
        <Field
          label="اسم التطبيق (اختياري)"
          value={s.appName}
          onChangeText={(v) => s.update({ appName: v })}
          placeholder="Dentist Planner"
        />
        <LogoPicker
          title="شعار التطبيق"
          hint="الافتراضي: شعار Dentist Planner. يظهر في الشاشة الرئيسية"
          uri={s.logo}
          icon="medkit"
          onChange={(v) => s.update({ logo: v })}
        />
      </Card>

      <SectionHeader title="العيادة الخاصة" />
      <Card>
        <Field
          label="اسم العيادة"
          value={s.clinicName}
          onChangeText={(v) => s.update({ clinicName: v })}
          placeholder="عيادة د. ..."
        />
        <LogoPicker
          title="شعار العيادة"
          hint="يظهر في رأسية العيادة"
          uri={s.clinicLogo}
          icon="storefront"
          onChange={(v) => s.update({ clinicLogo: v })}
        />
      </Card>
      <Text className="text-xs text-muted mt-2 leading-5">
        الألوان والشعارات تُحفظ مع إعداداتك وتُزامَن مع حسابك.
      </Text>
    </Screen>
  );
}
