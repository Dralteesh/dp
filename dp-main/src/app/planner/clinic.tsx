import { View } from "react-native";
import { CLINIC_TOOLS } from "@/components/clinic/ClinicToolsSheet";
import { PlannerShell, SectionTitle } from "@/components/planner/kit";
import { ToolGrid, type ToolItem } from "@/components/planner/ToolGrid";
import { useLayout } from "@/hooks/useLayout";

const MAIN: ToolItem[] = [
  { label: "جدول العيادة", icon: "calendar", path: "/planner/schedule" },
  { label: "المرضى", icon: "people", path: "/planner/patients" },
  { label: "العلاجات", icon: "medkit", path: "/planner/treatments" },
];

const TOOLS: ToolItem[] = [
  { label: "المالية", icon: "cash", path: "/planner/money" },
  ...CLINIC_TOOLS.map((t) => ({ label: t.label, icon: t.icon, path: t.path, params: t.params })),
  { label: "استيراد JSON", icon: "cloud-download", path: "/clinic/import" },
];

/** العيادة: كل ما يخصها في مكان واحد (الجدول، المرضى، العلاجات، وأدواتها) */
export default function PlannerClinic() {
  const { isWide } = useLayout();
  const cols = isWide ? 6 : 3;
  return (
    <PlannerShell title="العيادة" back maxWidth={1000}>
      <View>
        <ToolGrid items={MAIN} cols={cols} />
      </View>
      <SectionTitle title="أدوات العيادة" />
      <ToolGrid items={TOOLS} cols={cols} />
    </PlannerShell>
  );
}
