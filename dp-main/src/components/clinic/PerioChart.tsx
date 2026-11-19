import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { navOrder, toothName } from "@/lib/odontogram";
import { useClinic } from "@/store/useClinic";
import type { Patient, PerioReading } from "@/types";

const POINTS = ["MB", "B", "DB", "ML", "L", "DL"];
const empty = (): PerioReading => ({ pd: [null, null, null, null, null, null], bop: false });

/** لون عمق الجيب: ≤3 سليم، 4–5 تحذير، ≥6 شديد */
const depthColor = (v: number | null) => (v == null ? "#94A3B8" : v <= 3 ? "#16A34A" : v <= 5 ? "#D97706" : "#DC2626");

/** مخطط اللثة (6 نقاط لكل سن + نزف عند الجس). بيانات اختيارية تُحفظ في حقل perio للمريض */
export function PerioChart({ patient }: { patient: Patient }) {
  const setPerio = useClinic((s) => s.setPerio);
  const order = useMemo(() => navOrder("permanent"), []);
  const [tooth, setTooth] = useState<string>(order.find((t) => patient.perio?.[t]) ?? "16");
  const reading = patient.perio?.[tooth] ?? empty();

  const update = (r: PerioReading) => setPerio(patient.id, tooth, r);
  const bump = (i: number, d: number) => {
    const cur = reading.pd[i];
    const next = cur == null ? (d > 0 ? 2 : null) : Math.min(12, cur + d);
    const pd = [...reading.pd];
    pd[i] = next != null && next < 1 ? null : next;
    update({ ...reading, pd });
  };

  const recorded = order.filter((t) => patient.perio?.[t]);

  return (
    <View className="mt-4">
      <Text className="text-xs text-muted mb-2">اختر السنّ ثم سجّل عمق الجيب (مم) عند كل نقطة.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
        {order.map((t) => {
          const on = t === tooth;
          const has = !!patient.perio?.[t];
          return (
            <Pressable
              key={t}
              onPress={() => setTooth(t)}
              className="rounded-xl items-center justify-center border"
              style={{
                width: 42,
                height: 42,
                backgroundColor: on ? "#111418" : has ? "#D6EBF7" : "#FFFFFF",
                borderColor: on ? "#111418" : has ? "#0E6FA5" : "#D9D6CC",
              }}
            >
              <Text w="bold" style={{ color: on ? "#FFFFFF" : "#334155" }}>
                {t}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="bg-surface rounded-2xl border border-line p-4 mt-2">
        <Text w="bold">{toothName(tooth)}</Text>
        <View className="flex-row flex-wrap gap-2 mt-3" style={{ direction: "ltr" }}>
          {POINTS.map((p, i) => {
            const v = reading.pd[i];
            return (
              <View key={p} className="items-center rounded-xl border border-line p-2" style={{ width: "31%" }}>
                <Text className="text-[11px] text-muted">{p}</Text>
                <Text w="bold" style={{ fontSize: 22, color: depthColor(v) }}>
                  {v ?? "—"}
                </Text>
                <View className="flex-row gap-2 mt-1">
                  <Pressable onPress={() => bump(i, -1)} hitSlop={6} className="w-8 h-8 rounded-full bg-bg items-center justify-center">
                    <Ionicons name="remove" size={18} color="#475569" />
                  </Pressable>
                  <Pressable onPress={() => bump(i, 1)} hitSlop={6} className="w-8 h-8 rounded-full bg-bg items-center justify-center">
                    <Ionicons name="add" size={18} color="#475569" />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        <Pressable
          onPress={() => update({ ...reading, bop: !reading.bop })}
          className="flex-row items-center gap-2 mt-3 self-start rounded-full px-3 py-2"
          style={{ backgroundColor: reading.bop ? "#FEE2E2" : "#F1F5F9" }}
        >
          <Ionicons name={reading.bop ? "water" : "water-outline"} size={16} color={reading.bop ? "#DC2626" : "#64748B"} />
          <Text className="text-xs" style={{ color: reading.bop ? "#DC2626" : "#64748B" }}>
            نزف عند الجس (BOP)
          </Text>
        </Pressable>

        {patient.perio?.[tooth] ? (
          <View className="mt-3 self-start">
            <Button label="مسح قياسات هذا السن" variant="ghost" small onPress={() => setPerio(patient.id, tooth, null)} />
          </View>
        ) : null}
      </View>

      {recorded.length ? (
        <View className="bg-surface rounded-2xl border border-line mt-3 overflow-hidden">
          <View className="flex-row px-3 py-2 bg-bg" style={{ direction: "ltr" }}>
            <Text className="text-[10px] text-muted" style={{ width: 34 }}>
              السن
            </Text>
            {POINTS.map((p) => (
              <Text key={p} className="text-[10px] text-muted flex-1 text-center">
                {p}
              </Text>
            ))}
            <Text className="text-[10px] text-muted text-center" style={{ width: 34 }}>
              BOP
            </Text>
          </View>
          {recorded.map((t) => {
            const r = patient.perio![t];
            return (
              <Pressable key={t} onPress={() => setTooth(t)} className="flex-row px-3 py-2 border-t border-line" style={{ direction: "ltr" }}>
                <Text w="bold" className="text-xs" style={{ width: 34 }}>
                  {t}
                </Text>
                {r.pd.map((v, i) => (
                  <Text key={i} w="semi" className="text-xs flex-1 text-center" style={{ color: depthColor(v) }}>
                    {v ?? "—"}
                  </Text>
                ))}
                <Text className="text-xs text-center" style={{ width: 34, color: r.bop ? "#DC2626" : "#94A3B8" }}>
                  {r.bop ? "●" : "—"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
