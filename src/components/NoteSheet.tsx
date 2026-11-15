import { useEffect, useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/Button";
import { TypeSelector } from "@/components/ui/Chip";
import { Field, FieldRow } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { usePlanner } from "@/store/usePlanner";
import type { Note, ShiftType } from "@/types";

type Props = {
  visible: boolean;
  note?: Note;
  onClose: () => void;
};

export function NoteSheet({ visible, note, onClose }: Props) {
  const addNote = usePlanner((s) => s.addNote);
  const updateNote = usePlanner((s) => s.updateNote);
  const removeNote = usePlanner((s) => s.removeNote);

  const [text, setText] = useState("");
  const [type, setType] = useState<ShiftType | undefined>();

  useEffect(() => {
    if (visible) {
      setText(note?.text ?? "");
      setType(note?.type);
    }
  }, [visible, note]);

  const save = () => {
    const t = text.trim();
    if (!t) return;
    if (note) updateNote(note.id, { text: t, type });
    else addNote({ text: t, type });
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={note ? "تعديل الملاحظة" : "ملاحظة جديدة"}>
      <Field
        value={text}
        onChangeText={setText}
        placeholder="اكتب ملاحظتك..."
        multiline
        autoFocus={!note}
        style={{ minHeight: 140 }}
      />
      <FieldRow label="اللون حسب النوع (اختياري)">
        <TypeSelector value={type} onChange={setType} allowNone />
      </FieldRow>
      <View className="flex-row gap-3 mt-2">
        <View className="flex-1">
          <Button label="حفظ" icon="checkmark" onPress={save} disabled={!text.trim()} />
        </View>
        {note ? (
          <Button
            label="حذف"
            variant="danger"
            icon="trash-outline"
            onPress={() => {
              removeNote(note.id);
              onClose();
            }}
          />
        ) : null}
      </View>
    </Sheet>
  );
}
