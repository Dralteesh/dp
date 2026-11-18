import { View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui/PressableScale";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { useActiveTypes } from "@/hooks/useActiveTypes";
import { useTheme } from "@/hooks/useTheme";
import { todayISO } from "@/lib/dates";
import { useQuickAdd } from "@/store/useQuickAdd";

/** نافذة الإضافة السريعة: أحداث (حسب أنواعك) + مهمة + ملاحظة + مريض + شجرة تركيز */
export function QuickAddSheet() {
  useTheme();
  const router = useRouter();
  const types = useActiveTypes();
  const { open, date, hide } = useQuickAdd();
  const day = date ?? todayISO();

  const go = (fn: () => void) => () => {
    hide();
    fn();
  };

  const other: { label: string; icon: keyof typeof Ionicons.glyphMap; to: string }[] = [
    { label: "مهمة", icon: "checkbox-outline", to: "/tasks" },
    { label: "ملاحظة", icon: "create-outline", to: "/notes" },
    { label: "مريض جديد", icon: "person-add-outline", to: "/clinic/patient-form" },
    { label: "موعد عيادة", icon: "calendar-outline", to: "/clinic/appointment-form" },
    { label: "ازرع شجرة", icon: "leaf-outline", to: "/focus" },
  ];

  return (
    <Sheet visible={open} onClose={hide} title="إضافة سريعة">
      <View className="flex-row flex-wrap gap-2.5 mb-3">
        {types.map((t) => {
          const m = TYPE_META[t];
          return (
            <PressableScale
              key={t}
              containerClassName="w-[48.5%]"
              className="rounded-2xl px-3 py-3 flex-row items-center gap-2.5"
              style={{ backgroundColor: m.soft }}
              onPress={go(() => router.push({ pathname: "/event/[id]", params: { id: "new", type: t, date: day } }))}
            >
              <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: m.hex }}>
                <Ionicons name={m.icon} size={18} color={m.onSolid} />
              </View>
              <Text w="semi" className="flex-1 text-sm" style={{ color: m.inkHex }} numberOfLines={2}>
                {m.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      <View className="flex-row flex-wrap gap-2.5">
        {other.map((o) => (
          <PressableScale
            key={o.to}
            containerClassName="w-[31%]"
            className="rounded-2xl py-3 items-center gap-1 bg-bg border border-line"
            onPress={go(() => router.push(o.to as never))}
          >
            <Ionicons name={o.icon} size={22} color="#0F172A" />
            <Text w="semi" className="text-xs">
              {o.label}
            </Text>
          </PressableScale>
        ))}
      </View>
    </Sheet>
  );
}
