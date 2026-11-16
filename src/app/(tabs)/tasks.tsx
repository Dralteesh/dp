import { useMemo, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NoteSheet } from "@/components/NoteSheet";
import { TaskItem } from "@/components/TaskItem";
import { TaskSheet } from "@/components/TaskSheet";
import { Chip, Segmented } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { PressableScale } from "@/components/ui/PressableScale";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { todayISO } from "@/lib/dates";
import { inputAlign } from "@/lib/rtl";
import { usePlanner } from "@/store/usePlanner";
import type { Note, Task } from "@/types";
import { useTheme } from "@/hooks/useTheme";

type Mode = "tasks" | "notes";
type Filter = "open" | "today" | "high" | "done";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "open", label: "المفتوحة" },
  { value: "today", label: "اليوم" },
  { value: "high", label: "عالية الأولوية" },
  { value: "done", label: "المنجزة" },
];

export default function TasksScreen() {
  useTheme();
  const tasks = usePlanner((s) => s.tasks);
  const notes = usePlanner((s) => s.notes);
  const addTask = usePlanner((s) => s.addTask);
  const toggleTask = usePlanner((s) => s.toggleTask);
  const clearDone = usePlanner((s) => s.clearDoneTasks);
  const togglePin = usePlanner((s) => s.togglePin);

  const [mode, setMode] = useState<Mode>("tasks");
  const [filter, setFilter] = useState<Filter>("open");
  const [quick, setQuick] = useState("");
  const [taskSheet, setTaskSheet] = useState<{ open: boolean; task?: Task }>({ open: false });
  const [noteSheet, setNoteSheet] = useState<{ open: boolean; note?: Note }>({ open: false });

  const today = todayISO();

  const visible = useMemo(() => {
    const order = { high: 0, normal: 1, low: 2 } as const;
    const list = tasks.filter((t) => {
      if (filter === "done") return t.done;
      if (t.done) return false;
      if (filter === "today") return t.dueDate === today || (!!t.dueDate && t.dueDate < today);
      if (filter === "high") return t.priority === "high";
      return true;
    });
    return list.sort((a, b) => order[a.priority] - order[b.priority] || b.createdAt - a.createdAt);
  }, [tasks, filter, today]);

  const doneCount = tasks.filter((t) => t.done).length;
  const openCount = tasks.length - doneCount;

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt),
    [notes],
  );
  const colA = sortedNotes.filter((_, i) => i % 2 === 0);
  const colB = sortedNotes.filter((_, i) => i % 2 === 1);

  const submitQuick = () => {
    const t = quick.trim();
    if (!t) return;
    addTask({ title: t, dueDate: filter === "today" ? today : undefined });
    setQuick("");
  };

  const renderNote = (n: Note) => {
    const m = n.type ? TYPE_META[n.type] : null;
    return (
      <PressableScale
        key={n.id}
        className="rounded-2xl p-3 mb-3"
        style={{
          backgroundColor: m ? m.soft : "#FFFBEB",
          borderWidth: 1,
          borderColor: m ? m.hex : "#FDE68A",
        }}
        onPress={() => setNoteSheet({ open: true, note: n })}
        onLongPress={() => togglePin(n.id)}
      >
        {n.pinned ? (
          <View className="mb-1">
            <Ionicons name="pin" size={14} color={m ? m.inkHex : "#92400E"} />
          </View>
        ) : null}
        <Text style={{ color: m ? m.inkHex : "#78350F" }} numberOfLines={8}>
          {n.text}
        </Text>
      </PressableScale>
    );
  };

  return (
    <Screen
      title="المهام والملاحظات"
      subtitle={mode === "tasks" ? `${openCount} مفتوحة • ${doneCount} منجزة` : `${notes.length} ملاحظة`}
      overlay={
        <Fab
          onPress={() =>
            mode === "tasks" ? setTaskSheet({ open: true }) : setNoteSheet({ open: true })
          }
        />
      }
    >
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: "tasks", label: "قائمة المهام" },
          { value: "notes", label: "الملاحظات" },
        ]}
      />

      {mode === "tasks" ? (
        <View className="mt-4">
          {/* إضافة سريعة */}
          <View className="flex-row items-center gap-2 bg-surface border border-line rounded-2xl px-3 mb-3">
            <Ionicons name="add-circle-outline" size={22} color="#64748B" />
            <TextInput
              value={quick}
              onChangeText={setQuick}
              onSubmitEditing={submitQuick}
              returnKeyType="done"
              placeholder="أضف مهمة سريعة ثم اضغط إدخال"
              placeholderTextColor="#94A3B8"
              style={{
                flex: 1,
                fontFamily: "Cairo_400Regular",
                fontSize: 15,
                paddingVertical: 12,
                textAlign: inputAlign(),
                color: "#0F172A",
              }}
            />
            {quick.trim() ? (
              <Pressable onPress={submitQuick} hitSlop={8}>
                <Ionicons name="arrow-up-circle" size={28} color="#0F172A" />
              </Pressable>
            ) : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            <View className="flex-row gap-2">
              {FILTERS.map((f) => (
                <Chip key={f.value} label={f.label} selected={filter === f.value} onPress={() => setFilter(f.value)} />
              ))}
            </View>
          </ScrollView>

          {visible.length === 0 ? (
            <EmptyState
              icon="checkmark-done-outline"
              title={filter === "done" ? "لا مهام منجزة بعد" : "لا توجد مهام هنا"}
              hint="اكتب مهمة في الحقل أعلاه أو اضغط +"
            />
          ) : (
            visible.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                onToggle={() => toggleTask(t.id)}
                onPress={() => setTaskSheet({ open: true, task: t })}
              />
            ))
          )}

          {filter === "done" && doneCount > 0 ? (
            <Text w="semi" className="text-danger text-center mt-2" onPress={clearDone}>
              مسح كل المنجزة
            </Text>
          ) : null}
        </View>
      ) : (
        <View className="mt-4">
          {sortedNotes.length === 0 ? (
            <EmptyState icon="document-text-outline" title="لا ملاحظات" hint="اضغط + لإضافة ملاحظة. اضغط مطوّلًا على ملاحظة لتثبيتها." />
          ) : (
            <View className="flex-row gap-3">
              <View className="flex-1">{colA.map(renderNote)}</View>
              <View className="flex-1">{colB.map(renderNote)}</View>
            </View>
          )}
        </View>
      )}

      <TaskSheet visible={taskSheet.open} task={taskSheet.task} onClose={() => setTaskSheet({ open: false })} />
      <NoteSheet visible={noteSheet.open} note={noteSheet.note} onClose={() => setNoteSheet({ open: false })} />
    </Screen>
  );
}
