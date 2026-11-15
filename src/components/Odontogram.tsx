import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { LOWER_TEETH, TOOTH_STATUS, UPPER_TEETH } from "@/constants/clinic";
import type { ToothStatus } from "@/types";

const TOOTH_W = 34;
const GAP = 4;
const MID_GAP = 14;

type Props = {
  teeth: Record<string, ToothStatus>;
  selected?: string;
  onSelect: (tooth: string) => void;
};

function Tooth({
  code,
  status,
  active,
  onPress,
}: {
  code: string;
  status?: ToothStatus;
  active: boolean;
  onPress: () => void;
}) {
  const meta = status ? TOOTH_STATUS[status] : null;
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: TOOTH_W,
        height: 50,
        borderRadius: 12,
        marginHorizontal: GAP / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: meta ? meta.soft : "#FFFFFF",
        borderWidth: active ? 3 : 1.5,
        borderColor: active ? "#0F172A" : meta ? meta.hex : "#CBD5E1",
        opacity: status === "missing" ? 0.55 : 1,
      }}
    >
      <Text
        w="bold"
        className="text-xs"
        style={{
          color: meta ? meta.hex : "#475569",
          textDecorationLine: status === "missing" || status === "extraction" ? "line-through" : "none",
        }}
      >
        {code}
      </Text>
      {meta ? <View style={{ width: 14, height: 4, borderRadius: 2, backgroundColor: meta.hex, marginTop: 3 }} /> : null}
    </Pressable>
  );
}

function Arch({
  codes,
  teeth,
  selected,
  onSelect,
}: Props & { codes: string[] }) {
  return (
    // direction ltr: الأرقام تُعرض كما في المخطط السريري القياسي (يمين المريض على يسار الشاشة)
    <View style={{ flexDirection: "row", direction: "ltr" }}>
      {codes.map((c, i) => (
        <View key={c} style={{ marginRight: i === 7 ? MID_GAP : 0 }}>
          <Tooth code={c} status={teeth[c]} active={selected === c} onPress={() => onSelect(c)} />
        </View>
      ))}
    </View>
  );
}

/** مخطط الأسنان الدائمة (FDI) — اضغط سنًا لاختياره ثم حدّد حالته */
export function Odontogram({ teeth, selected, onSelect }: Props) {
  return (
    <View className="bg-surface rounded-2xl border border-line py-3">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10 }}>
        <View style={{ direction: "ltr" }}>
          <Text className="text-xs text-muted mb-1.5" style={{ textAlign: "center" }}>
            الفك العلوي
          </Text>
          <Arch codes={UPPER_TEETH} teeth={teeth} selected={selected} onSelect={onSelect} />
          <View style={{ height: 1, backgroundColor: "#E5E9F2", marginVertical: 10 }} />
          <Arch codes={LOWER_TEETH} teeth={teeth} selected={selected} onSelect={onSelect} />
          <Text className="text-xs text-muted mt-1.5" style={{ textAlign: "center" }}>
            الفك السفلي
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
