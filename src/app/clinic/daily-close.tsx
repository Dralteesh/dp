import { useMemo, useState } from "react";
import { Linking, Pressable, Share, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { DateField } from "@/components/pickers";
import { STATUS_META } from "@/constants/clinic";
import { TYPE_META } from "@/constants/shiftTypes";
import { useTheme } from "@/hooks/useTheme";
import { addDays, toISO } from "@/lib/dates";
import { fmtMoney } from "@/lib/format";
import { whatsappLink } from "@/lib/phone";
import { patientBalance, useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";

/** الإغلاق اليومي: المقبوض، الذمم الجديدة، المواعيد، ومن زارنا اليوم وبقي عليه رصيد */
export default function DailyCloseScreen() {
  useTheme();
  const green = TYPE_META.private.hex;
  const currency = useSettings((s) => s.currency);
  const clinicName = useSettings((s) => s.clinicName);
  const [date, setDate] = useState(toISO(new Date()));
  const closedThrough = useSettings((s) => s.closedThrough);
  const updateSettings = useSettings((s) => s.update);
  const patients = useClinic((s) => s.patients);
  const appointments = useClinic((s) => s.appointments);
  const sessions = useClinic((s) => s.sessions);
  const payments = useClinic((s) => s.payments);
  const byId = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);

  const d = useMemo(() => {
    const pays = payments.filter((p) => p.date === date);
    const sess = sessions.filter((s) => s.date === date);
    const appts = appointments.filter((a) => a.date === date);
    const collected = pays.reduce((a, p) => a + p.amount, 0);
    const charged = sess.reduce((a, s) => a + s.cost, 0);
    const counts: Record<string, number> = {};
    for (const a of appts) counts[a.status] = (counts[a.status] ?? 0) + 1;
    // مرضى زاروا اليوم (موعد منتهٍ أو جلسة) وما زال عليهم رصيد
    const seen = new Set<string>([...appts.filter((a) => a.status === "done" || a.status === "arrived").map((a) => a.patientId), ...sess.map((s) => s.patientId)]);
    const owing = [...seen]
      .map((id) => ({ id, bal: patientBalance(id, sessions, payments).balance }))
      .filter((x) => x.bal > 0)
      .sort((a, b) => b.bal - a.bal);
    return { pays, sess, appts, collected, charged, counts, owing };
  }, [date, payments, sessions, appointments]);

  const summary = () =>
    [
      `إغلاق ${clinicName || "العيادة"} — ${date}`,
      `المقبوض: ${fmtMoney(d.collected, currency)} (${d.pays.length} دفعة)`,
      `المستحق الجديد (علاجات/ذمم): ${fmtMoney(d.charged, currency)}`,
      `المواعيد: ${d.appts.length}${Object.keys(d.counts).length ? ` (${Object.entries(d.counts).map(([k, v]) => `${STATUS_META[k as keyof typeof STATUS_META]?.label ?? k} ${v}`).join("، ")})` : ""}`,
      d.owing.length ? `عليهم رصيد:\n${d.owing.map((o) => `- ${byId.get(o.id)?.name ?? "مريض"}: ${fmtMoney(o.bal, currency)}`).join("\n")}` : "لا أرصدة على من زاروا اليوم.",
    ].join("\n");

  const Stat = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <View style={{ width: "50%" }} className="mb-2">
      <Text className="text-xs text-muted">{label}</Text>
      <Text w="bold" style={{ color: color ?? "#0F172A" }}>{value}</Text>
    </View>
  );

  return (
    <Screen title="الإغلاق اليومي" subtitle={date} back>
      <DateField label="اليوم" value={date} onChange={(v) => v && setDate(v)} />
      <Card className="mb-3">
        <View className="flex-row flex-wrap">
          <Stat label="المقبوض" value={fmtMoney(d.collected, currency)} color="#16A34A" />
          <Stat label="المستحق الجديد" value={fmtMoney(d.charged, currency)} />
          <Stat label="عدد الدفعات" value={String(d.pays.length)} />
          <Stat label="عدد المواعيد" value={String(d.appts.length)} />
        </View>
        {Object.keys(d.counts).length ? (
          <View className="flex-row flex-wrap gap-2 mt-1">
            {Object.entries(d.counts).map(([k, v]) => {
              const m = STATUS_META[k as keyof typeof STATUS_META];
              return (
                <View key={k} className="rounded-full px-2.5 py-1" style={{ backgroundColor: m?.soft ?? "#F1F5F9" }}>
                  <Text w="semi" className="text-xs" style={{ color: m?.hex ?? "#475569" }}>{m?.label ?? k} {v}</Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </Card>

      <Text w="bold" className="mb-2">عليهم رصيد بعد زيارة اليوم</Text>
      {d.owing.length === 0 ? (
        <Card><Text className="text-muted text-center">لا أرصدة على من زاروا اليوم</Text></Card>
      ) : (
        d.owing.map((o) => {
          const p = byId.get(o.id);
          return (
            <Card key={o.id} className="mb-2">
              <View className="flex-row items-center justify-between">
                <Text w="semi" className="flex-1" numberOfLines={1}>{p?.name ?? "مريض"}</Text>
                <Text w="bold" style={{ color: "#DC2626" }}>{fmtMoney(o.bal, currency)}</Text>
                {p?.phone ? (
                  <Pressable
                    hitSlop={8}
                    className="ms-3"
                    onPress={() => Linking.openURL(whatsappLink(p.phone!, `السلام عليكم ${p.name}، المتبقي لك من حساب العلاج ${fmtMoney(o.bal, currency)}${clinicName ? ` لدى ${clinicName}` : ""}. شكرًا لك.`))}
                  >
                    <Text style={{ color: green }}>واتساب</Text>
                  </Pressable>
                ) : null}
              </View>
            </Card>
          );
        })
      )}

      <Card className="mt-3">
        {closedThrough && date <= closedThrough ? (
          <>
            <Text w="semi" style={{ color: "#166534" }}>هذا اليوم مغلق ماليًا</Text>
            <Text className="text-xs text-muted mt-1 mb-2">تعديل أو حذف دفعاته وذممه يطلب تأكيدًا. (الإغلاق شامل حتى {closedThrough})</Text>
            <Button small label="إلغاء الإغلاق من هذا اليوم" icon="lock-open-outline" variant="soft" onPress={() => updateSettings({ closedThrough: addDays(date, -1) })} />
          </>
        ) : (
          <>
            <Text w="semi">إغلاق اليوم ماليًا</Text>
            <Text className="text-xs text-muted mt-1 mb-2">يقفل هذا اليوم وما قبله: أي تعديل لاحق على دفعاته أو ذممه يطلب تأكيدًا صريحًا.</Text>
            <Button small label="إغلاق وقفل" icon="lock-closed-outline" type="private" onPress={() => updateSettings({ closedThrough: date })} />
          </>
        )}
      </Card>

      <View className="mt-3">
        <Button label="مشاركة ملخص اليوم" icon="share-social-outline" type="private" onPress={() => Share.share({ message: summary() })} />
      </View>
    </Screen>
  );
}
