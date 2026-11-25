import { useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { PRIORITY_META, TYPE_META } from "@/constants/shiftTypes";
import { relativeDay, todayISO } from "@/lib/dates";
import type { Task } from "@/types";

type Props = {
  tasks: Task[];
  onToggle: (id: string) => void;
  onOpen: () => void;
};

const OVERLAP = 30;

/** لون البطاقة: نوع المهمة إن وُجد وإلا لون الأولوية */
const colorOf = (t: Task) => (t.type ? TYPE_META[t.type].hex : t.priority === "high" ? "#DC2626" : t.priority === "low" ? "#5B8FA8" : "#0E6FA5");

/**
 * مهام اليوم كبطاقات ملوّنة متراكبة. الضغط على بطاقة يفتحها عموديًا
 * لتُظهر التفاصيل والأزرار، وتبقى البقية متراكبة تحتها.
 */
export function TaskStack({ tasks, onToggle, onOpen }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const today = todayISO();

  return (
    <View style={{ paddingBottom: OVERLAP }}>
      {tasks.map((t, i) => {
        const bg = colorOf(t);
        const isOpen = open === t.id;
        const overdue = !!t.dueDate && t.dueDate < today;
        return (
          <Animated.View
            key={t.id}
            layout={LinearTransition.springify().damping(20)}
            entering={FadeIn.duration(200)}
            style={{ marginTop: i === 0 ? 0 : -OVERLAP, zIndex: isOpen ? 100 : i + 1 }}
          >
            <Pressable
              onPress={() => setOpen(isOpen ? null : t.id)}
              accessibilityLabel={t.title}
              style={{
                backgroundColor: bg,
                borderRadius: 28,
                paddingHorizontal: 18,
                paddingTop: 16,
                paddingBottom: isOpen ? 16 : 16 + OVERLAP * (i === tasks.length - 1 ? 0 : 0),
                minHeight: isOpen ? undefined : 92,
                shadowColor: "#000",
                shadowOpacity: 0.18,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: -2 },
                elevation: 3 + i,
              }}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1" style={{ paddingEnd: 10 }}>
                  <Text w="bold" className="text-lg" numberOfLines={isOpen ? 4 : 1} style={{ color: "#FFFFFF" }}>
                    {t.title}
                  </Text>
                  <View className="flex-row flex-wrap items-center gap-2 mt-2">
                    <View className="flex-row items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: "rgba(255,255,255,0.22)" }}>
                      <Ionicons name={overdue ? "alert-circle" : "calendar-outline"} size={13} color="#FFFFFF" />
                      <Text className="text-xs" style={{ color: "#FFFFFF" }}>
                        {t.dueDate ? (overdue ? `متأخرة • ${relativeDay(t.dueDate)}` : relativeDay(t.dueDate)) : "بلا موعد"}
                      </Text>
                    </View>
                    <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: "rgba(0,0,0,0.22)" }}>
                      <Text className="text-xs" style={{ color: "#FFFFFF" }}>
                        {PRIORITY_META[t.priority].label}
                      </Text>
                    </View>
                  </View>
                </View>
                <Pressable
                  hitSlop={10}
                  onPress={() => onToggle(t.id)}
                  accessibilityLabel="إنجاز المهمة"
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#171717", alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="checkmark" size={22} color="#FFFFFF" />
                </Pressable>
              </View>

              {isOpen ? (
                <Animated.View entering={FadeIn.duration(220)} className="mt-4">
                  <View className="rounded-2xl p-3" style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
                    <Text className="text-xs" style={{ color: "rgba(255,255,255,0.85)" }}>
                      {t.type ? `النوع: ${TYPE_META[t.type].label}` : "مهمة عامة"}
                      {t.dueDate ? `  •  الاستحقاق: ${t.dueDate}` : ""}
                    </Text>
                  </View>
                  <View className="flex-row gap-2 mt-3">
                    <Pressable onPress={() => onToggle(t.id)} className="flex-1 rounded-full py-3 items-center" style={{ backgroundColor: "#171717" }}>
                      <Text w="semi" style={{ color: "#FFFFFF" }}>
                        تمّت
                      </Text>
                    </Pressable>
                    <Pressable onPress={onOpen} className="flex-1 rounded-full py-3 items-center" style={{ backgroundColor: "rgba(255,255,255,0.25)" }}>
                      <Text w="semi" style={{ color: "#FFFFFF" }}>
                        تعديل
                      </Text>
                    </Pressable>
                  </View>
                </Animated.View>
              ) : null}
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}
