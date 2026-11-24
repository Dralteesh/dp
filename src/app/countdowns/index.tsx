import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { Fab } from "@/components/ui/Fab";
import { CountdownCard } from "@/components/countdown/CountdownCard";
import { DS, surface } from "@/design/tokens";
import { NightShell, RoundButton, SoftChip } from "@/design/kit";
import { useCdMode } from "@/hooks/useCdMode";
import { useTicker } from "@/hooks/useTicker";
import { matchesFilter, nearestUpcoming, sortCountdowns } from "@/lib/countdown/engine";
import { BILLING_ENABLED, FREE_LIMITS, usePro } from "@/lib/countdown/entitlements";
import { compactOf, viewOf } from "@/lib/countdown/format";
import { inputAlign } from "@/lib/rtl";
import { useCountdowns } from "@/store/useCountdowns";
import type { CdFilter, CdSort, CdThemeMode } from "@/types/countdown";

const FILTERS: { v: CdFilter; l: string }[] = [
  { v: "all", l: "الكل" },
  { v: "upcoming", l: "القادمة" },
  { v: "past", l: "الماضية" },
  { v: "favorite", l: "المفضلة" },
  { v: "repeating", l: "المتكررة" },
];
const SORTS: { v: CdSort; l: string }[] = [
  { v: "nearest", l: "الأقرب" },
  { v: "newest", l: "الأحدث" },
  { v: "favorite", l: "المفضلة" },
  { v: "name", l: "الاسم" },
];
const NEXT_THEME: Record<CdThemeMode, CdThemeMode> = { auto: "light", light: "dark", dark: "auto" };
const THEME_ICON = { auto: "contrast-outline", light: "sunny-outline", dark: "moon-outline" } as const;

export default function CountdownsScreen() {
  const router = useRouter();
  const mode = useCdMode();
  const s = surface(mode);
  const pro = usePro();
  const items = useCountdowns((x) => x.items);
  const sort = useCountdowns((x) => x.sort);
  const theme = useCountdowns((x) => x.theme);
  const setPrefs = useCountdowns((x) => x.setPrefs);
  const togglePin = useCountdowns((x) => x.togglePin);
  const toggleFav = useCountdowns((x) => x.toggleFavorite);
  const now = useTicker(60_000);
  const [filter, setFilter] = useState<CdFilter>("all");
  const [q, setQ] = useState("");

  const data = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = items.filter(
      (c) => matchesFilter(c, filter, now) && (!needle || `${c.title} ${c.description ?? ""}`.toLowerCase().includes(needle)),
    );
    return sortCountdowns(list, sort, now);
  }, [items, filter, q, sort, now]);

  const near = useMemo(() => nearestUpcoming(items, now), [items, now]);
  const nearView = near ? viewOf(near.cd, now) : null;
  const upcomingCount = useMemo(() => items.filter((c) => matchesFilter(c, "upcoming", now)).length, [items, now]);

  const add = () => {
    if (BILLING_ENABLED && !pro && items.length >= FREE_LIMITS.counters) {
      Alert.alert("وصلت للحد المجاني", `النسخة المجانية تتسع لـ ${FREE_LIMITS.counters} عدّادات. اشترك لإضافة عدد غير محدود.`);
      return;
    }
    router.push("/countdowns/edit");
  };

  const stat = (label: string, value: string, hint?: string) => (
    <View style={{ flex: 1, backgroundColor: s.card, borderRadius: DS.rInner, padding: 12, borderWidth: mode === "night" ? 1 : 0, borderColor: s.border }}>
      <Text style={{ color: s.soft, fontSize: 11 }}>{label}</Text>
      <Text w="bold" numberOfLines={1} style={{ color: s.text, fontSize: 18, lineHeight: 28 }}>
        {value}
      </Text>
      {hint ? (
        <Text numberOfLines={1} style={{ color: s.soft, fontSize: 11 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );

  const header = (
    <View style={{ gap: 12, marginBottom: 4 }}>
      {items.length > 0 ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          {stat("أقرب حدث", near ? near.cd.title || "لحظة" : "—", near ? compactOf(near.cd, now).caption : undefined)}
          {stat("الأيام المتبقية", nearView && nearView.state === "upcoming" ? String(nearView.totalDays) : "—", `${upcomingCount} قادمة`)}
          {stat("الوقت المنقضي", nearView?.progress != null ? `${Math.floor(nearView.progress * 100)}%` : "—", "للأقرب")}
        </View>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: s.card, borderRadius: DS.rInner, paddingHorizontal: 12, borderWidth: mode === "night" ? 1 : 0, borderColor: s.border }}>
        <Ionicons name="search" size={18} color={s.soft} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="ابحث في لحظاتك"
          placeholderTextColor={s.soft}
          style={{ flex: 1, color: s.text, fontFamily: "Cairo_400Regular", fontSize: 15, paddingVertical: 10, textAlign: inputAlign() }}
        />
        {q ? (
          <Pressable onPress={() => setQ("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={s.soft} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {FILTERS.map((f) => (
          <SoftChip key={f.v} label={f.l} selected={filter === f.v} onPress={() => setFilter(f.v)} mode={mode} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: "center" }}>
        <Ionicons name="swap-vertical" size={16} color={s.soft} />
        {SORTS.map((o) => (
          <SoftChip key={o.v} label={o.l} selected={sort === o.v} onPress={() => setPrefs({ sort: o.v })} mode={mode} />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <NightShell
      title="لحظاتي"
      mode={mode}
      right={
        <View style={{ flexDirection: "row", gap: 8 }}>
          <RoundButton icon={THEME_ICON[theme]} label="تبديل المظهر" mode={mode} onPress={() => setPrefs({ theme: NEXT_THEME[theme] })} />
          <RoundButton icon="cloud-upload-outline" label="نسخ احتياطي" mode={mode} onPress={() => router.push("/countdowns/backup")} />
        </View>
      }
    >
      <FlatList
        data={data}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 140 }}
        renderItem={({ item }) => (
          <CountdownCard
            cd={item}
            onPress={() => router.push({ pathname: "/countdowns/[id]", params: { id: item.id } })}
            onLongPress={() =>
              Alert.alert(item.title || "لحظة", undefined, [
                { text: item.pinned ? "إلغاء التثبيت" : "تثبيت في الأعلى", onPress: () => togglePin(item.id) },
                { text: item.favorite ? "إزالة من المفضلة" : "إضافة للمفضلة", onPress: () => toggleFav(item.id) },
                { text: "تعديل", onPress: () => router.push({ pathname: "/countdowns/edit", params: { id: item.id } }) },
                { text: "إغلاق", style: "cancel" },
              ])
            }
          />
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 48, gap: 8 }}>
            <Text style={{ fontSize: 44, lineHeight: 60 }}>⏳</Text>
            <Text w="bold" style={{ color: s.text, fontSize: 17 }}>
              {items.length === 0 ? "ابدأ بأول لحظة" : "لا نتائج"}
            </Text>
            <Text style={{ color: s.soft, textAlign: "center", fontSize: 13 }}>
              {items.length === 0 ? "عيد ميلاد، سفر، امتحان، أو أي لحظة تنتظرها. اضغط + للإضافة." : "جرّب تصنيفًا آخر أو عبارة بحث مختلفة."}
            </Text>
          </View>
        }
      />
      <Fab onPress={add} bottom={28} color={DS.accent} />
    </NightShell>
  );
}
