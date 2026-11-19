import { useMemo, useState } from "react";
import { Alert, Pressable, Share, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DateField, TimeField } from "@/components/pickers";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip, Segmented } from "@/components/ui/Chip";
import { EmptyState, SectionHeader } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Field, FieldRow } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { useTheme } from "@/hooks/useTheme";
import { addDays, fmtDateShort, pad, todayISO } from "@/lib/dates";
import { parseAmount } from "@/lib/format";
import { LOAD_PRESETS, SPORE_EVERY_DAYS, activeSterileLoads, cycleExpiry, cycleState, logText, sporeStatus } from "@/lib/sterilization";
import { useExtras } from "@/store/useExtras";

const STATE_META = {
  valid: { label: "صالحة", bg: "#DCFCE7", fg: "#14532D" },
  expiring: { label: "تنتهي قريبًا", bg: "#FEF3C7", fg: "#92400E" },
  expired: { label: "منتهية", bg: "#E5E7EB", fg: "#374151" },
  failed: { label: "فاشلة", bg: "#FEE2E2", fg: "#991B1B" },
} as const;

/** سجل التعقيم: دورات الأوتوكلاف والاختبار البيولوجي مع صلاحية الأدوات المعقّمة */
export default function SterilizationScreen() {
  useTheme();
  const green = TYPE_META.private.hex;
  const cycles = useExtras((s) => s.sterilization);
  const addCycle = useExtras((s) => s.addCycle);
  const removeCycle = useExtras((s) => s.removeCycle);

  const today = todayISO();
  const lastDevice = cycles.find((c) => c.device)?.device ?? "";

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"cycle" | "spore">("cycle");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("09:00");
  const [device, setDevice] = useState("");
  const [load, setLoad] = useState("");
  const [temp, setTemp] = useState<number | undefined>(134);
  const [mins, setMins] = useState<number | undefined>(4);
  const [passed, setPassed] = useState(true);
  const [validDays, setValidDays] = useState("30");
  const [notes, setNotes] = useState("");

  const spore = useMemo(() => sporeStatus(cycles, today), [cycles, today]);
  const active = useMemo(() => activeSterileLoads(cycles, today), [cycles, today]);
  const expiring = active.filter((c) => cycleState(c, today) === "expiring");
  const failedRecent = cycles.filter((c) => !c.passed && c.date >= addDays(today, -7));

  const grouped = useMemo(() => {
    const map = new Map<string, typeof cycles>();
    for (const c of [...cycles].sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1)).slice(0, 80)) {
      map.set(c.date, [...(map.get(c.date) ?? []), c]);
    }
    return [...map.entries()];
  }, [cycles]);

  const openNew = () => {
    const d = new Date();
    setKind("cycle");
    setDate(today);
    setTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    setDevice(lastDevice);
    setLoad("");
    setTemp(134);
    setMins(4);
    setPassed(true);
    setValidDays("30");
    setNotes("");
    setOpen(true);
  };

  const save = () => {
    if (!device.trim()) return Alert.alert("اسم الجهاز مطلوب", "مثال: أوتوكلاف 1");
    addCycle({
      kind,
      date,
      time,
      device: device.trim(),
      load: kind === "cycle" ? load.trim() : "",
      tempC: kind === "cycle" ? temp : undefined,
      minutes: kind === "cycle" ? mins : undefined,
      passed,
      validDays: kind === "cycle" ? Math.round(parseAmount(validDays)) : 0,
      notes: notes.trim() || undefined,
    });
    setOpen(false);
  };

  const shareLog = () => {
    const from = addDays(today, -30);
    const rows = cycles.filter((c) => c.date >= from);
    if (!rows.length) return Alert.alert("لا سجلات في آخر 30 يومًا");
    Share.share({ message: logText(rows, "سجل التعقيم — آخر 30 يومًا") });
  };

  return (
    <Screen title="سجل التعقيم" subtitle="دورات الأوتوكلاف والاختبار البيولوجي" back overlay={<Fab color={green} onPress={openNew} />}>
      {failedRecent.length > 0 ? (
        <View className="rounded-2xl p-3 mb-3" style={{ backgroundColor: "#FEE2E2" }}>
          <Text w="bold" style={{ color: "#991B1B" }}>
            دورة فاشلة خلال آخر 7 أيام
          </Text>
          <Text className="text-xs mt-0.5" style={{ color: "#991B1B" }}>
            أعد تعقيم أدوات تلك الدورة قبل استعمالها.
          </Text>
        </View>
      ) : null}

      <View className="flex-row gap-2.5 mb-3">
        <View className="flex-1 rounded-2xl p-3" style={{ backgroundColor: spore.overdue ? "#FEF3C7" : "#DCFCE7" }}>
          <Text className="text-xs" style={{ color: spore.overdue ? "#92400E" : "#14532D" }}>
            الاختبار البيولوجي
          </Text>
          <Text w="bold" style={{ color: spore.overdue ? "#92400E" : "#14532D" }}>
            {spore.daysSince === null ? "لم يُسجَّل" : spore.daysSince === 0 ? "اليوم" : `قبل ${spore.daysSince} يوم`}
          </Text>
          <Text className="text-xs" style={{ color: spore.overdue ? "#92400E" : "#14532D" }}>
            {spore.overdue ? `متأخر (الموصى: كل ${SPORE_EVERY_DAYS} أيام)` : "ضمن المدة"}
          </Text>
        </View>
        <View className="flex-1 rounded-2xl p-3" style={{ backgroundColor: "#DBEAFE" }}>
          <Text className="text-xs" style={{ color: "#1E3A8A" }}>
            حمولات صالحة
          </Text>
          <Text w="bold" className="text-2xl" style={{ color: "#1E3A8A" }}>
            {active.length}
          </Text>
          <Text className="text-xs" style={{ color: "#1E3A8A" }}>
            {expiring.length ? `${expiring.length} تنتهي قريبًا` : "لا شيء ينتهي قريبًا"}
          </Text>
        </View>
      </View>

      <Button label="مشاركة سجل آخر 30 يومًا" icon="share-social" variant="soft" small onPress={shareLog} />

      {grouped.length === 0 ? (
        <EmptyState icon="flask-outline" title="لا سجلات" hint="اضغط + لتسجيل أول دورة تعقيم" />
      ) : (
        grouped.map(([d, rows]) => (
          <View key={d}>
            <SectionHeader title={d === today ? "اليوم" : fmtDateShort(d)} />
            {rows.map((c) => {
              const st = STATE_META[cycleState(c, today)];
              const exp = cycleExpiry(c);
              return (
                <Card key={c.id} className="mb-2.5">
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: st.bg }}>
                      <Ionicons name={c.kind === "spore" ? "flask" : "flame"} size={20} color={st.fg} />
                    </View>
                    <View className="flex-1">
                      <Text w="semi">
                        {c.kind === "spore" ? "اختبار بيولوجي" : c.load || "دورة تعقيم"} • {c.time}
                      </Text>
                      <Text className="text-xs text-muted">
                        {c.device}
                        {c.tempC ? ` • ${c.tempC}°م` : ""}
                        {c.minutes ? ` / ${c.minutes} د` : ""}
                        {exp ? ` • صالح حتى ${fmtDateShort(exp)}` : ""}
                      </Text>
                    </View>
                    <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: st.bg }}>
                      <Text w="semi" className="text-xs" style={{ color: st.fg }}>
                        {c.kind === "spore" ? (c.passed ? "ناجح" : "فاشل") : st.label}
                      </Text>
                    </View>
                    <Pressable
                      hitSlop={10}
                      onPress={() =>
                        Alert.alert("حذف السجل", "حذف هذا السجل؟", [
                          { text: "إلغاء", style: "cancel" },
                          { text: "حذف", style: "destructive", onPress: () => removeCycle(c.id) },
                        ])
                      }
                    >
                      <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                    </Pressable>
                  </View>
                  {c.notes ? <Text className="text-xs text-muted mt-2">{c.notes}</Text> : null}
                </Card>
              );
            })}
          </View>
        ))
      )}

      <Sheet visible={open} onClose={() => setOpen(false)} title="تسجيل تعقيم">
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: "cycle", label: "دورة تعقيم" },
            { value: "spore", label: "اختبار بيولوجي" },
          ]}
        />
        <View className="h-3" />
        <DateField label="التاريخ" value={date} onChange={(v) => v && setDate(v)} />
        <TimeField label="الوقت" value={time} onChange={setTime} />
        <Field label="الجهاز" value={device} onChangeText={setDevice} placeholder="أوتوكلاف 1" />
        {kind === "cycle" ? (
          <>
            <FieldRow label="الحمولة">
              <View className="flex-row flex-wrap gap-2">
                {LOAD_PRESETS.map((l) => (
                  <Chip key={l} label={l} selected={load === l} color={green} onPress={() => setLoad(l)} />
                ))}
              </View>
            </FieldRow>
            <Field value={load} onChangeText={setLoad} placeholder="أو اكتب الحمولة" />
            <FieldRow label="الحرارة (°م)">
              <View className="flex-row gap-2">
                {[121, 134].map((t) => (
                  <Chip key={t} label={`${t}`} selected={temp === t} color={green} onPress={() => setTemp(t)} />
                ))}
              </View>
            </FieldRow>
            <FieldRow label="مدة الدورة (دقائق)">
              <View className="flex-row gap-2">
                {[4, 15, 20, 30].map((t) => (
                  <Chip key={t} label={`${t}`} selected={mins === t} color={green} onPress={() => setMins(t)} />
                ))}
              </View>
            </FieldRow>
          </>
        ) : null}
        <FieldRow label="النتيجة">
          <View className="flex-row gap-2">
            <Chip label="ناجح" icon="checkmark" selected={passed} color="#16A34A" onPress={() => setPassed(true)} />
            <Chip label="فاشل" icon="close" selected={!passed} color="#DC2626" onPress={() => setPassed(false)} />
          </View>
        </FieldRow>
        {kind === "cycle" && passed ? (
          <FieldRow label="صلاحية الأدوات المعقّمة (أيام)">
            <View className="flex-row flex-wrap gap-2 mb-2">
              {["7", "14", "30"].map((d) => (
                <Chip key={d} label={d} selected={validDays === d} color={green} onPress={() => setValidDays(d)} />
              ))}
            </View>
            <Field value={validDays} onChangeText={setValidDays} keyboardType="number-pad" />
          </FieldRow>
        ) : null}
        <Field label="ملاحظات" value={notes} onChangeText={setNotes} />
        <Button label="حفظ" icon="checkmark" type="private" onPress={save} />
      </Sheet>
    </Screen>
  );
}
