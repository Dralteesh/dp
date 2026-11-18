import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui/PressableScale";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { inputAlign } from "@/lib/rtl";
import { useClinic } from "@/store/useClinic";

type Icon = keyof typeof Ionicons.glyphMap;
type Tile = { title: string; icon: Icon; hex: string; soft: string; href: string };

const TILES: Tile[] = [
  { title: "التقويم", icon: "calendar", hex: "#0E6FA5", soft: "#D6EBF7", href: "/calendar" },
  { title: "المهام", icon: "checkbox", hex: "#16A34A", soft: "#DCFCE7", href: "/tasks" },
  { title: "الملاحظات", icon: "create", hex: "#CA8A04", soft: "#FEF3C7", href: "/notes" },
  { title: "المستندات", icon: "document-text", hex: "#7C3AED", soft: "#EDE9FE", href: "/docs" },
  { title: "غابة التركيز", icon: "leaf", hex: "#15803D", soft: "#D9F5E1", href: "/focus" },
  { title: "أماكن العمل", icon: "briefcase", hex: "#EA580C", soft: "#FFEDD5", href: "/workplaces" },
];

/** وجهات إضافية تظهر في البحث فقط (حتى لا تزدحم الشبكة) */
const SEARCH_ONLY: { title: string; hint: string; icon: Icon; href: string; words: string }[] = [
  { title: "الإعدادات", hint: "الصلاة، التذكيرات، العملة", icon: "settings", href: "/settings", words: "اعدادات الصلاة تذكير عملة اسم" },
  { title: "المظهر والشعارات", hint: "ألوان الأنواع وشعار العيادة", icon: "color-palette", href: "/appearance", words: "مظهر الوان لون شعار اسم التطبيق" },
  { title: "الحساب والمزامنة", hint: "نسخ سحابي ومزامنة", icon: "cloud", href: "/account", words: "حساب مزامنة سحابة تسجيل دخول" },
  { title: "الأمان والنسخ الاحتياطي", hint: "قفل التطبيق وتصدير البيانات", icon: "shield-checkmark", href: "/security", words: "امان نسخ احتياطي قفل بصمة تصدير استعادة" },
  { title: "الأدوات المصغرة والساعة", hint: "ودجت وXiaomi Watch", icon: "watch", href: "/connect", words: "ودجت اداة مصغرة ساعة شاومي اشعارات" },
  { title: "دليل الأدوية", hint: "العيادة", icon: "medkit", href: "/clinic/drugs", words: "ادوية دواء وصفة" },
  { title: "المصاريف", hint: "العيادة", icon: "cash", href: "/clinic/expenses", words: "مصاريف مصروف ايجار" },
  { title: "التقارير", hint: "العيادة", icon: "bar-chart", href: "/clinic/reports", words: "تقارير ارباح دخل" },
  { title: "المخزون", hint: "العيادة", icon: "cube", href: "/clinic/inventory", words: "مخزون مواد نقص" },
  { title: "المتابعات والاستدعاء", hint: "العيادة", icon: "chatbubbles", href: "/clinic/followups", words: "متابعة استدعاء واتساب تذكير" },
  { title: "استيراد من البرنامج السابق", hint: "ملف JSON", icon: "download", href: "/clinic/import", words: "استيراد json برنامج سابق نقل" },
];

const norm = (s: string) => s.replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").toLowerCase();

export default function MoreScreen() {
  const router = useRouter();
  const patients = useClinic((s) => s.patients);
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const k = norm(q.trim());
    if (!k) return [];
    const out: { key: string; title: string; hint: string; icon: Icon; go: () => void }[] = [];
    for (const t of TILES)
      if (norm(t.title).includes(k)) out.push({ key: t.href, title: t.title, hint: "", icon: t.icon, go: () => router.push(t.href as never) });
    for (const t of SEARCH_ONLY)
      if (norm(t.title + " " + t.words).includes(k))
        out.push({ key: t.href, title: t.title, hint: t.hint, icon: t.icon, go: () => router.push(t.href as never) });
    for (const p of patients)
      if (norm(p.name).includes(k) || (p.phone ?? "").includes(k))
        out.push({
          key: `p:${p.id}`,
          title: p.name,
          hint: "مريض",
          icon: "person",
          go: () => router.push({ pathname: "/clinic/patient/[id]", params: { id: p.id } }),
        });
    return out.slice(0, 12);
  }, [q, patients, router]);

  return (
    <Screen
      title="المزيد"
      right={
        <Pressable
          onPress={() => router.push("/settings")}
          className="w-10 h-10 rounded-full bg-surface border border-line items-center justify-center"
          accessibilityLabel="الإعدادات"
        >
          <Ionicons name="settings-outline" size={20} color="#0F172A" />
        </Pressable>
      }
    >
      <View className="flex-row items-center gap-2 bg-surface border border-line rounded-2xl px-3 mb-4">
        <Ionicons name="search" size={18} color="#94A3B8" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="ابحث عن شاشة أو إعداد أو مريض"
          placeholderTextColor="#94A3B8"
          style={{ flex: 1, paddingVertical: 12, fontFamily: "Cairo_400Regular", fontSize: 15, textAlign: inputAlign() }}
        />
        {q ? (
          <Pressable onPress={() => setQ("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </Pressable>
        ) : null}
      </View>

      {q.trim() ? (
        results.length ? (
          results.map((r) => (
            <PressableScale
              key={r.key}
              onPress={r.go}
              className="flex-row items-center gap-3 bg-surface border border-line rounded-2xl p-3 mb-2"
            >
              <Ionicons name={r.icon} size={20} color="#0E6FA5" />
              <View className="flex-1">
                <Text w="semi">{r.title}</Text>
                {r.hint ? <Text className="text-xs text-muted">{r.hint}</Text> : null}
              </View>
              <Ionicons name="chevron-back" size={16} color="#94A3B8" />
            </PressableScale>
          ))
        ) : (
          <Text className="text-muted text-center mt-6">لا نتائج</Text>
        )
      ) : (
        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          {TILES.map((t) => (
            <PressableScale
              key={t.href}
              containerClassName="w-[47.5%]"
              className="rounded-3xl p-4 items-start gap-3"
              style={{ backgroundColor: t.soft, minHeight: 112 }}
              onPress={() => router.push(t.href as never)}
            >
              <View className="w-12 h-12 rounded-2xl items-center justify-center" style={{ backgroundColor: t.hex }}>
                <Ionicons name={t.icon} size={24} color="#FFFFFF" />
              </View>
              <Text w="bold" className="text-base" style={{ color: "#0F172A" }}>
                {t.title}
              </Text>
            </PressableScale>
          ))}
        </View>
      )}
    </Screen>
  );
}
