import { useRouter } from "expo-router";
import type { AgendaItem } from "@/lib/agenda";
import { useClinic } from "@/store/useClinic";

/** يفتح العنصر المناسب: الحدث للتعديل، أو ملف المريض للموعد */
export function useOpenAgendaItem() {
  const router = useRouter();
  const appointments = useClinic((s) => s.appointments);

  return (it: AgendaItem) => {
    if (it.source === "event") {
      router.push({ pathname: "/event/[id]", params: { id: it.refId } });
      return;
    }
    const a = appointments.find((x) => x.id === it.refId);
    if (a) router.push({ pathname: "/clinic/patient/[id]", params: { id: a.patientId } });
  };
}
