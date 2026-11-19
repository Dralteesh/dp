import { memo, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { SceneBox } from "@/components/focus/Scene";
import { Tree } from "@/components/focus/Tree";
import { useSky } from "@/components/focus/useSky";
import { Chip } from "@/components/ui/Chip";
import { EmptyState, SectionHeader } from "@/components/ui/EmptyState";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { fmtDateFull, toISO } from "@/lib/dates";
import { treeSlot } from "@/lib/focusStats";
import { SPECIES, type FocusRecord } from "@/store/useFocus";

const GREEN = "#15803D";
const MAX_TREES = 60;
const ROWS = [
  { size: 56, bottom: 44 },
  { size: 70, bottom: 24 },
  { size: 86, bottom: 4 },
];

const Landscape = memo(function Landscape({ records, onPick }: { records: FocusRecord[]; onPick: (r: FocusRecord) => void }) {
  const sky = useSky().now;
  const [w, setW] = useState(340);
  const placed = useMemo(
    () =>
      records
        .slice(0, MAX_TREES)
        .map((r, i) => ({ r, ...treeSlot(r.id, i, ROWS.length) }))
        .sort((a, b) => a.row - b.row),
    [records],
  );
  return (
    <SceneBox sky={sky} height={280}>
      <View style={{ flex: 1 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {placed.map(({ r, x, row }) => {
          const { size, bottom } = ROWS[row];
          return (
            <Pressable key={r.id} onPress={() => onPick(r)} style={{ position: "absolute", bottom, left: x * (w - size), width: size, height: size }}>
              <Tree species={r.species} progress={1} withered={r.status === "withered"} size={size} seed={r.id} noGround />
            </Pressable>
          );
        })}
        {placed.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text w="semi" style={{ color: "#fff" }}>
              أرضك جاهزة… ازرع أول شجرة
            </Text>
          </View>
        ) : null}
      </View>
    </SceneBox>
  );
});

/** غابتي: منظر طبيعي بأشجارك + ألبوم حسب التاريخ والتصنيف والنوع */
export function ForestView({ records }: { records: FocusRecord[] }) {
  const [tagF, setTagF] = useState<string | null>(null);
  const [typeF, setTypeF] = useState<string | null>(null);
  const [card, setCard] = useState<FocusRecord | null>(null);
  const [limit, setLimit] = useState(60);

  const tags = useMemo(() => [...new Set(records.map((r) => r.tag))], [records]);
  const filtered = useMemo(() => records.filter((r) => (!tagF || r.tag === tagF) && (!typeF || r.species === typeF)), [records, tagF, typeF]);
  const groups = useMemo(() => {
    const m = new Map<string, FocusRecord[]>();
    for (const r of filtered.slice(0, limit)) {
      const d = toISO(new Date(r.at));
      m.set(d, [...(m.get(d) ?? []), r]);
    }
    return [...m.entries()];
  }, [filtered, limit]);

  return (
    <View className="mt-4">
      <Landscape records={records} onPick={setCard} />

      <SectionHeader title="الألبوم" />
      {records.length === 0 ? (
        <EmptyState icon="leaf-outline" title="لم تزرع شيئًا بعد" hint="أول جلسة تركيز تُنبت أول شجرة في غابتك." />
      ) : (
        <>
          <View className="flex-row flex-wrap gap-2 mb-2">
            <Chip label="الكل" selected={!tagF && !typeF} color={GREEN} onPress={() => (setTagF(null), setTypeF(null))} />
            {tags.map((t) => (
              <Chip key={t} label={t} selected={tagF === t} color={GREEN} onPress={() => setTagF(tagF === t ? null : t)} />
            ))}
          </View>
          <View className="flex-row flex-wrap gap-2 mb-1">
            {(Object.keys(SPECIES) as (keyof typeof SPECIES)[]).map((sp) => (
              <Chip key={sp} label={SPECIES[sp].label} selected={typeF === sp} color={GREEN} onPress={() => setTypeF(typeF === sp ? null : sp)} />
            ))}
          </View>
          {groups.map(([iso, rs]) => (
            <View key={iso}>
              <Text w="semi" className="text-sm text-muted mt-3 mb-1">
                {fmtDateFull(iso)} • {rs.filter((r) => r.status === "grown").reduce((s, r) => s + r.minutes, 0)} د
              </Text>
              <View className="flex-row flex-wrap">
                {rs.map((r) => (
                  <Pressable key={r.id} onPress={() => setCard(r)} style={{ width: "25%", alignItems: "center", marginBottom: 6 }}>
                    <Tree species={r.species} progress={1} withered={r.status === "withered"} size={70} seed={r.id} />
                    <Text className="text-[10px] text-muted">{r.minutes} د</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
          {filtered.length > limit ? (
            <Pressable onPress={() => setLimit((l) => l + 60)} className="items-center py-3">
              <Text w="semi" style={{ color: GREEN }}>
                عرض المزيد
              </Text>
            </Pressable>
          ) : null}
        </>
      )}

      <Sheet visible={!!card} onClose={() => setCard(null)} title={card ? (card.status === "grown" ? "شجرة نامية" : "شجرة ذابلة") : ""}>
        {card ? (
          <View className="items-center pb-2">
            <Tree species={card.species} progress={1} withered={card.status === "withered"} size={200} seed={card.id} sway={card.status === "grown"} />
            <Text w="bold" className="text-lg mt-1">
              {SPECIES[card.species].label}
            </Text>
            <Text className="text-muted mt-1">
              {fmtDateFull(toISO(new Date(card.at)))} •{" "}
              {new Date(card.at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
            </Text>
            <Text className="mt-2">
              {card.tag} • {card.minutes} دقيقة {card.status === "grown" ? `• +${card.minutes} عملة` : "• ذبلت"}
            </Text>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}
