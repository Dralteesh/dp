import { useState } from "react";
import { Alert, Pressable, ScrollView, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ArcTimePicker } from "@/components/focus/ArcTimePicker";
import { SceneBox } from "@/components/focus/Scene";
import { Tree } from "@/components/focus/Tree";
import { useSky } from "@/components/focus/useSky";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { SectionHeader } from "@/components/ui/EmptyState";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { SPECIES, useFocus, type Species } from "@/store/useFocus";

const GREEN = "#15803D";

type Props = {
  species: Species;
  setSpecies: (s: Species) => void;
  minutes: number;
  setMinutes: (m: number) => void;
  tag: string;
  setTag: (t: string) => void;
  onStart: () => void;
};

export function PlantView({ species, setSpecies, minutes, setMinutes, tag, setTag, onStart }: Props) {
  const sky = useSky().now;
  const tags = useFocus((s) => s.tags);
  const unlocked = useFocus((s) => s.unlocked);
  const coins = useFocus((s) => s.coins);
  const [tagSheet, setTagSheet] = useState(false);
  const [newTag, setNewTag] = useState("");

  const pick = (sp: Species) => {
    if (unlocked.includes(sp)) return setSpecies(sp);
    const cost = SPECIES[sp].cost;
    Alert.alert("نوع مقفل", `«${SPECIES[sp].label}» يُفتح من المتجر مقابل ${cost} عملة (عندك ${coins}).`);
  };

  return (
    <View className="mt-4">
      <SceneBox sky={sky}>
        <View className="items-center pt-4 pb-14">
          <Tree species={species} progress={1} size={150} sway seed="preview" noGround />
          <View style={{ marginTop: 6 }}>
            <ArcTimePicker value={minutes} onChange={setMinutes} size={236} />
          </View>
        </View>
      </SceneBox>

      <SectionHeader title="نوع الشجرة" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {(Object.keys(SPECIES) as Species[]).map((sp) => {
          const lock = !unlocked.includes(sp);
          const on = species === sp && !lock;
          return (
            <Pressable
              key={sp}
              onPress={() => pick(sp)}
              className="items-center rounded-2xl px-2 pt-1 pb-2"
              style={{ width: 84, backgroundColor: on ? "#E4F4E8" : "#FFFFFF", borderWidth: 2, borderColor: on ? GREEN : "#E2E0D8" }}
            >
              <View style={{ opacity: lock ? 0.45 : 1 }}>
                <Tree species={sp} progress={1} size={62} seed="thumb" />
              </View>
              <Text w="semi" className="text-xs">
                {SPECIES[sp].label}
              </Text>
              {lock ? (
                <View className="flex-row items-center gap-0.5">
                  <Ionicons name="lock-closed" size={10} color="#64748B" />
                  <Text className="text-[10px] text-muted">{SPECIES[sp].cost}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <SectionHeader title="التصنيف" />
      <View className="flex-row flex-wrap gap-2">
        {tags.map((t) => (
          <Chip key={t} label={t} selected={tag === t} color={GREEN} onPress={() => setTag(t)} />
        ))}
        <Chip label="تصنيف" icon="add" color={GREEN} onPress={() => setTagSheet(true)} />
      </View>

      <View className="mt-6">
        <Button label={`ازرع الشجرة • ${minutes} د`} icon="leaf" onPress={onStart} />
      </View>
      <Text className="text-xs text-muted text-center mt-2 leading-5">
        إن خرجت من التطبيق أكثر من 10 ثوانٍ ذبلت الشجرة. استعمل «استراحة صلاة» لإيقاف الجلسة دون خسارة.
      </Text>

      <Sheet visible={tagSheet} onClose={() => setTagSheet(false)} title="التصنيفات">
        <View className="flex-row gap-2 mb-4">
          <TextInput
            value={newTag}
            onChangeText={setNewTag}
            placeholder="تصنيف جديد"
            placeholderTextColor="#94A3B8"
            className="flex-1 border border-line rounded-2xl px-4 py-3 text-right"
            style={{ fontFamily: undefined }}
          />
          <Button
            label="إضافة"
            small
            onPress={() => {
              const v = newTag.trim();
              if (!v) return;
              useFocus.getState().addTag(v);
              setTag(v);
              setNewTag("");
            }}
          />
        </View>
        {tags.map((t) => (
          <View key={t} className="flex-row items-center justify-between py-2.5 border-b border-line">
            <Text w="semi">{t}</Text>
            <Pressable
              hitSlop={10}
              disabled={tags.length <= 1}
              onPress={() => {
                useFocus.getState().removeTag(t);
                if (tag === t) setTag(tags.find((x) => x !== t) ?? tags[0]);
              }}
            >
              <Ionicons name="trash-outline" size={20} color={tags.length <= 1 ? "#CBD5E1" : "#DC2626"} />
            </Pressable>
          </View>
        ))}
        <Text className="text-xs text-muted mt-3">حذف التصنيف لا يحذف الجلسات السابقة المسجّلة به.</Text>
      </Sheet>
    </View>
  );
}
