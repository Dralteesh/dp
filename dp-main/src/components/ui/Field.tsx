import type { ReactNode } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { Text } from "@/components/ui/Text";
import { inputAlign } from "@/lib/rtl";

type Props = TextInputProps & {
  label?: string;
  hint?: string;
};

/** حقل إدخال بعنوان */
export function Field({ label, hint, style, ...rest }: Props) {
  return (
    <View className="mb-3">
      {label ? (
        <Text w="semi" className="text-sm text-slate-600 mb-1.5">
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor="#94A3B8"
        {...rest}
        style={[
          {
            fontFamily: "Cairo_400Regular",
            fontSize: 16,
            color: "#0F172A",
            backgroundColor: "#F8FAFC",
            borderWidth: 1,
            borderColor: "#E3E6EB",
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            textAlign: inputAlign(),
            minHeight: rest.multiline ? 90 : undefined,
            textAlignVertical: rest.multiline ? "top" : "center",
          },
          style,
        ]}
      />
      {hint ? <Text className="text-xs text-muted mt-1">{hint}</Text> : null}
    </View>
  );
}

/** صف بعنوان لأي محتوى (مثل مجموعة Chips) */
export function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="mb-3">
      <Text w="semi" className="text-sm text-slate-600 mb-1.5">
        {label}
      </Text>
      {children}
    </View>
  );
}
