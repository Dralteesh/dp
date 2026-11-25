import { useMemo } from "react";
import { ToolsSheet, type Tool } from "@/components/ui/ToolsSheet";
import { useSettings } from "@/store/useSettings";

export const CLINIC_TOOLS: Tool[] = [
  { id: "followups", label: "المتابعة والاستدعاء", icon: "logo-whatsapp", path: "/clinic/followups" },
  { id: "drugs", label: "دليل الأدوية", icon: "medkit", path: "/clinic/drugs" },
  { id: "expenses", label: "المصاريف", icon: "wallet", path: "/clinic/expenses" },
  { id: "reports", label: "التقارير", icon: "stats-chart", path: "/clinic/reports" },
  { id: "inventory", label: "المخزون", icon: "cube", path: "/clinic/inventory" },
  { id: "prices", label: "قائمة الأسعار", icon: "pricetags", path: "/clinic/prices" },
  { id: "waitlist", label: "قائمة الانتظار", icon: "hourglass", path: "/clinic/waitlist" },
  { id: "sterilization", label: "سجل التعقيم", icon: "flask", path: "/clinic/sterilization" },
  { id: "installments", label: "الأقساط", icon: "calendar", path: "/clinic/installments" },
  { id: "invoices", label: "الفواتير", icon: "receipt", path: "/clinic/invoices" },
  { id: "insights", label: "إحصاءات", icon: "pie-chart", path: "/clinic/insights" },
  { id: "lab", label: "المخبر", icon: "construct-outline", path: "/clinic/lab" },
  { id: "procedures", label: "تعديل الإجراءات", icon: "construct", path: "/clinic/procedures" },
];
const DEFAULT_IDS = CLINIC_TOOLS.map((t) => t.id);

/** أدوات العيادة المحفوظة بترتيب المستخدم (للصف الأفقي في الرئيسية) */
export function useClinicToolList(): Tool[] {
  const saved = useSettings((s) => s.clinicTools);
  return useMemo(() => {
    const known = new Set(CLINIC_TOOLS.map((t) => t.id));
    const base = saved && Array.isArray(saved) ? saved.filter((i) => known.has(i)) : DEFAULT_IDS;
    return [...new Set(base)].map((id) => CLINIC_TOOLS.find((t) => t.id === id)!);
  }, [saved]);
}

/** أدوات العيادة (ضغط مطوّل على تبويب العيادة): قابلة للإضافة والإزالة والترتيب */
export function ClinicToolsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const saved = useSettings((s) => s.clinicTools);
  const update = useSettings((s) => s.update);
  return (
    <ToolsSheet
      visible={visible}
      onClose={onClose}
      title="أدوات العيادة"
      tools={CLINIC_TOOLS}
      defaultIds={DEFAULT_IDS}
      saved={saved}
      onSave={(ids) => update({ clinicTools: ids })}
    />
  );
}
