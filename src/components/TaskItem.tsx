import { Pressable, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeOutLeft,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { PRIORITY_META, TYPE_META } from "@/constants/shiftTypes";
import { relativeDay, todayISO } from "@/lib/dates";
import type { Task } from "@/types";

type Props = {
  task: Task;
  onToggle: () => void;
  onPress: () => void;
};

/** مهمة: مربّع إكمال متحرّك + عنوان + موعد + أولوية */
export function TaskItem({ task, onToggle, onPress }: Props) {
  const pop = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const overdue = !!task.dueDate && !task.done && task.dueDate < todayISO();
  const typeHex = task.type ? TYPE_META[task.type].hex : undefined;

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutLeft.duration(180)}
      layout={LinearTransition.springify().damping(18)}
    >
      <Pressable
        onPress={onPress}
        className="flex-row items-center gap-3 bg-surface rounded-2xl border border-line px-3 py-3 mb-2"
      >
        <Pressable
          hitSlop={8}
          onPress={() => {
            pop.value = withSequence(withSpring(1.3, { damping: 8 }), withSpring(1));
            onToggle();
          }}
        >
          <Animated.View
            style={[
              popStyle,
              {
                width: 28,
                height: 28,
                borderRadius: 14,
                borderWidth: 2,
                borderColor: task.done ? "#16A34A" : typeHex ?? "#CBD5E1",
                backgroundColor: task.done ? "#16A34A" : "transparent",
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            {task.done ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
          </Animated.View>
        </Pressable>

        <View className="flex-1">
          <Text
            w="semi"
            numberOfLines={2}
            style={{
              textDecorationLine: task.done ? "line-through" : "none",
              color: task.done ? "#94A3B8" : "#0F172A",
            }}
          >
            {task.title}
          </Text>
          {task.dueDate ? (
            <Text
              className="text-xs mt-0.5"
              style={{ color: overdue ? "#DC2626" : "#64748B" }}
            >
              {overdue ? "متأخرة • " : ""}
              {relativeDay(task.dueDate)}
            </Text>
          ) : null}
        </View>

        {typeHex ? (
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: typeHex }} />
        ) : null}
        {task.priority === "high" && !task.done ? (
          <Ionicons name="flag" size={16} color={PRIORITY_META.high.hex} />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}
