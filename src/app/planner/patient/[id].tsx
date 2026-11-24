import { Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PatientPanel } from "@/components/planner/PatientPanel";
import { PlannerShell } from "@/components/planner/kit";
import { PL } from "@/design/planner";

/** تفاصيل المريض (الواجهة الجديدة) */
export default function PlannerPatient() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <PlannerShell
      title="تفاصيل المريض"
      back
      right={
        <Pressable
          onPress={() => router.push({ pathname: "/clinic/patient/[id]", params: { id } } as never)}
          hitSlop={8}
          accessibilityLabel="الملف الكامل"
          style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="ellipsis-vertical" size={22} color={PL.navy} />
        </Pressable>
      }
    >
      <PatientPanel id={String(id)} />
    </PlannerShell>
  );
}
