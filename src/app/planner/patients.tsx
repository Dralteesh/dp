import { useMemo, useState } from "react";
import { FlatList, Image, Pressable, ScrollView, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PatientPanel } from "@/components/planner/PatientPanel";
import { PCard, PlannerShell, ProcAvatar } from "@/components/planner/kit";
import { Text } from "@/components/ui/Text";
import { TREATMENT_ICONS } from "@/constants/icons";
import { PL } from "@/design/planner";
import { useLayout } from "@/hooks/useLayout";
import { lastProcedure } from "@/lib/plannerProc";
import { useClinic } from "@/store/useClinic";
import type { Patient } from "@/types";

/** قائمة المرضى (الواجهة الجديدة) */
export default function PlannerPatients() {
  const router = useRouter();
  const { isWide } = useLayout();
  const [sel, setSel] = useState<string | null>(null);
  const patients = useClinic((s) => s.patients);
  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return patients
      .filter((p) => (onlyActive ? p.status === "active" : true))
      .filter((p) => !t || p.name.toLowerCase().includes(t) || (p.phone ?? "").includes(t) || (p.fileNumber ?? "").includes(t))
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [patients, q, onlyActive]);

  return (
    <PlannerShell
      title="المرضى"
      nav="patients"
      scroll={false}
      maxWidth={1200}
      right={
        <Pressable
          onPress={() => router.push("/clinic/patient-form" as never)}
          hitSlop={8}
          accessibilityLabel="مريض جديد"
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: PL.navy, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      }
    >
      <View style={{ flex: 1, flexDirection: "row", gap: 16 }}>
      <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: PL.card, borderRadius: 999, paddingHorizontal: 14, borderWidth: 1, borderColor: PL.border }}>
        <Ionicons name="search" size={18} color={PL.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="ابحث بالاسم أو الهاتف..."
          placeholderTextColor={PL.muted}
          style={{ flex: 1, paddingVertical: 10, fontFamily: "Cairo_400Regular", color: PL.navy, textAlign: "right" }}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginVertical: 10 }}>
        {[
          { label: "الكل", on: !onlyActive, set: () => setOnlyActive(false) },
          { label: "قيد المعالجة", on: onlyActive, set: () => setOnlyActive(true) },
        ].map((c) => (
          <Pressable key={c.label} onPress={c.set} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: c.on ? PL.navy : PL.card }}>
            <Text w="semi" style={{ fontSize: 12.5, color: c.on ? "#fff" : PL.navy }}>
              {c.label}
            </Text>
          </Pressable>
        ))}
        <Text style={{ marginStart: "auto", alignSelf: "center", fontSize: 12, color: PL.muted }}>{list.length} مريض</Text>
      </View>

      <View style={{ flex: 1 }}>
        {list.length === 0 ? (
          <PCard style={{ alignItems: "center", paddingVertical: 28 }}>
            <Image source={TREATMENT_ICONS.exam} style={{ width: 56, height: 56 }} resizeMode="contain" />
            <Text w="semi" style={{ color: PL.navy }}>
              لا نتائج
            </Text>
          </PCard>
        ) : (
          <FlatListLazy list={list} onPick={isWide ? setSel : undefined} />
        )}
      </View>
      </View>
      {isWide ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {sel ? (
            <PatientPanel id={sel} />
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 60 }}>
              <Text w="semi" style={{ color: PL.muted }}>اختر مريضًا لعرض تفاصيله</Text>
            </View>
          )}
        </ScrollView>
      ) : null}
      </View>
    </PlannerShell>
  );
}


function FlatListLazy({ list, onPick }: { list: Patient[]; onPick?: (id: string) => void }) {
  const router = useRouter();
  const appointments = useClinic((s) => s.appointments);
  const sessions = useClinic((s) => s.sessions);
  return (
    <FlatList
      data={list}
      keyExtractor={(p) => p.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
      renderItem={({ item: p }) => (
        <PCard
          onPress={() => (onPick ? onPick(p.id) : router.push({ pathname: "/planner/patient/[id]", params: { id: p.id } } as never))}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10 }}
        >
          <ProcAvatar procedure={lastProcedure(p.id, appointments, sessions)} name={p.name} gender={p.gender} size={46} />
          <View style={{ flex: 1 }}>
            <Text w="bold" numberOfLines={1} style={{ color: PL.navy }}>
              {p.name}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 12, color: PL.muted }}>
              {p.phone || "بلا هاتف"}
              {p.fileNumber ? `  •  #${p.fileNumber}` : ""}
            </Text>
          </View>
          <View style={{ backgroundColor: p.status === "active" ? PL.goodSoft : "#E5E7EB", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Text w="semi" style={{ fontSize: 11, color: p.status === "active" ? PL.good : "#6B7280" }}>
              {p.status === "active" ? "✓ نشط" : "منتهي"}
            </Text>
          </View>
        </PCard>
      )}
    />
  );
}
