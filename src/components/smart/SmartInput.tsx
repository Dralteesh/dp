import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DictateField } from "@/components/DictateField";
import { Text } from "@/components/ui/Text";
import { useAgendaInput } from "@/hooks/useAgenda";
import { useProcedures } from "@/hooks/useProcedures";
import { applyIntent, previewIntent } from "@/lib/smartActions";
import { parseSmart, smartKindLabel, type SmartIntent, type SmartKind } from "@/lib/smartParse";
import { useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";

const KINDS: SmartKind[] = ["task", "appointment", "alarm", "event", "note"];
const KIND_ICON: Record<SmartKind, string> = {
  task: "checkbox-outline",
  appointment: "calendar-outline",
  alarm: "alarm-outline",
  event: "time-outline",
  note: "create-outline",
};

/**
 * إضافة بجملة واحدة: اكتب أو املِ «غدًا الساعة 5 موعد مع سارة حشوة» ويفهمها التطبيق.
 * يعرض ما فهمه قبل الحفظ ويحذّر من التعارض والتنبيهات الطبية، ويمكن تغيير النوع بلمسة.
 */
export function SmartInput({ onDone, autoFocus }: { onDone?: () => void; autoFocus?: boolean }) {
  const router = useRouter();
  const patients = useClinic((s) => s.patients);
  const procedures = useProcedures();
  const agenda = useAgendaInput();
  const defaultReminder = useSettings((s) => s.defaultReminder);
  const appointmentReminder = useSettings((s) => s.appointmentReminder);
  const [text, setText] = useState("");
  const [override, setOverride] = useState<SmartKind | null>(null);
  const [msg, setMsg] = useState("");

  const intent: SmartIntent | null = useMemo(() => {
    const base = parseSmart(text, new Date(), patients);
    if (!base) return null;
    if (!override || override === base.kind) return base;
    return {
      ...base,
      kind: override,
      eventType: override === "event" ? base.eventType ?? "personal" : base.eventType,
      durationMin: override === "event" ? base.durationMin ?? 60 : override === "appointment" ? base.durationMin ?? 30 : base.durationMin,
    };
  }, [text, override, patients]);

  const preview = useMemo(() => (intent ? previewIntent(intent, agenda, procedures) : null), [intent, agenda, procedures]);

  const submit = () => {
    if (!intent || !preview) return;
    const res = applyIntent(intent, procedures, { defaultReminder, appointmentReminder });
    if (!res.ok) {
      setMsg(res.message);
      return;
    }
    setText("");
    setOverride(null);
    setMsg(res.message);
    onDone?.();
    if (res.route) router.push(res.route as never);
  };

  const blocked = !!preview && preview.missing.length > 0;
  const actionLabel = intent?.kind === "appointment" && preview?.needsForm ? "أكمل الموعد" : "أضف";

  return (
    <View>
      <DictateField
        label="اكتب أو املِ جملة واحدة"
        value={text}
        onChangeText={(v: string) => {
          setText(v);
          setMsg("");
          if (!v.trim()) setOverride(null);
        }}
        placeholder="مثال: غدًا الساعة 5 موعد مع سارة حشوة"
        autoFocus={autoFocus}
        returnKeyType="done"
        onSubmitEditing={submit}
      />

      {intent && preview ? (
        <View className="rounded-2xl border border-line bg-bg p-3 -mt-1 mb-2">
          <View className="flex-row items-center gap-2 mb-2">
            <Ionicons name={KIND_ICON[intent.kind] as never} size={18} color="#0E6FA5" />
            <Text w="semi" className="text-sm flex-1">
              {preview.summary}
            </Text>
          </View>

          <View className="flex-row flex-wrap" style={{ gap: 6 }}>
            {KINDS.map((k) => {
              const on = intent.kind === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => setOverride(k)}
                  className="rounded-full px-3 py-1"
                  style={{ backgroundColor: on ? "#0E6FA5" : "#E2E8F0" }}
                >
                  <Text w="semi" className="text-xs" style={{ color: on ? "#FFFFFF" : "#334155" }}>
                    {smartKindLabel(k)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {preview.missing.map((m) => (
            <Text key={m} className="text-xs mt-2" style={{ color: "#DC2626" }}>
              ينقص: {m} — أضفه للجملة (مثل «الساعة 5»)
            </Text>
          ))}
          {preview.warnings.map((w) => (
            <Text key={w} className="text-xs mt-2" style={{ color: "#B45309" }}>
              ⚠ {w}
            </Text>
          ))}
          {intent.kind === "appointment" && preview.needsForm ? (
            <Text className="text-xs mt-2 text-muted">لم أجد مريضًا بهذا الاسم؛ سيفتح نموذج الموعد لتختاره.</Text>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={blocked}
            className="self-start mt-3 rounded-full px-5 py-2"
            style={{ backgroundColor: blocked ? "#CBD5E1" : "#0E6FA5" }}
            accessibilityLabel={actionLabel}
          >
            <Text w="bold" className="text-sm" style={{ color: "#FFFFFF" }}>
              {actionLabel}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {msg ? (
        <Text className="text-xs mb-2" style={{ color: "#16A34A" }}>
          {msg}
        </Text>
      ) : null}
    </View>
  );
}
