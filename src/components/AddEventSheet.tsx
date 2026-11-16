import { View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui/PressableScale";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { SHIFT_TYPES, TYPE_META } from "@/constants/shiftTypes";
import { fmtDateLong } from "@/lib/dates";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  visible: boolean;
  date: string;
  onClose: () => void;
};

/** نافذة اختيار نوع الحدث الجديد (أربعة أزرار كبيرة بألوان الأنواع) */
export function AddEventSheet({ visible, date, onClose }: Props) {
  useTheme();
  const router = useRouter();
  return (
    <Sheet visible={visible} onClose={onClose} title={`إضافة في ${fmtDateLong(date)}`}>
      <View className="flex-row flex-wrap gap-3">
        {SHIFT_TYPES.map((t) => {
          const m = TYPE_META[t];
          return (
            <PressableScale
              key={t}
              containerClassName="w-[48%]"
              className="rounded-2xl p-4 gap-2"
              style={{ backgroundColor: m.hex }}
              onPress={() => {
                onClose();
                router.push({ pathname: "/event/[id]", params: { id: "new", type: t, date } });
              }}
            >
              <Ionicons name={m.icon} size={28} color={m.onSolid} />
              <Text w="bold" style={{ color: m.onSolid }}>
                {m.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </Sheet>
  );
}
