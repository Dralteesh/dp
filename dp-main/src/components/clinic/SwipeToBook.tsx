import { useRef, type ReactNode } from "react";
import { Pressable } from "react-native";
import ReanimatedSwipeable, { type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";

/** يلفّ عنصرًا: السحب الجانبي (في أي اتجاه) يُظهر زر «موعد» لحجز موعد لهذا المريض */
export function SwipeToBook({ children, onBook }: { children: ReactNode; onBook: () => void }) {
  const ref = useRef<SwipeableMethods>(null);
  const action = () => (
    <Pressable
      onPress={() => {
        ref.current?.close();
        onBook();
      }}
      accessibilityLabel="إضافة موعد"
      style={{
        width: 84,
        marginVertical: 0,
        borderRadius: 16,
        backgroundColor: TYPE_META.private.hex,
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: 4,
      }}
    >
      <Ionicons name="calendar" size={22} color={TYPE_META.private.onSolid} />
      <Text w="bold" className="text-xs mt-0.5" style={{ color: TYPE_META.private.onSolid }}>
        + موعد
      </Text>
    </Pressable>
  );
  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={action}
      renderRightActions={action}
    >
      {children}
    </ReanimatedSwipeable>
  );
}
