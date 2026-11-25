import { useRef, useState, type ComponentProps } from "react";
import { Alert, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Field } from "@/components/ui/Field";
import { appendText, dictationAvailable, startDictation, stopDictation, useDictationEvent } from "@/lib/dictation";

type FieldProps = ComponentProps<typeof Field>;

/**
 * حقل نصي مع زر ميكروفون للإملاء الصوتي بالعربية (ar-SA).
 * بدون الحزمة يظهر كحقل عادي تمامًا.
 */
export function DictateField({ value, onChangeText, ...rest }: FieldProps & { value: string; onChangeText: (v: string) => void }) {
  const [on, setOn] = useState(false);
  const base = useRef("");

  useDictationEvent("result", (e: any) => {
    if (!on) return;
    const t: string = e?.results?.[0]?.transcript ?? "";
    const full = appendText(base.current, t);
    onChangeText(full);
    if (e?.isFinal) base.current = full;
  });
  useDictationEvent("end", () => setOn(false));
  useDictationEvent("error", (e: any) => {
    if (!on) return;
    setOn(false);
    if (e?.error && e.error !== "aborted" && e.error !== "no-speech") Alert.alert("تعذّر الإملاء", e?.message ?? String(e.error));
  });

  const toggle = async () => {
    if (on) {
      stopDictation();
      setOn(false);
      return;
    }
    base.current = value ?? "";
    const err = await startDictation("ar-SA");
    if (err) Alert.alert("الإملاء الصوتي", err);
    else setOn(true);
  };

  return (
    <View>
      <Field {...rest} value={value} onChangeText={onChangeText} />
      {dictationAvailable ? (
        <Pressable
          onPress={toggle}
          hitSlop={8}
          style={{ position: "absolute", top: -2, end: 0 }}
          accessibilityLabel="إملاء صوتي"
        >
          <View style={{ backgroundColor: on ? "#DC2626" : "#E2E8F0" }} className="flex-row items-center gap-1.5 rounded-full px-3 py-1">
            <Ionicons name={on ? "stop-circle" : "mic"} size={16} color={on ? "#FFFFFF" : "#334155"} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}
