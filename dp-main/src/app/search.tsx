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
type Dest = { title: string; hint: string; icon: Icon; href: string; words: string; hex?: string; soft?: string };

/** كل الشاشات القابلة للوصول بالبحث (words = كلمات مرادفة لتحسين المطابقة) */
const DESTS: Dest[] = [
  { title: "التقويم", hint: "الأسبوع والشهر", icon: "calendar", href: "/calendar", words: "تقويم جدول شهر اسبوع مواعيد", hex: "#0E6FA5", soft: "#D6EBF7" },
  { title: "المهام", hint: "كل المهام", icon: "checkbox", href: "/tasks", words: "مهام مهمه تاسك قائمه", hex: "#16A34A", soft: "#DCFCE7" },
  { title: "الملاحظات", hint: "ملاحظات مثبّتة وملوّنة", icon: "create", href: "/notes", words: "ملاحظات ملاحظه نوت مذكره", hex: "#CA8A04", soft: "#FEF3C7" },
  { title: "المستندات", hint: "PDF وWord وExcel وصور", icon: "document-text", href: "/documents", words: "مستندات ملفات وثائق pdf word excel", hex: "#0E6FA5", soft: "#D6EBF7" },
  { title: "أماكن العمل", hint: "أنواع الدوام والمناوبة", icon: "briefcase", href: "/workplaces", words: "اماكن عمل دوام مناوبه مشفى نوع", hex: "#EA580C", soft: "#FFEDD5" },
  { title: "دخلي الشهري", hint: "الراتب والدوامات وصافي العيادة", icon: "cash", href: "/income", words: "دخل راتب اجور شهري ارباح", hex: "#16A34A", soft: "#DCFCE7" },
  { title: "جدولة الدوامات", hint: "املأ الشهر بالدوامات", icon: "calendar-number", href: "/shifts-bulk", words: "جدوله دوامات مناوبات شهر تكرار نمط", hex: "#7C3AED", soft: "#EDE9FE" },
  { title: "قائمة الأسعار", hint: "العيادة", icon: "pricetags", href: "/clinic/prices", words: "اسعار قائمه تسعيره اجرة" },
  { title: "قائمة الانتظار", hint: "العيادة", icon: "hourglass", href: "/clinic/waitlist", words: "انتظار قائمه مرضى موعد شاغر" },
  { title: "تعديل الإجراءات", hint: "العيادة", icon: "construct", href: "/clinic/procedures", words: "اجراءات علاج ايقونات مدة كتالوج حشوة" },
  { title: "سجل التعقيم", hint: "العيادة", icon: "flask", href: "/clinic/sterilization", words: "تعقيم اوتوكلاف سجل اختبار اسبور" },
  { title: "الإعدادات", hint: "الصلاة، التذكيرات، العملة", icon: "settings", href: "/settings", words: "اعدادات الصلاه تذكير عمله اسم" },
  { title: "تذكيرات الصلاة والأذكار", hint: "قبل الأذان وبعده والأذكار", icon: "moon", href: "/reminders-prayer", words: "تذكيرات صلاه اذكار اذان تكرار صليت" },
  { title: "المظهر والشعارات", hint: "ألوان الأنواع وشعار العيادة", icon: "color-palette", href: "/appearance", words: "مظهر الوان لون شعار اسم التطبيق" },
  { title: "الحساب والمزامنة", hint: "نسخ سحابي ومزامنة", icon: "cloud", href: "/account", words: "حساب مزامنه سحابه تسجيل دخول" },
  { title: "الأمان والنسخ الاحتياطي", hint: "قفل التطبيق وتصدير البيانات", icon: "shield-checkmark", href: "/security", words: "امان نسخ احتياطي قفل بصمه تصدير استعاده" },
  { title: "الأدوات المصغرة والساعة", hint: "ودجت وXiaomi Watch", icon: "watch", href: "/connect", words: "ودجت اداه مصغره ساعه شاومي اشعارات" },
  { title: "دليل الأدوية", hint: "العيادة", icon: "medkit", href: "/clinic/drugs", words: "ادويه دواء وصفه" },
  { title: "المصاريف", hint: "العيادة", icon: "cash", href: "/clinic/expenses", words: "مصاريف مصروف ايجار" },
  { title: "التقارير", hint: "العيادة", icon: "bar-chart", href: "/clinic/reports", words: "تقارير ارباح دخل" },
  { title: "المخزون", hint: "العيادة", icon: "cube", href: "/clinic/inventory", words: "مخزون مواد نقص" },
  { title: "المتابعات والاستدعاء", hint: "العيادة", icon: "chatbubbles", href: "/clinic/followups", words: "متابعه استدعاء واتساب تذكير" },
  { title: "استيراد من البرنامج السابق", hint: "الإعدادات ← البيانات • ملف JSON", icon: "download", href: "/clinic/import", words: "استيراد json برنامج سابق نقل" },
];

/** تطبيع عربي: أ إ آ←ا، ة←ه، ى←ي، إزالة التشكيل، وأحرف صغيرة */
const norm = (s: string) =>
  s
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .toLowerCase();

const MAX_RESULTS = 12;
/** الشاشات المعروضة عند الفراغ */
const QUICK = DESTS.slice(0, 6);

/** البحث الشامل: شاشات وإعدادات ومرضى (بالاسم أو الهاتف) */
export default function SearchScreen() {
  const router = useRouter();
  const patients = useClinic((s) => s.patients);
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const k = norm(q.trim());
    if (!k) return [];
    const out: { key: string; title: string; hint: string; icon: Icon; go: () => void }[] = [];
    for (const d of DESTS) {
      if (norm(`${d.title} ${d.hint} ${d.words}`).includes(k)) {
        out.push({ key: d.href, title: d.title, hint: d.hint, icon: d.icon, go: () => router.push(d.href as never) });
      }
    }
    for (const p of patients) {
      if (norm(p.name).includes(k) || (p.phone ?? "").includes(q.trim())) {
        out.push({
          key: `p:${p.id}`,
          title: p.name,
          hint: p.phone ? `مريض • ${p.phone}` : "مريض",
          icon: "person",
          go: () => router.push({ pathname: "/clinic/patient/[id]", params: { id: p.id } }),
        });
      }
    }
    return out.slice(0, MAX_RESULTS);
  }, [q, patients, router]);

  return (
    <Screen title="بحث" back>
      <View className="flex-row items-center gap-2 bg-surface border border-line rounded-2xl px-3 mb-4">
        <Ionicons name="search" size={18} color="#94A3B8" />
        <TextInput
          autoFocus
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
          {QUICK.map((t) => (
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
