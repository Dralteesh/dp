import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PlannerShell, SectionTitle } from "@/components/planner/kit";
import { ToolGrid, type ToolItem } from "@/components/planner/ToolGrid";
import { Text } from "@/components/ui/Text";
import { PL } from "@/design/planner";
import { useLayout } from "@/hooks/useLayout";
import { switchUi } from "@/lib/ui";
import { useQuickAdd } from "@/store/useQuickAdd";

const APP: ToolItem[] = [
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

/** الأدوات (الواجهة الجديدة): أقسام التطبيق في مكان واحد (أدوات العيادة داخل قسم العيادة) */
export default function PlannerTools() {
  const { isWide } = useLayout();
  const cols = isWide ? 6 : 3;
  const showQuickAdd = useQuickAdd((s) => s.show);
  return (
    <PlannerShell title="الأدوات" maxWidth={1000}>
      <Pressable
        onPress={() => showQuickAdd()}
        style={{ backgroundColor: PL.navy, borderRadius: 999, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        <Ionicons name="add-circle" size={22} color="#fff" />
        <Text w="bold" style={{ color: "#fff" }}>
          إضافة سريعة
        </Text>
      </Pressable>

      <SectionTitle title="أقسام التطبيق" />
      <ToolGrid items={APP} cols={cols} />

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
