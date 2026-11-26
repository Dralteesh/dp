import { useMemo, useState } from "react";
import { Linking, Pressable, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ProcedureGlyph } from "@/components/clinic/ProcedureIcon";
import { ProcedureImageSheet } from "@/components/clinic/ProcedureImageSheet";
import { PCard, PlannerShell, SectionTitle } from "@/components/planner/kit";
import { Text } from "@/components/ui/Text";
import { PL } from "@/design/planner";
import { useLayout } from "@/hooks/useLayout";
import { useProcedures } from "@/hooks/useProcedures";
import { recallCandidates } from "@/lib/followups";
import { whatsappLink } from "@/lib/phone";
import { useClinic } from "@/store/useClinic";
import { usePlanner } from "@/store/usePlanner";
import type { ProcedureDef } from "@/types";

/** العلاجات والتذكيرات (الواجهة الجديدة) */
export default function PlannerTreatments() {
  const router = useRouter();
  const { isWide } = useLayout();
  const procedures = useProcedures();
  const patients = useClinic((s) => s.patients);
  const sessions = useClinic((s) => s.sessions);
  const appointments = useClinic((s) => s.appointments);
  const updatePatient = useClinic((s) => s.updatePatient);
  const tasks = usePlanner((s) => s.tasks);
  const toggleTask = usePlanner((s) => s.toggleTask);
  const [q, setQ] = useState("");
  const [imgFor, setImgFor] = useState<ProcedureDef | null>(null);

  const shown = useMemo(() => {
    const t = q.trim();
    return t ? procedures.filter((p) => p.name.includes(t) || p.keywords.some((k) => k.includes(t))) : procedures;
  }, [procedures, q]);
  const recalls = useMemo(() => recallCandidates(patients, sessions, appointments, 6).slice(0, 5), [patients, sessions, appointments]);
  const openTasks = useMemo(() => tasks.filter((t) => !t.done).slice(0, 6), [tasks]);

  const book = (procedure: string) => router.push({ pathname: "/clinic/appointment-form", params: { procedure } } as never);

  return (
    <PlannerShell
      title="العلاجات"
      maxWidth={1000}
      right={
        <Pressable
          onPress={() => router.push("/clinic/procedures" as never)}
          hitSlop={8}
          accessibilityLabel="تعديل الإجراءات"
          style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="create-outline" size={24} color={PL.navy} />
        </Pressable>
      }
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: PL.card, borderRadius: 999, paddingHorizontal: 14, borderWidth: 1, borderColor: PL.border }}>
        <Ionicons name="search" size={18} color={PL.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="ابحث عن علاج..."
          placeholderTextColor={PL.muted}
          style={{ flex: 1, paddingVertical: 10, fontFamily: "Cairo_400Regular", color: PL.navy, textAlign: "right" }}
        />
      </View>

      <Text style={{ fontSize: 11.5, color: PL.muted, textAlign: "center", marginTop: 8 }}>اضغط مطوّلًا على إجراء لتعديل صورته</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
        {shown.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => book(p.name)}
            onLongPress={() => setImgFor(p)}
            delayLongPress={350}
            style={{ width: isWide ? "18%" : "31.5%", aspectRatio: 1, borderRadius: 20, backgroundColor: PL.card, borderWidth: 1, borderColor: PL.border, alignItems: "center", justifyContent: "center", gap: 4, padding: 6 }}
          >
            <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: PL.white, alignItems: "center", justifyContent: "center" }}>
              <ProcedureGlyph icon={p.icon} size={46} color={PL.blue} />
            </View>
            <Text w="semi" numberOfLines={1} style={{ fontSize: 12, color: PL.navy }}>
              {p.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <SectionTitle title="التذكيرات" action="كل المتابعات" onAction={() => router.push("/clinic/followups" as never)} />
      <View style={{ gap: 10 }}>
        {recalls.map((r) => (
          <PCard key={r.patient.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10 }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: PL.white, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="notifications-outline" size={22} color={PL.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text w="bold" numberOfLines={1} style={{ color: PL.navy }}>
                متابعة مريض
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 12, color: PL.muted }}>
                {r.patient.name} • منذ {Math.round(r.daysSince / 30)} أشهر
              </Text>
            </View>
            <Pressable
              hitSlop={8}
              accessibilityLabel="مراسلة"
              onPress={() => {
                if (!r.patient.phone) return;
                updatePatient(r.patient.id, { recalledAt: Date.now() });
                Linking.openURL(whatsappLink(r.patient.phone, `مرحبًا ${r.patient.name}، حان وقت مراجعتك الدورية. هل نحجز لك موعدًا؟`));
              }}
            >
              <Ionicons name="logo-whatsapp" size={24} color={PL.good} />
            </Pressable>
          </PCard>
        ))}
        {openTasks.map((t) => (
          <PCard key={t.id} onPress={() => toggleTask(t.id)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10 }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: PL.white, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="checkbox-outline" size={22} color={PL.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text w="bold" numberOfLines={1} style={{ color: PL.navy }}>
                {t.title}
              </Text>
              {t.dueDate ? <Text style={{ fontSize: 12, color: PL.muted }}>{t.dueDate}</Text> : null}
            </View>
            <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: PL.blueSoft }} />
          </PCard>
        ))}
        {recalls.length === 0 && openTasks.length === 0 ? (
          <PCard style={{ alignItems: "center", paddingVertical: 20 }}>
            <Text w="semi" style={{ color: PL.navy }}>
              لا تذكيرات الآن ✨
            </Text>
          </PCard>
        ) : null}
      </View>
      <ProcedureImageSheet proc={imgFor} onClose={() => setImgFor(null)} />
    </PlannerShell>
  );
}
