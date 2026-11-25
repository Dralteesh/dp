import { ToolsSheet, type Tool } from "@/components/ui/ToolsSheet";
import { useSettings } from "@/store/useSettings";

/** كل ما يمكن وضعه في نافذة أدوات الصلاة */
const PRAYER_TOOLS: Tool[] = [
  { id: "qibla", label: "القبلة", icon: "compass", path: "/qibla" },
  { id: "quran", label: "القرآن", icon: "book", path: "/quran" },
  { id: "stats", label: "الإحصاءات", icon: "stats-chart", path: "/prayer-stats" },
  { id: "mosque", label: "مسجدي", icon: "business", path: "/mosque" },
  { id: "reminders", label: "تذكيرات الصلاة", icon: "alarm", path: "/reminders-prayer" },
  { id: "adhkar", label: "الأذكار", icon: "sparkles", path: "/reminders-prayer", params: { only: "dhikr" } },
  { id: "settings", label: "إعدادات الصلاة", icon: "settings", path: "/prayer-settings" },
];
const DEFAULT_IDS = ["qibla", "quran", "stats"];

/** أدوات الصلاة (ضغط مطوّل على تبويب الصلاة) */
export function PrayerToolsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const saved = useSettings((s) => s.prayerTools);
  const update = useSettings((s) => s.update);
  return (
    <ToolsSheet
      visible={visible}
      onClose={onClose}
      title="أدوات الصلاة"
      tools={PRAYER_TOOLS}
      defaultIds={DEFAULT_IDS}
      saved={saved}
      onSave={(ids) => update({ prayerTools: ids })}
    />
  );
}
