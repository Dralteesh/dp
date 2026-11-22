import { useMemo, useState } from "react";
import { Alert, Linking, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip, Segmented } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { useTheme } from "@/hooks/useTheme";
import { addDays, fmtDateFull, fmtTime, todayISO } from "@/lib/dates";
import { appointmentsOn, recallCandidates } from "@/lib/followups";
import { whatsappLink } from "@/lib/phone";
import { useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";

type Tab = "remind" | "recall";

/** تذكير مواعيد يوم معيّن واستدعاء المرضى الغائبين، برسائل واتساب جاهزة */
export default function FollowupsScreen() {
  useTheme();
  const patients = useClinic((s) => s.patients);
  const appointments = useClinic((s) => s.appointments);
  const sessions = useClinic((s) => s.sessions);
  const updateAppointment = useClinic((s) => s.updateAppointment);
  const updatePatient = useClinic((s) => s.updatePatient);
  const clinicName = useSettings((s) => s.clinicName);

  const [tab, setTab] = useState<Tab>("remind");
  const [offset, setOffset] = useState(1); // 0 اليوم، 1 غدًا، 2 بعد غد
  const [months, setMonths] = useState(6);

  const green = TYPE_META.private.hex;
  const sign = clinicName ? ` — ${clinicName}` : "";
  const date = addDays(todayISO(), offset);

  const appts = useMemo(() => appointmentsOn(appointments, date), [appointments, date]);
  const recall = useMemo(
    () => recallCandidates(patients, sessions, appointments, months),
    [patients, sessions, appointments, months],
  );
  const pat = (id: string) => patients.find((p) => p.id === id);

  const open = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("تعذّر فتح واتساب", "تأكد من تثبيت واتساب على الهاتف.");
    }
  };

  const sendReminder = (id: string) => {
    const a = appointments.find((x) => x.id === id);
    const p = a && pat(a.patientId);
    if (!a || !p?.phone) return;
    const text = `السلام عليكم ${p.name}، تذكير بموعدك في العيادة ${fmtDateFull(a.date)} الساعة ${fmtTime(a.startTime)} (${a.procedure}). نرجو التأكيد. شكرًا${sign}.`;
    updateAppointment(a.id, { remindedAt: Date.now() });
    open(whatsappLink(p.phone, text));
  };

  const sendRecall = (id: string) => {
    const p = pat(id);
    if (!p?.phone) return;
    const text = `السلام عليكم ${p.name}، نطمئن عليك ونذكّرك أن موعد فحصك الدوري قد حان. يسعدنا ترتيب موعد يناسبك. شكرًا${sign}.`;
    updatePatient(p.id, { recalledAt: Date.now() });
    open(whatsappLink(p.phone, text));
  };

  const nextUnsent = () => {
    const a = appts.find((x) => !x.remindedAt && pat(x.patientId)?.phone);
    if (!a) return Alert.alert("اكتمل", "لا مواعيد أخرى تنتظر التذكير.");
    sendReminder(a.id);
  };

  const pending = appts.filter((a) => !a.remindedAt && pat(a.patientId)?.phone).length;

  return (
    <Screen title="التذكير والمتابعة" subtitle="رسائل واتساب جاهزة" back>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "remind", label: "تذكير بالمواعيد" },
          { value: "recall", label: "استدعاء المرضى" },
        ]}
      />

      {tab === "remind" ? (
        <View className="mt-4">
          <View className="flex-row gap-2 mb-3">
            {[
              { v: 0, l: "اليوم" },
              { v: 1, l: "غدًا" },
              { v: 2, l: "بعد غد" },
            ].map((x) => (
              <Chip key={x.v} label={x.l} selected={offset === x.v} color={green} onPress={() => setOffset(x.v)} />
            ))}
          </View>
          <Text className="text-sm text-muted mb-3">{fmtDateFull(date)}</Text>

          {appts.length > 0 ? (
            <View className="mb-3">
              <Button
                label={pending > 0 ? `إرسال التالي (${pending} متبقٍ)` : "تم تذكير الجميع"}
                icon="logo-whatsapp"
                type="private"
                disabled={pending === 0}
                onPress={nextUnsent}
              />
              <Text className="text-xs text-muted mt-1.5">
                يفتح واتساب برسالة جاهزة للمريض التالي. أرسلها ثم ارجع للتطبيق واضغط التالي.
              </Text>
            </View>
          ) : null}

          {appts.length === 0 ? (
            <EmptyState icon="calendar-outline" title="لا مواعيد مجدولة" hint="لا مواعيد بحالة «مجدول» في هذا اليوم" />
          ) : (
            appts.map((a) => {
              const p = pat(a.patientId);
              return (
                <Card key={a.id} className="mb-2.5">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text w="bold">{p?.name ?? "—"}</Text>
                      <Text className="text-sm text-muted">
                        {fmtTime(a.startTime)} • {a.procedure}
                      </Text>
                      {!p?.phone ? <Text className="text-xs text-red-600">لا رقم هاتف</Text> : null}
                    </View>
                    {a.remindedAt ? (
                      <View className="flex-row items-center gap-1 me-2">
                        <Ionicons name="checkmark-done" size={18} color={green} />
                        <Text className="text-xs" style={{ color: green }}>
                          فُتحت المحادثة
                        </Text>
                      </View>
                    ) : null}
                    <Pressable
                      disabled={!p?.phone}
                      onPress={() => sendReminder(a.id)}
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{ backgroundColor: p?.phone ? TYPE_META.private.soft : "#F1F5F9" }}
                    >
                      <Ionicons name="logo-whatsapp" size={20} color={p?.phone ? green : "#94A3B8"} />
                    </Pressable>
                  </View>
                </Card>
              );
            })
          )}
        </View>
      ) : (
        <View className="mt-4">
          <Text className="text-sm text-muted mb-2">مرضى لم يزوروا منذ:</Text>
          <View className="flex-row gap-2 mb-3">
            {[3, 6, 12].map((m) => (
              <Chip key={m} label={`${m} أشهر`} selected={months === m} color={green} onPress={() => setMonths(m)} />
            ))}
          </View>
          <Text className="text-xs text-muted mb-3">
            يظهر من له رقم هاتف ولا موعد قادم له. من راسلته يختفي 30 يومًا حتى لا تكرر الرسالة.
          </Text>

          {recall.length === 0 ? (
            <EmptyState icon="happy-outline" title="لا أحد للاستدعاء" hint="كل مرضاك زاروك مؤخرًا أو لهم موعد قادم" />
          ) : (
            recall.map((r) => (
              <Card key={r.patient.id} className="mb-2.5">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text w="bold">{r.patient.name}</Text>
                    <Text className="text-sm text-muted">
                      آخر زيارة {r.last} • منذ {r.daysSince >= 60 ? `${Math.round(r.daysSince / 30)} أشهر` : `${r.daysSince} يومًا`}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => sendRecall(r.patient.id)}
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: TYPE_META.private.soft }}
                  >
                    <Ionicons name="logo-whatsapp" size={20} color={green} />
                  </Pressable>
                </View>
              </Card>
            ))
          )}
        </View>
      )}
    </Screen>
  );
}
