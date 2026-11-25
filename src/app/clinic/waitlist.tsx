import { useMemo, useState } from "react";
import { Alert, Linking, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DateField, TimeField } from "@/components/pickers";
import { DictateField } from "@/components/DictateField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip, Segmented } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Field, FieldRow } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { useTheme } from "@/hooks/useTheme";
import { fmtDateShort, fmtTime } from "@/lib/dates";
import { initial } from "@/lib/format";
import { whatsappLink } from "@/lib/phone";
import { PART_LABEL } from "@/lib/waitlist";
import { useClinic } from "@/store/useClinic";
import { useExtras } from "@/store/useExtras";
import { useSettings } from "@/store/useSettings";
import type { PartOfDay, WaitEntry } from "@/types/extras";
import { useProcedures } from "@/hooks/useProcedures";

const PARTS: PartOfDay[] = ["any", "morning", "afternoon", "evening"];
const STATUS_LABEL: Record<WaitEntry["status"], string> = {
  waiting: "ينتظر",
  notified: "تمت مراسلته",
  booked: "حُجز له",
  dropped: "أُسقط",
};

/** قائمة الانتظار: مرضى يريدون موعدًا أبكر. عند إلغاء موعد يقترح التطبيق من يناسبه الوقت. */
export default function WaitlistScreen() {
  const procedures = useProcedures();
  useTheme();
  const router = useRouter();
  const green = TYPE_META.private.hex;
  const waitlist = useExtras((s) => s.waitlist);
  const addWait = useExtras((s) => s.addWait);
  const setWaitStatus = useExtras((s) => s.setWaitStatus);
  const removeWait = useExtras((s) => s.removeWait);
  const patients = useClinic((s) => s.patients);
  const clinicName = useSettings((s) => s.clinicName);
  const byId = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);

  const [tab, setTab] = useState<"open" | "closed">("open");
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState<string | undefined>();
  const [q, setQ] = useState("");
  const [procedure, setProcedure] = useState("كشف واستشارة");
  const [part, setPart] = useState<PartOfDay>("any");
  const [from, setFrom] = useState<string | undefined>();
  const [to, setTo] = useState<string | undefined>();
  const [day, setDay] = useState<string | undefined>();
  const [time, setTime] = useState<string | undefined>();
  const [notes, setNotes] = useState("");

  const list = useMemo(
    () =>
      waitlist
        .filter((w) => (tab === "open" ? w.status === "waiting" || w.status === "notified" : w.status === "booked" || w.status === "dropped"))
        .sort((a, b) => a.createdAt - b.createdAt),
    [waitlist, tab],
  );
  const matches = useMemo(
    () => patients.filter((p) => !q.trim() || p.name.includes(q.trim()) || (p.phone ?? "").includes(q.trim())).slice(0, 30),
    [patients, q],
  );

  const reset = () => {
    setPatientId(undefined);
    setQ("");
    setProcedure("كشف واستشارة");
    setPart("any");
    setFrom(undefined);
    setTo(undefined);
    setDay(undefined);
    setTime(undefined);
    setNotes("");
  };
  const save = () => {
    if (!patientId) return Alert.alert("اختر المريض");
    if (from && to && from > to) return Alert.alert("النطاق غير صحيح", "تاريخ البداية بعد النهاية.");
    addWait({ patientId, procedure: procedure.trim() || "كشف واستشارة", part, from, to, date: day, time, notes: notes.trim() || undefined });
    setOpen(false);
    reset();
  };

  return (
    <Screen
      title="قائمة الانتظار"
      subtitle="مرضى يريدون موعدًا أبكر"
      back
      overlay={
        <Fab
          color={green}
          onPress={() => {
            reset();
            setOpen(true);
          }}
        />
      }
    >
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "open", label: "بالانتظار" },
          { value: "closed", label: "منتهية" },
        ]}
      />
      <View className="mt-4">
        {list.length === 0 ? (
          <EmptyState icon="hourglass-outline" title={tab === "open" ? "لا أحد بالانتظار" : "لا شيء هنا"} hint="اضغط + لإضافة مريض" />
        ) : (
          list.map((w) => {
            const p = byId.get(w.patientId);
            return (
              <Card key={w.id} accent="private" className="mb-3">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-full bg-private-soft items-center justify-center">
                    <Text w="bold" className="text-private-ink">
                      {initial(p?.name ?? "؟")}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text w="bold">{p?.name ?? "مريض محذوف"}</Text>
                    <Text className="text-xs text-muted">
                      {w.procedure} • {PART_LABEL[w.part]}
                      {w.date ? ` • ${fmtDateShort(w.date)}` : ""}
                      {w.time ? ` ${fmtTime(w.time)}` : ""}
                      {w.from || w.to ? ` • ${w.from ? fmtDateShort(w.from) : "…"} → ${w.to ? fmtDateShort(w.to) : "…"}` : ""}
                    </Text>
                  </View>
                  <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: w.status === "notified" ? "#FEF3C7" : "#F1F5F9" }}>
                    <Text w="semi" className="text-xs" style={{ color: w.status === "notified" ? "#92400E" : "#475569" }}>
                      {STATUS_LABEL[w.status]}
                    </Text>
                  </View>
                </View>
                {w.notes ? <Text className="text-sm mt-2">{w.notes}</Text> : null}
                <View className="flex-row flex-wrap gap-2 mt-3">
                  {w.status === "waiting" || w.status === "notified" ? (
                    <>
                      <Chip
                        label="احجز"
                        icon="calendar"
                        color={green}
                        onPress={() => {
                          const params: Record<string, string> = { patientId: w.patientId, procedure: w.procedure, waitId: w.id };
                          const d = w.date ?? w.from;
                          if (d) params.date = d;
                          if (w.time) params.startTime = w.time;
                          router.push({ pathname: "/clinic/appointment-form", params });
                        }}
                      />
                      {p?.phone ? (
                        <Chip
                          label="واتساب"
                          icon="logo-whatsapp"
                          color="#16A34A"
                          onPress={() => {
                            setWaitStatus(w.id, "notified");
                            Linking.openURL(
                              whatsappLink(p.phone!, `السلام عليكم ${p.name}، عند توفّر موعد أبكر${clinicName ? ` في ${clinicName}` : ""} سنتواصل معك إن شاء الله.`),
                            );
                          }}
                        />
                      ) : null}
                      <Chip label="إسقاط" icon="close" onPress={() => setWaitStatus(w.id, "dropped")} />
                    </>
                  ) : (
                    <Chip label="إعادة للانتظار" icon="refresh" onPress={() => setWaitStatus(w.id, "waiting")} />
                  )}
                  <Pressable
                    hitSlop={8}
                    className="justify-center"
                    onPress={() =>
                      Alert.alert("حذف", "حذف هذا السجل نهائيًا؟", [
                        { text: "إلغاء", style: "cancel" },
                        { text: "حذف", style: "destructive", onPress: () => removeWait(w.id) },
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

      <Sheet visible={open} onClose={() => setOpen(false)} title="إضافة للانتظار">
        <FieldRow label="المريض">
          {patientId ? (
            <Chip label={byId.get(patientId)?.name ?? ""} selected color={green} icon="checkmark" onPress={() => setPatientId(undefined)} />
          ) : (
            <View>
              <Field value={q} onChangeText={setQ} placeholder="بحث بالاسم أو الهاتف" />
              {matches.map((p) => (
                <Pressable key={p.id} onPress={() => setPatientId(p.id)} className="flex-row items-center gap-3 py-2 border-b border-line">
                  <View className="w-8 h-8 rounded-full bg-private-soft items-center justify-center">
                    <Text w="bold" className="text-private-ink">
                      {initial(p.name)}
                    </Text>
                  </View>
                  <Text w="semi">{p.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </FieldRow>
        <FieldRow label="الإجراء">
          <View className="flex-row flex-wrap gap-2">
            {procedures.slice(0, 6).map((p) => (
              <Chip key={p.name} label={p.name} selected={procedure === p.name} color={green} onPress={() => setProcedure(p.name)} />
            ))}
          </View>
        </FieldRow>
        <FieldRow label="الوقت المناسب">
          <View className="flex-row flex-wrap gap-2">
            {PARTS.map((x) => (
              <Chip key={x} label={PART_LABEL[x]} selected={part === x} color={green} onPress={() => setPart(x)} />
            ))}
          </View>
        </FieldRow>
        <DateField label="يوم محدد (اختياري)" value={day} onChange={setDay} clearable placeholder="بدون تحديد" />
        <TimeField label="ساعة محددة (اختياري)" value={time} onChange={setTime} clearable onClear={() => setTime(undefined)} placeholder="بدون تحديد" />
        <DateField label="من تاريخ (اختياري)" value={from} onChange={setFrom} clearable placeholder="أي يوم" />
        <DateField label="إلى تاريخ (اختياري)" value={to} onChange={setTo} clearable placeholder="بلا حد" />
        <DictateField label="ملاحظات" value={notes} onChangeText={setNotes} multiline />
        <Button label="إضافة" icon="checkmark" type="private" onPress={save} />
      </Sheet>
    </Screen>
  );
}
