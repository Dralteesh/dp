import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { PressableScale } from "@/components/ui/PressableScale";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";

export type Tool = { id: string; label: string; icon: string; path: string; params?: Record<string, string> };

const COL = TYPE_META.private;

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  tools: Tool[];
  defaultIds: string[];
  /** المحفوظ (null = الافتراضي) */
  saved: string[] | null;
  onSave: (ids: string[] | null) => void;
};

/** نافذة أدوات قابلة للتخصيص: شبكة بنسق واحد، مع تعديل (إضافة/إزالة/ترتيب) من الزاوية */
export function ToolsSheet({ visible, onClose, title, tools, defaultIds, saved, onSave }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  const ids = useMemo(() => {
    const known = new Set(tools.map((t) => t.id));
    const base = saved && Array.isArray(saved) ? saved.filter((i) => known.has(i)) : defaultIds;
    return [...new Set(base)];
  }, [saved]);
  const byId = (id: string) => tools.find((t) => t.id === id)!;
  const shown = ids.map(byId);
  const available = tools.filter((t) => !ids.includes(t.id));

  const save = (next: string[]) => onSave(next);
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    save(next);
  };

  const close = () => {
    setEditing(false);
    onClose();
  };
  const open = (t: Tool) => {
    close();
    router.push((t.params ? { pathname: t.path, params: t.params } : t.path) as never);
  };

  const Icon = ({ name }: { name: string }) => (
    <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: COL.hex }}>
      <Ionicons name={name as never} size={18} color={COL.onSolid} />
    </View>
  );

  return (
    <Sheet visible={visible} onClose={close}>
      <View className="flex-row items-center justify-between mb-3">
        <Text w="bold" className="text-xl">
          {editing ? `تعديل ${title}` : title}
        </Text>
        <Pressable
          onPress={() => setEditing((e) => !e)}
          hitSlop={8}
          className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{ backgroundColor: editing ? COL.hex : "#F1F5F9" }}
          accessibilityLabel={editing ? "تم" : "تعديل"}
        >
          <Ionicons name={editing ? "checkmark" : "pencil"} size={15} color={editing ? "#FFFFFF" : "#0F172A"} />
          <Text w="semi" className="text-xs" style={{ color: editing ? "#FFFFFF" : "#0F172A" }}>
            {editing ? "تم" : "تعديل"}
          </Text>
        </Pressable>
      </View>

      {!editing ? (
        shown.length === 0 ? (
          <Text className="text-muted text-center py-6">لا أدوات ظاهرة. اضغط «تعديل» لإضافتها.</Text>
        ) : (
          <View className="flex-row flex-wrap" style={{ gap: 10 }}>
            {shown.map((t) => (
              <PressableScale
                key={t.id}
                containerClassName="w-[31%]"
                className="rounded-2xl py-4 items-center gap-2"
                style={{ backgroundColor: COL.soft }}
                onPress={() => open(t)}
              >
                <Ionicons name={t.icon as never} size={26} color={COL.hex} />
                <Text w="semi" className="text-xs text-center" style={{ color: COL.inkHex }}>
                  {t.label}
                </Text>
              </PressableScale>
            ))}
          </View>
        )
      ) : (
        <View>
          <Text className="text-xs text-muted mb-2">استخدم الأسهم للترتيب، و − للإزالة، و + للإضافة.</Text>
          {shown.map((t, i) => (
            <View key={t.id} className="flex-row items-center gap-2 bg-bg border border-line rounded-2xl px-2 py-2 mb-2">
              <Icon name={t.icon} />
              <Text w="semi" className="flex-1 text-sm" numberOfLines={1}>
                {t.label}
              </Text>
              <Pressable onPress={() => move(i, -1)} hitSlop={6} disabled={i === 0} style={{ opacity: i === 0 ? 0.3 : 1 }} className="w-8 h-9 items-center justify-center" accessibilityLabel="أعلى">
                <Ionicons name="chevron-up" size={20} color="#475569" />
              </Pressable>
              <Pressable onPress={() => move(i, 1)} hitSlop={6} disabled={i === shown.length - 1} style={{ opacity: i === shown.length - 1 ? 0.3 : 1 }} className="w-8 h-9 items-center justify-center" accessibilityLabel="أسفل">
                <Ionicons name="chevron-down" size={20} color="#475569" />
              </Pressable>
              <Pressable onPress={() => save(ids.filter((x) => x !== t.id))} hitSlop={6} className="w-8 h-9 items-center justify-center" accessibilityLabel="إزالة">
                <Ionicons name="remove-circle" size={24} color="#DC2626" />
              </Pressable>
            </View>
          ))}

          {available.length > 0 ? (
            <>
              <Text w="semi" className="text-sm mt-2 mb-2">
                متاحة للإضافة
              </Text>
              {available.map((t) => (
                <View key={t.id} className="flex-row items-center gap-2 bg-bg border border-line rounded-2xl px-2 py-2 mb-2" style={{ opacity: 0.9 }}>
                  <Icon name={t.icon} />
                  <Text w="semi" className="flex-1 text-sm" numberOfLines={1}>
                    {t.label}
                  </Text>
                  <Pressable onPress={() => save([...ids, t.id])} hitSlop={6} className="w-8 h-9 items-center justify-center" accessibilityLabel="إضافة">
                    <Ionicons name="add-circle" size={26} color="#16A34A" />
                  </Pressable>
                </View>
              ))}
            </>
          ) : null}

          <View className="mt-1 mb-2">
            <Button label="استعادة الافتراضي" icon="refresh" variant="ghost" onPress={() => onSave(null)} />
          </View>
        </View>
      )}
    </Sheet>
  );
}
