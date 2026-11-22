import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { QuickAddEditor } from "@/components/quickadd/QuickAddEditor";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/hooks/useTheme";
import { todayISO } from "@/lib/dates";
import { itemLook, useQuickAdd, useQuickAddItems } from "@/store/useQuickAdd";
import type { QuickAddItem } from "@/types";

/** نافذة الإضافة السريعة: شبكة قابلة للتخصيص (أنواع أحداث + اختصارات شاشات) */
export function QuickAddSheet() {
  useTheme();
  const router = useRouter();
  const items = useQuickAddItems();
  const { open, date, hide } = useQuickAdd();
  const day = date ?? todayISO();
  const [editing, setEditing] = useState(false);

  // عند الإغلاق نعود للعرض العادي
  useEffect(() => {
    if (!open) setEditing(false);
  }, [open]);

  const run = (it: QuickAddItem) => {
    hide();
    if (it.kind === "event-type" && it.type) {
      router.push({ pathname: "/event/[id]", params: { id: "new", type: it.type, date: day } });
    } else if (it.route) {
      router.push(it.route as never);
    }
  };

  const shown = items.filter((i) => i.visible);

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => (editing ? setEditing(false) : hide())}>
      {/* Modal على Android يحتاج جذر إيماءات خاصًا به لتعمل السحب */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable
            onPress={hide}
            style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(15,23,42,0.45)" }}
          />
          <View className="bg-surface rounded-t-3xl px-5 pt-3 pb-6" style={{ maxHeight: "90%" }}>
            <View className="self-center w-10 h-1.5 rounded-full bg-slate-300 mb-3" />
            <View className="flex-row items-center justify-between mb-3">
              <Text w="bold" className="text-xl">
                {editing ? "تعديل الإضافة السريعة" : "إضافة سريعة"}
              </Text>
              <Pressable
                onPress={() => setEditing((e) => !e)}
                hitSlop={8}
                className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
                style={{ backgroundColor: editing ? "#0E6FA5" : "#F1F5F9" }}
                accessibilityLabel={editing ? "تم" : "تعديل"}
              >
                <Ionicons name={editing ? "checkmark" : "pencil"} size={15} color={editing ? "#FFFFFF" : "#0F172A"} />
                <Text w="semi" className="text-xs" style={{ color: editing ? "#FFFFFF" : "#0F172A" }}>
                  {editing ? "تم" : "تعديل"}
                </Text>
              </Pressable>
            </View>

            {editing ? (
              <QuickAddEditor items={items} />
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                  {shown.map((it) => {
                    const look = itemLook(it);
                    if (it.kind === "event-type") {
                      return (
                        <PressableScale
                          key={it.id}
                          containerClassName="w-[48.5%]"
                          className="rounded-2xl px-3 py-3 flex-row items-center gap-2.5"
                          style={{ backgroundColor: look.soft }}
                          onPress={() => run(it)}
                        >
                          <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: look.hex }}>
                            <Ionicons name={look.icon as never} size={18} color={look.onSolid} />
                          </View>
                          <Text w="semi" className="flex-1 text-sm" style={{ color: look.ink }} numberOfLines={2}>
                            {look.label}
                          </Text>
                        </PressableScale>
                      );
                    }
                    return (
                      <PressableScale
                        key={it.id}
                        containerClassName="w-[31%]"
                        className="rounded-2xl py-3 items-center gap-1 bg-bg border border-line"
                        onPress={() => run(it)}
                      >
                        <Ionicons name={look.icon as never} size={22} color={it.hex || "#0F172A"} />
                        <Text w="semi" className="text-xs" numberOfLines={1}>
                          {look.label}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
                {shown.length === 0 ? (
                  <Text className="text-muted text-center py-6">لا بنود ظاهرة. اضغط «تعديل» لإظهارها أو إضافة اختصار.</Text>
                ) : null}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}
