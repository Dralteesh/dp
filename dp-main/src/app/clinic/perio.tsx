import { useState } from "react";
import { Alert, Pressable, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { LOWER_TEETH, UPPER_TEETH } from "@/constants/clinic";
import { fmtDateShort, todayISO } from "@/lib/dates";
import { EMPTY_TOOTH, parsePd, perioStats } from "@/lib/perio";
import { sharePdf } from "@/lib/pdf";
import { perioHtml, type DocCtx } from "@/lib/pdfHtml";
import { useClinic } from "@/store/useClinic";
import { useExtras } from "@/store/useExtras";
import { useSettings } from "@/store/useSettings";
import type { PerioTooth } from "@/types/extras";

const SITES = ["وحشي", "وسط", "أنسي"];

/** مخطط اللثة: عمق الجيب على 6 مواقع لكل سن مع النزف والتراجع والحركة */
export default function PerioScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const patient = useClinic((s) => s.patients.find((p) => p.id === patientId));
  const charts = useExtras((s) => s.perioCharts);
  const addPerio = useExtras((s) => s.addPerio);
  const updatePerio = useExtras((s) => s.updatePerio);
  const removePerio = useExtras((s) => s.removePerio);
  const clinicName = useSettings((s) => s.clinicName);
  const clinicLogo = useSettings((s) => s.clinicLogo);
  const doctorName = useSettings((s) => s.doctorName);
  const currency = useSettings((s) => s.currency);
  const green = TYPE_META.private.hex;

  const [editing, setEditing] = useState<{ id?: string; date: string; teeth: Record<string, PerioTooth> } | null>(null);
  const [tooth, setTooth] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!patient) return <Screen title="اللثة" back><Text className="text-muted">المريض غير موجود.</Text></Screen>;
  const mine = charts.filter((c) => c.patientId === patient.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const ctx = (): DocCtx => ({ clinicName, doctorName, logo: clinicLogo || undefined, currency, dateISO: todayISO() });

  const pdf = async (date: string, teeth: Record<string, PerioTooth>) => {
    setBusy(true);
    const err = await sharePdf(perioHtml(ctx(), patient, date, teeth, perioStats(teeth)), `لثة-${patient.name}`);
    setBusy(false);
    if (err) Alert.alert("PDF", err);
  };

  const patchTooth = (k: string, f: (t: PerioTooth) => PerioTooth) =>
    setEditing((e) => (e ? { ...e, teeth: { ...e.teeth, [k]: f(e.teeth[k] ?? EMPTY_TOOTH()) } } : e));

  if (editing) {
    const cur = tooth ? editing.teeth[tooth] ?? EMPTY_TOOTH() : null;
    const st = perioStats(editing.teeth);
    const row = (keys: string[]) => (
      <View className="flex-row flex-wrap gap-1.5 mb-1.5 justify-center">
        {keys.map((k) => {
          const t = editing.teeth[k];
          const has = !!t && (t.bop || t.pd.some((v) => v != null));
          const deep = !!t && t.pd.some((v) => (v ?? 0) >= 4);
          return (
            <Pressable
              key={k}
              onPress={() => setTooth(k)}
              className="rounded-lg items-center justify-center"
              style={{ width: 38, height: 38, backgroundColor: tooth === k ? green : deep ? "#FEE2E2" : has ? "#DCFCE7" : "#F1F5F9" }}
            >
              <Text w="semi" style={{ color: tooth === k ? "#fff" : "#0F172A" }}>
                {k}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
    return (
      <Screen title="قياسات اللثة" subtitle={patient.name} back>
        <Card>
          {row(UPPER_TEETH)}
          {row(LOWER_TEETH)}
          <Text className="text-xs text-muted text-center mt-1">
            {st.teeth} أسنان مقاسة • متوسط {st.avg.toFixed(1)} مم • ≥4 مم: {Math.round(st.deepPct * 100)}% • نزف {Math.round(st.bopPct * 100)}%
          </Text>
        </Card>

        {tooth && cur ? (
          <Card accent="private" className="mt-3">
            <Text w="bold" className="mb-2">
              السن {tooth}
            </Text>
            {[0, 1].map((side) => (
              <View key={side} className="mb-2">
                <Text className="text-xs text-muted mb-1">{side === 0 ? "الجهة الدهليزية" : "الجهة اللسانية"} (عمق الجيب مم)</Text>
                <View className="flex-row gap-2">
                  {[0, 1, 2].map((j) => {
                    const idx = side * 3 + j;
                    return (
                      <View key={j} className="flex-1">
                        <Text className="text-[11px] text-muted text-center">{SITES[j]}</Text>
                        <TextInput
                          value={cur.pd[idx] == null ? "" : String(cur.pd[idx])}
                          onChangeText={(v) =>
                            patchTooth(tooth, (t) => ({ ...t, pd: t.pd.map((x, i) => (i === idx ? parsePd(v) : x)) }))
                          }
                          keyboardType="number-pad"
                          maxLength={2}
                          className="border border-line rounded-xl text-center py-2.5 bg-slate-50"
                          style={{ fontSize: 16, color: (cur.pd[idx] ?? 0) >= 4 ? "#DC2626" : "#0F172A" }}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
            <View className="flex-row flex-wrap gap-2 mt-1">
              <Chip label="نزف عند الجس" selected={cur.bop} color="#DC2626" onPress={() => patchTooth(tooth, (t) => ({ ...t, bop: !t.bop }))} />
              {[0, 1, 2, 3].map((m) => (
                <Chip key={m} label={`حركة ${m}`} selected={(cur.mob ?? 0) === m && cur.mob !== undefined} color={green} onPress={() => patchTooth(tooth, (t) => ({ ...t, mob: t.mob === m ? undefined : m }))} />
              ))}
            </View>
            <View className="flex-row flex-wrap gap-2 mt-2">
              {[0, 1, 2, 3, 4, 5].map((r) => (
                <Chip key={r} label={`تراجع ${r} مم`} selected={cur.rec === r} color="#7C3AED" onPress={() => patchTooth(tooth, (t) => ({ ...t, rec: t.rec === r ? undefined : r }))} />
              ))}
            </View>
          </Card>
        ) : (
          <Text className="text-muted text-center mt-4">اضغط سنًا من المخطط لإدخال قياساته.</Text>
        )}

        <View className="mt-4 gap-2">
          <Button
            label="حفظ"
            icon="checkmark"
            type="private"
            onPress={() => {
              const teeth = Object.fromEntries(Object.entries(editing.teeth).filter(([, t]) => t.bop || t.pd.some((v) => v != null) || t.rec != null || t.mob != null));
              if (!Object.keys(teeth).length) return Alert.alert("لا قياسات", "أدخل قياسات سن واحد على الأقل.");
              if (editing.id) updatePerio(editing.id, { teeth, date: editing.date });
              else addPerio({ patientId: patient.id, date: editing.date, teeth });
              setEditing(null);
              setTooth(null);
            }}
          />
          <Button label="رجوع بدون حفظ" variant="soft" type="private" onPress={() => { setEditing(null); setTooth(null); }} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="مخطط اللثة" subtitle={patient.name} back>
      <Button label="فحص لثة جديد" icon="add" type="private" onPress={() => setEditing({ date: todayISO(), teeth: {} })} />
      <View className="mt-3">
        {mine.length === 0 ? (
          <EmptyState icon="pulse-outline" title="لا فحوصات لثة" hint="سجّل قياسات الجيوب وتابع تطورها" />
        ) : (
          mine.map((c, i) => {
            const st = perioStats(c.teeth);
            const prev = mine[i + 1] ? perioStats(mine[i + 1].teeth) : null;
            const diff = prev ? st.avg - prev.avg : null;
            return (
              <Card key={c.id} className="mb-2">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text w="bold">{fmtDateShort(c.date)}</Text>
                    <Text className="text-xs text-muted">
                      {st.teeth} أسنان • متوسط {st.avg.toFixed(1)} مم • ≥4 مم {Math.round(st.deepPct * 100)}% • نزف {Math.round(st.bopPct * 100)}%
                    </Text>
                    {diff != null ? (
                      <Text className="text-xs mt-0.5" style={{ color: diff > 0.05 ? "#DC2626" : diff < -0.05 ? "#16A34A" : "#64748B" }}>
                        {diff > 0.05 ? "ساء" : diff < -0.05 ? "تحسّن" : "ثابت"} عن الفحص السابق ({diff > 0 ? "+" : ""}
                        {diff.toFixed(1)} مم)
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View className="flex-row flex-wrap gap-2 mt-3">
                  <Chip label="تعديل" icon="create-outline" color={green} onPress={() => setEditing({ id: c.id, date: c.date, teeth: { ...c.teeth } })} />
                  <Chip label="PDF" icon="share-outline" color={green} onPress={() => !busy && pdf(c.date, c.teeth)} />
                  <Pressable
                    hitSlop={8}
                    className="justify-center"
                    onPress={() =>
                      Alert.alert("حذف", "حذف هذا الفحص؟", [
                        { text: "إلغاء", style: "cancel" },
                        { text: "حذف", style: "destructive", onPress: () => removePerio(c.id) },
                      ])
                    }
                  >
                    <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                  </Pressable>
                </View>
              </Card>
            );
          })
        )}
      </View>
    </Screen>
  );
}
