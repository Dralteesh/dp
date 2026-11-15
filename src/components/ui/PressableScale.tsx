import type { ReactNode } from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

type Props = {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /** صنف للحاوية الخارجية (التخطيط: flex-1 ...) */
  containerClassName?: string;
  /** صنف للمحتوى المتحرّك (الشكل: خلفية، حواف ...) */
  className?: string;
  style?: StyleProp<ViewStyle>;
};

/** ضغطة تفاعلية: يتقلّص العنصر قليلًا عند اللمس */
export function PressableScale({
  children,
  onPress,
  onLongPress,
  disabled,
  containerClassName,
  className,
  style,
}: Props) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      className={containerClassName}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 250 });
      }}
    >
      <Animated.View className={className} style={[anim, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
