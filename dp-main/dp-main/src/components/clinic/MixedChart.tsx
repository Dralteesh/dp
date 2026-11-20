import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { TOOTH_STATUS } from "@/constants/clinic";
import type { ToothStatus } from "@/types";

const rows: { title: string; codes: string[] }[] = [
  { title: "العلوي · دائمة", codes: "18 17 16 15 14 13 12 11 21 22 23 24 25 26 27 28".split(" ") },
  { title: "العلوي · لبنية", codes: "55 54 53 52 51 61 62 63 64 65".split(" ") },
  { title: "السفلي · لبنية", codes: "85 84 83 82 81 71 72 73 74 75".split(" ") },
  { title: "السفلي · دائمة", codes: "48 47 46 45 44 43 42 41 31 32 33 34 35 36 37 38".split(" ") },
];

/** عرض مختلط (دائمة + لبنية معًا) كجدول قابل للتمرير؛ الضغط على سن يحدده كما في المخطط الأصلي */
export function MixedChart({
  teeth,
  selected,
  onSelect,
}: {
  teeth: Record<string, ToothStatus>;
  selected?: string;
  onSelect: (code: string) => void;
}) {
  return (
    <View className="bg-surface rounded-2xl border border-line p-3 mt-3">
      <Text className="text-xs text-muted mb-1">عرض مختلط: الأسنان الدائمة واللبنية معًا. مرّر أفقيًا.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ direction: "ltr" }}>
          {rows.map((r) => (
            <View key={r.title} className="mt-2">
              <Text className="text-[10px] text-muted mb-1" style={{ textAlign: "left" }}>
                {r.title}
              </Text>
              <View className="flex-row" style={{ gap: 4 }}>
                {r.codes.map((c) => {
                  const st = teeth[c];
                  const meta = st ? TOOTH_STATUS[st] : null;
                  const on = selected === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => onSelect(c)}
                      style={{
                        width: 34,
                        height: 38,
                        borderRadius: 11,
                        borderWidth: 1.5,
                        alignItems: "center",
                        justifyContent: "center",
                        borderColor: on ? "#2DD4BF" : meta ? meta.hex : "#B8D9E9",
                        backgroundColor: on ? "#2DD4BF" : meta ? meta.soft : "#F1F8FC",
                      }}
                    >
                      <Text w="bold" style={{ fontSize: 12, color: on ? "#053D37" : meta ? meta.hex : "#426B84" }}>
                        {c}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
