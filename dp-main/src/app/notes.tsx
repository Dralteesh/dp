import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { useTheme } from "@/hooks/useTheme";
import { fmtDateShort, toISO } from "@/lib/dates";
import { inputAlign } from "@/lib/rtl";
import { usePlanner } from "@/store/usePlanner";
import type { Note } from "@/types";

const norm = (s: string) => s.replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").toLowerCase();

function NoteCard({ note, onPress }: { note: Note; onPress: () => void }) {
  const t = note.type ? TYPE_META[note.type] : null;
  return (
    <Pressable
      onPress={onPress}
      className="rounded-3xl p-4 mb-3 border border-line"
      style={{ backgroundColor: note.color || "#FFFFFF" }}
    >
      <View className="flex-row items-start justify-between gap-2">
        <Text w="bold" className="flex-1 text-base" numberOfLines={2}>
          {note.title || (note.text ? note.text.split("\n")[0] : "بدون عنوان")}
        </Text>
        {note.pinned ? <Ionicons name="pin" size={16} color="#0E6FA5" /> : null}
      </View>
      {note.title && note.text ? (
        <Text className="text-sm text-slate-600 mt-1 leading-6" numberOfLines={6}>
          {note.text}
        </Text>
      ) : null}
      <View className="flex-row items-center justify-between mt-2">
        {t ? (
          <View className="flex-row items-center gap-1 rounded-full px-2 py-0.5" style={{ backgroundColor: t.soft }}>
            <Ionicons name={t.icon} size={11} color={t.inkHex} />
            <Text className="text-[11px]" style={{ color: t.inkHex }}>
              {t.short}
            </Text>
          </View>
        ) : (
          <View />
        )}
        <Text className="text-[11px] text-muted">{fmtDateShort(toISO(new Date(note.updatedAt)))}</Text>
      </View>
    </Pressable>
  );
}

/** تطبيق الملاحظات: بحث، تثبيت، ألوان، ربط بمكان العمل */
export default function NotesScreen() {
  useTheme();
  const router = useRouter();
  const notes = usePlanner((s) => s.notes);
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const k = norm(q.trim());
    return notes
      .filter((n) => !k || norm(`${n.title ?? ""} ${n.text}`).includes(k))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
  }, [notes, q]);

  // عمودان
  const cols: Note[][] = [[], []];
  list.forEach((n, i) => cols[i % 2].push(n));

  const open = (id: string) => router.push({ pathname: "/note/[id]", params: { id } });

  return (
    <Screen title="الملاحظات" subtitle={`${notes.length} ملاحظة`} back overlay={<Fab onPress={() => open("new")} color="#0E6FA5" bottom={24} />}>
      <View className="flex-row items-center gap-2 bg-surface border border-line rounded-2xl px-3 mb-4">
        <Ionicons name="search" size={18} color="#94A3B8" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="ابحث في الملاحظات"
          placeholderTextColor="#94A3B8"
          style={{ flex: 1, paddingVertical: 11, fontFamily: "Cairo_400Regular", fontSize: 15, textAlign: inputAlign() }}
        />
      </View>
      {list.length === 0 ? (
        <EmptyState icon="create-outline" title={q ? "لا نتائج" : "لا ملاحظات بعد"} hint={q ? undefined : "اضغط + لكتابة أول ملاحظة"} />
      ) : (
        <View className="flex-row gap-3">
          {cols.map((c, i) => (
            <View key={i} className="flex-1">
              {c.map((n) => (
                <NoteCard key={n.id} note={n} onPress={() => open(n.id)} />
              ))}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
