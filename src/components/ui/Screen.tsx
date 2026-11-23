import { useRef, useState, type ReactNode } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";

type Props = {
  title?: string;
  subtitle?: string;
  /** يعرض زر الرجوع */
  back?: boolean;
  /** عنصر يظهر في طرف الترويسة */
  right?: ReactNode;
  children: ReactNode;
  /** false: بدون ScrollView (للشاشات التي تحتوي قوائم FlatList) */
  scroll?: boolean;
  /** زر عائم أو عناصر مطلقة الموضع */
  overlay?: ReactNode;
  /** شعار يظهر قبل العنوان */
  logo?: ReactNode;
  /** سحب القائمة للأسفل مع تثبيت بسيط ينفّذ هذا الإجراء (مثل إظهار البحث) */
  onPull?: () => void;
};

export function Screen({ title, subtitle, back, right, children, scroll = true, overlay, logo, onPull }: Props) {
  const router = useRouter();
  const [pulling, setPulling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePull = () => {
    if (!onPull) return;
    setPulling(true);
    // تثبيت قصير ليشعر المستخدم بأن السحب مقصود، ثم يظهر البحث
    timer.current = setTimeout(() => {
      setPulling(false);
      onPull();
    }, 450);
  };

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#F4F4F4" }}>
      {(title || back) && (
        <View className="flex-row items-center gap-3 px-4 pt-2 pb-3">
          {back && (
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              className="w-10 h-10 rounded-full bg-surface border border-line items-center justify-center"
            >
              <Ionicons name="arrow-forward" size={20} color="#0F172A" />
            </Pressable>
          )}
          {logo}
          <View className="flex-1">
            {title ? (
              <Text w="bold" className="text-2xl leading-8">
                {title}
              </Text>
            ) : null}
            {subtitle ? <Text className="text-muted text-sm">{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      )}

      {scroll ? (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onPull ? (
              <RefreshControl
                refreshing={pulling}
                onRefresh={handlePull}
                colors={["#0E6FA5"]}
                tintColor="#0E6FA5"
                progressBackgroundColor="#FFFFFF"
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View className="flex-1 px-4">{children}</View>
      )}

      {overlay}
    </SafeAreaView>
  );
}
