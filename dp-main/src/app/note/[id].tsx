import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TypeSelector } from "@/components/ui/Chip";
import { Text } from "@/components/ui/Text";
import { inputAlign } from "@/lib/rtl";
import { NOTE_COLORS } from "@/constants/noteColors";
import { usePlanner } from "@/store/usePlanner";
import type { ShiftType } from "@/types";

/** محرّر ملاحظة بحفظ تلقائي: يُنشأ السجل عند أول كتابة */
export default function NoteEditor() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const notes = usePlanner((s) => s.notes);
  const addNote = usePlanner((s) => s.addNote);
  const updateNote = usePlanner((s) => s.updateNote);
  const removeNote = usePlanner((s) => s.removeNote);
  const togglePin = usePlanner((s) => s.togglePin);

  const existing = id === "new" ? undefined : notes.find((n) => n.id === id);
  const idRef = useRef<string | undefined>(existing?.id);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [text, setText] = useState(existing?.text ?? "");
  const [color, setColor] = useState(existing?.color ?? "");
  const [type, setType] = useState<ShiftType | undefined>(existing?.type);
  const first = useRef(true);

  // حفظ تلقائي بعد توقف الكتابة
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      if (!title.trim() && !text.trim()) return;
      const patch = { title: title.trim() || undefined, text, color: color || undefined, type };
      if (idRef.current) updateNote(idRef.current, patch);
      else idRef.current = addNote(patch);
    }, 350);
    return () => clearTimeout(t);
  }, [title, text, color, type, addNote, updateNote]);

  const current = idRef.current ? notes.find((n) => n.id === idRef.current) : undefined;

  const del = () => {
    if (!idRef.current) return router.back();
    Alert.alert("حذف الملاحظة", "هل تريد حذفها نهائيًا؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: () => {
          removeNote(idRef.current!);
          router.back();
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: color || "#F2F8FC" }}>
      <View className="flex-row items-center gap-3 px-4 pt-2 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.07)" }}>
          <Ionicons name="arrow-forward" size={20} color="#0F172A" />
        </Pressable>
        <View className="flex-1" />
        <Pressable
          hitSlop={10}
          onPress={() => idRef.current && togglePin(idRef.current)}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.07)" }}
        >
          <Ionicons name={current?.pinned ? "pin" : "pin-outline"} size={20} color="#0E6FA5" />
        </Pressable>
        <Pressable hitSlop={10} onPress={del} className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.07)" }}>
          <Ionicons name="trash-outline" size={20} color="#DC2626" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="العنوان"
          placeholderTextColor="#94A3B8"
          style={{ fontFamily: "Cairo_700Bold", fontSize: 26, color: "#0F172A", textAlign: inputAlign(), paddingVertical: 6 }}
        />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="اكتب ملاحظتك..."
          placeholderTextColor="#94A3B8"
          multiline
          autoFocus={!existing}
          style={{ fontFamily: "Cairo_400Regular", fontSize: 17, lineHeight: 30, color: "#0F172A", textAlign: inputAlign(), minHeight: 280, textAlignVertical: "top" }}
        />

        <Text w="semi" className="text-sm text-slate-600 mt-4 mb-2">
          اللون
        </Text>
        <View className="flex-row gap-3 mb-4">
          {NOTE_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c === "#FFFFFF" ? "" : c)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: c,
                borderWidth: (color || "#FFFFFF") === c ? 3 : 1,
                borderColor: (color || "#FFFFFF") === c ? "#0E6FA5" : "#0B4F73",
              }}
            />
          ))}
        </View>
        <Text w="semi" className="text-sm text-slate-600 mb-2">
          ربط بمكان عمل (اختياري)
        </Text>
        <TypeSelector value={type} onChange={setType} allowNone />
      </ScrollView>
    </SafeAreaView>
  );
}
