import { Share, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui/Card";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { BRIDGE_COLOR, ODONTO_BG, TOOTH_MARKS, TOOTH_STATUS } from "@/constants/clinic";
import { permanentOf } from "@/lib/toothmap";
import { toothName } from "@/lib/odontogram";
import type { Patient } from "@/types";

const LINE = "#D3E6F7";

type Row = { code: string; status?: string; marks: string[]; bridge?: string; note?: string };

const QUADRANT_NO = (code: string) => Number(permanentOf(code)[0]);

/** صفوف الأسنان التي عليها حالة أو علامة أو جسر أو ملاحظة، مرتّبة برقم FDI */
function buildRows(p: Patient): Row[] {
  const codes = new Set<string>([...Object.keys(p.teeth), ...Object.keys(p.toothMarks ?? {}), ...Object.keys(p.toothNotes ?? {}), ...(p.bridges ?? []).flat()]);
  return [...codes]
    .sort((a, b) => Number(a) - Number(b))
    .map((code) => {
      const bi = (p.bridges ?? []).findIndex((b) => b.includes(code));
      const b = bi >= 0 ? p.bridges![bi] : undefined;
      return {
        code,
        status: p.teeth[code],
        marks: p.toothMarks?.[code] ?? [],
        bridge: b ? `${b[0]}–${b[b.length - 1]}` : undefined,
        note: p.toothNotes?.[code],
      };
    })
    .filter((r) => r.status || r.marks.length || r.bridge || r.note);
}

/** تصدير بصيغة Toothmap: بيانات كل سن مع معلومات السلسلة والأدوات المطبّقة */
export function exportTeethData(p: Patient) {
  return buildRows(p).map((r) => {
    const chain = (p.bridges ?? []).find((b) => b.includes(r.code));
    const i = chain ? chain.indexOf(r.code) : -1;
    return {
      toothId: Number(r.code),
      toothName: toothName(r.code),
      quadrant: QUADRANT_NO(r.code),
      status: r.status ?? null,
      chainInfo: {
        isInChain: !!chain,
        positionInChain: chain ? i + 1 : null,
        totalInChain: chain?.length ?? 0,
        previousTooth: chain && i > 0 ? Number(chain[i - 1]) : null,
        nextTooth: chain && i < chain.length - 1 ? Number(chain[i + 1]) : null,
      },
      appliedTools: r.marks,
      note: r.note ?? null,
    };
  });
}

/** جدول «الأسنان المتأثرة» + تصدير البيانات */
export function AffectedTeethTable({ patient, onPick }: { patient: Patient; onPick?: (code: string) => void }) {
  const rows = buildRows(patient);
  if (!rows.length) return null;

  const share = () =>
    Share.share({ title: `أسنان ${patient.name}`, message: JSON.stringify({ patient: patient.name, teeth: exportTeethData(patient), bridges: patient.bridges ?? [] }, null, 2) }).catch(() => {});

  return (
    <View className="mt-5">
      <View className="flex-row items-center justify-between mb-2">
        <Text w="bold" style={{ color: ODONTO_BG }}>
          الأسنان المتأثرة ({rows.length})
        </Text>
        <PressableScale className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: "#E7F3FF" }} onPress={share}>
          <Ionicons name="share-outline" size={16} color={ODONTO_BG} />
          <Text w="semi" style={{ fontSize: 12.5, color: ODONTO_BG }}>
            تصدير البيانات
          </Text>
        </PressableScale>
      </View>
      <Card>
        {rows.map((r, i) => {
          const meta = r.status ? TOOTH_STATUS[r.status as keyof typeof TOOTH_STATUS] : null;
          return (
            <PressableScale key={r.code} onPress={() => onPick?.(r.code)} className="flex-row items-center gap-3 py-2.5" style={{ borderTopWidth: i ? 1 : 0, borderTopColor: LINE }}>
              <Text w="bold" style={{ width: 34, fontSize: 16, color: ODONTO_BG, fontVariant: ["tabular-nums"] }}>
                {r.code}
              </Text>
              <View className="flex-1">
                <Text className="text-xs text-muted" numberOfLines={1}>
                  {toothName(r.code)}
                </Text>
                <View className="flex-row flex-wrap items-center gap-1.5 mt-1">
                  {meta ? (
                    <View style={{ backgroundColor: meta.soft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text w="semi" style={{ fontSize: 11.5, color: meta.hex }}>
                        {meta.label}
                      </Text>
                    </View>
                  ) : null}
                  {r.marks.map((m) => (
                    <View key={m} style={{ backgroundColor: "#F3F4F6", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 11.5, color: TOOTH_MARKS[m as keyof typeof TOOTH_MARKS].hex }}>{TOOTH_MARKS[m as keyof typeof TOOTH_MARKS].label}</Text>
                    </View>
                  ))}
                  {r.bridge ? (
                    <View style={{ backgroundColor: "rgba(124,58,237,0.12)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text w="semi" style={{ fontSize: 11.5, color: BRIDGE_COLOR }}>
                        جسر {r.bridge}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {r.note ? (
                  <Text className="text-xs text-muted mt-1" numberOfLines={2}>
                    {r.note}
                  </Text>
                ) : null}
              </View>
            </PressableScale>
          );
        })}
      </Card>
    </View>
  );
}
