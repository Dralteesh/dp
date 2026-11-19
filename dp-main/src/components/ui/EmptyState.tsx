import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import type { IconName } from "@/constants/shiftTypes";

export function EmptyState({
  icon = "file-tray-outline",
  title,
  hint,
}: {
  icon?: IconName;
  title: string;
  hint?: string;
}) {
  return (
    <View className="items-center py-8 px-6 gap-2">
      <View className="w-14 h-14 rounded-full bg-slate-100 items-center justify-center">
        <Ionicons name={icon} size={26} color="#94A3B8" />
      </View>
      <Text w="semi" className="text-slate-600 text-center">
        {title}
      </Text>
      {hint ? <Text className="text-muted text-sm text-center">{hint}</Text> : null}
    </View>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between mt-5 mb-2">
      <Text w="bold" className="text-lg">
        {title}
      </Text>
      {action ? (
        <Text w="semi" className="text-hospital text-sm" onPress={onAction}>
          {action}
        </Text>
      ) : null}
    </View>
  );
}
