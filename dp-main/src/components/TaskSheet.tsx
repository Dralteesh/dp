import { useEffect, useState } from "react";
import { View } from "react-native";
import { DateField } from "@/components/pickers";
import { Button } from "@/components/ui/Button";
import { Chip, TypeSelector } from "@/components/ui/Chip";
import { Field, FieldRow } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { PRIORITY_META } from "@/constants/shiftTypes";
import { usePlanner } from "@/store/usePlanner";
import type { Priority, ShiftType, Task } from "@/types";

type Props = {
  visible: boolean;
  /** المهمة المراد تعديلها، أو undefined لإنشاء جديدة */
  task?: Task;
  onClose: () => void;
};

export function TaskSheet({ visible, task, onClose }: Props) {
  const addTask = usePlanner((s) => s.addTask);
  const updateTask = usePlanner((s) => s.updateTask);
  const removeTask = usePlanner((s) => s.removeTask);

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [type, setType] = useState<ShiftType | undefined>();
  const [dueDate, setDueDate] = useState<string | undefined>();

  useEffect(() => {
    if (visible) {
      setTitle(task?.title ?? "");
      setPriority(task?.priority ?? "normal");
      setType(task?.type);
      setDueDate(task?.dueDate);
    }
  }, [visible, task]);

  const save = () => {
    const t = title.trim();
    if (!t) return;
    if (task) updateTask(task.id, { title: t, priority, type, dueDate });
    else addTask({ title: t, priority, type, dueDate });
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={task ? "تعديل المهمة" : "مهمة جديدة"}>
      <Field label="المهمة" value={title} onChangeText={setTitle} placeholder="ماذا تريد أن تنجز؟" autoFocus={!task} />
      <DateField label="الموعد (اختياري)" value={dueDate} onChange={setDueDate} clearable />
      <FieldRow label="الأولوية">
        <View className="flex-row gap-2">
          {(Object.keys(PRIORITY_META) as Priority[]).map((p) => (
            <Chip
              key={p}
              label={PRIORITY_META[p].label}
              selected={priority === p}
              color={PRIORITY_META[p].hex}
              onPress={() => setPriority(p)}
            />
          ))}
        </View>
      </FieldRow>
      <FieldRow label="النوع (اختياري)">
        <TypeSelector value={type} onChange={setType} allowNone />
      </FieldRow>
      <View className="flex-row gap-3 mt-2">
        <View className="flex-1">
          <Button label="حفظ" icon="checkmark" onPress={save} disabled={!title.trim()} />
        </View>
        {task ? (
          <Button
            label="حذف"
            variant="danger"
            icon="trash-outline"
            onPress={() => {
              removeTask(task.id);
              onClose();
            }}
          />
        ) : null}
      </View>
    </Sheet>
  );
}
