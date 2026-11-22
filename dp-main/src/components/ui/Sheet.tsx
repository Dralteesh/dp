import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

/** نافذة سفلية منزلقة */
export function Sheet({ visible, onClose, title, children }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "flex-end" }}
      >
        <Pressable
          onPress={onClose}
          style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(15,23,42,0.45)" }}
        />
        <View
          className="bg-surface rounded-t-3xl px-5 pt-3 pb-6"
          style={{ maxHeight: "88%" }}
        >
          <View className="self-center w-10 h-1.5 rounded-full bg-slate-300 mb-3" />
          {title ? (
            <Text w="bold" className="text-xl mb-3">
              {title}
            </Text>
          ) : null}
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
