import { useMemo, useState } from "react";
import { Linking, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { combine, toISO } from "@/lib/dates";
import { whatsappLink } from "@/lib/phone";
import { PART_LABEL, slotCandidates, slotMessage } from "@/lib/waitlist";
import { useClinic } from "@/store/useClinic";
import { useExtras } from "@/store/useExtras";
import { useSettings } from "@/store/useSettings";
import type { Appointment } from "@/types";

/**
 * يظهر تحت موعد ملغى/مؤجل قادم إن كان في قائمة الانتظار من يناسبه هذا الوقت،
 * ويتيح مراسلته بواتساب أو حجز الموعد له مباشرة.
 */
export function FreeSlotBanner({ appt }: { appt: Appointment }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const waitlist = useExtras((s) => s.waitlist);
  const setWaitStatus = useExtras((s) => s.setWaitStatus);
  const patients = useClinic((s) => s.patients);
  const clinicName = useSettings((s) => s.clinicName);

  const freed = (appt.status === "cancelled" || appt.status === "postponed") && combine(appt.date, appt.startTime) > new Date();
  const list = useMemo(
    () =>
      freed
        ? slotCandidates(waitlist, patients, { date: appt.date, startTime: appt.startTime, excludePatientId: appt.patientId }, toISO(new Date()))
        : [],
    [freed, waitlist, patients, appt.date, appt.startTime, appt.patientId],
  );
  if (!list.length) return null;

  return (
    <>
      <View className="flex-row items-center gap-2 mt-3 bg-amber-50 border border-amber-300 rounded-xl px-3 py-2">
        <Ionicons name="hourglass" size={16} color="#B45309" />
        <Text className="flex-1 text-sm" style={{ color: "#92400E" }}>
          وقت شاغر • {list.length} في قائمة الانتظار يناسبهم
        </Text>
        <Text w="bold" className="text-sm" style={{ color: "#92400E" }} onPress={() => setOpen(true)}>
          عرض
        </Text>
      </View>

      <Sheet visible={open} onClose={() => setOpen(false)} title="من يناسبه هذا الموعد؟">
        {list.map(({ entry, patient }) => (
          <View key={entry.id} className="border-b border-line py-3">
            <Text w="bold">{patient.name}</Text>
            <Text className="text-xs text-muted mb-2">
              {entry.procedure} • {PART_LABEL[entry.part]}
              {entry.status === "notified" ? " • سبق مراسلته" : ""}
            </Text>
            <View className="flex-row gap-2">
              {patient.phone ? (
                <View className="flex-1">
                  <Button
                    label="واتساب"
                    icon="logo-whatsapp"
                    variant="soft"
                    type="private"
                    small
                    onPress={() => {
                      setWaitStatus(entry.id, "notified");
                      Linking.openURL(whatsappLink(patient.phone!, slotMessage(patient.name, appt.date, appt.startTime, clinicName)));
                    }}
                  />
                </View>
              ) : null}
              <View className="flex-1">
                <Button
                  label="احجز له"
                  icon="calendar"
                  type="private"
                  small
                  onPress={() => {
                    setWaitStatus(entry.id, "booked");
                    setOpen(false);
                    router.push({
                      pathname: "/clinic/appointment-form",
                      params: { patientId: patient.id, date: appt.date, startTime: appt.startTime, procedure: entry.procedure },
                    });
                  }}
                />
              </View>
            </View>
          </View>
        ))}
      </Sheet>
    </>
  );
}
