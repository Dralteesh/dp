import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CLINIC_TOOLS } from "@/components/clinic/ClinicToolsSheet";
import { PCard, PlannerShell, SectionTitle } from "@/components/planner/kit";
import { Text } from "@/components/ui/Text";
import { PL } from "@/design/planner";
import { useLayout } from "@/hooks/useLayout";
import { switchUi } from "@/lib/ui";
import { useQuickAdd } from "@/store/useQuickAdd";

type Item = { label: string; icon: string; path: string; params?: Record<string, string> };

const CLINIC: Item[] = [
  { label: "المالية", icon: "cash", path: "/planner/money" },
  ...CLINIC_TOOLS.map((t) => ({ label: t.label, icon: t.icon, path: t.path, params: t.params })),
  { label: "استيراد JSON", icon: "cloud-download", path: "/clinic/import" },
];

const APP: Item[] = [
  { label: "الصلاة", icon: "moon", path: "/prayer" },
  { label: "المنبّه", icon: "alarm", path: "/alarms" },
  { label: "الطقس", icon: "partly-sunny", path: "/weather" },
  { label: "التقويم", icon: "calendar", path: "/calendar" },
  { label: "المهام", icon: "checkbox", path: "/calendar", params: { section: "tasks" } },
  { label: "المستندات", icon: "document-text", path: "/documents" },
  { label: "الملاحظات", icon: "create", path: "/notes" },
  { label: "العدّادات", icon: "hourglass", path: "/countdowns" },
  { label: "المعرفة", icon: "library", path: "/knowledge" },
  { label: "أماكني", icon: "location", path: "/places" },
  { label: "دخلي الشهري", icon: "wallet", path: "/income" },
  { label: "النوم", icon: "bed", path: "/sleep" },
  { label: "القرآن", icon: "book", path: "/quran" },
  { label: "القبلة", icon: "compass", path: "/qibla" },
  { label: "مسجدي", icon: "business", path: "/mosque" },
  { label: "ملفات ZIM", icon: "archive", path: "/zim" },
  { label: "المناوبات", icon: "time", path: "/shifts-bulk" },
  { label: "أماكن العمل", icon: "briefcase", path: "/workplaces" },
  { label: "بحث شامل", icon: "search", path: "/search" },
];

function Tile({ it, cols }: { it: Item; cols: number }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push((it.params ? { pathname: it.path, params: it.params } : it.path) as never)}
      accessibilityLabel={it.label}
      style={{ width: `${100 / cols - 2}%`, flexGrow: 1 }}
    >
      <PCard style={{ alignItems: "center", paddingVertical: 14, paddingHorizontal: 6, gap: 6, minHeight: 92 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: PL.white, borderWidth: 1, borderColor: PL.border, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={it.icon as never} size={22} color={PL.blue} />
        </View>
        <Text w="semi" numberOfLines={2} style={{ fontSize: 11.5, color: PL.navy, textAlign: "center" }}>
          {it.label}
        </Text>
      </PCard>
    </Pressable>
  );
}

function Grid({ items, cols }: { items: Item[]; cols: number }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {items.map((it) => (
        <Tile key={it.label + it.path} it={it} cols={cols} />
      ))}
    </View>
  );
}

/** الأدوات (الواجهة الجديدة): كل أدوات العيادة وأقسام التطبيق في مكان واحد */
export default function PlannerTools() {
  const { isWide } = useLayout();
  const cols = isWide ? 6 : 3;
  const showQuickAdd = useQuickAdd((s) => s.show);
  return (
    <PlannerShell title="الأدوات" nav="tools" maxWidth={1000}>
      <Pressable
        onPress={() => showQuickAdd()}
        style={{ backgroundColor: PL.navy, borderRadius: 999, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        <Ionicons name="add-circle" size={22} color="#fff" />
        <Text w="bold" style={{ color: "#fff" }}>
          إضافة سريعة
        </Text>
      </Pressable>

      <SectionTitle title="أدوات العيادة" />
      <Grid items={CLINIC} cols={cols} />

      <SectionTitle title="أقسام التطبيق" />
      <Grid items={APP} cols={cols} />

      <Pressable
        onPress={() => switchUi("classic")}
        style={{ marginTop: 20, borderWidth: 2, borderColor: PL.blue, borderRadius: 999, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        <Ionicons name="swap-horizontal" size={20} color={PL.blue} />
        <Text w="bold" style={{ color: PL.blue }}>
          الانتقال إلى الواجهة الكلاسيكية
        </Text>
      </Pressable>
      <Text style={{ textAlign: "center", color: PL.muted, fontSize: 11.5, marginTop: 6 }}>
        الواجهة الكلاسيكية متاحة دائمًا للطوارئ أو متى شئت
      </Text>
    </PlannerShell>
  );
}
