import { useMemo, useState } from "react";
import { Alert, Linking, Pressable, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DateField } from "@/components/pickers";
import { PatientPick } from "@/components/clinic/PatientPick";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip, Segmented } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Field } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { fmtDateShort, todayISO } from "@/lib/dates";
import { fmtMoney, parseAmount, toWesternDigits } from "@/lib/format";
import { telLink } from "@/lib/phone";
import { useClinic } from "@/store/useClinic";
import { useExtras } from "@/store/useExtras";
import { useSettings } from "@/store/useSettings";
import type { LabStatus } from "@/types/extras";

const STATUS: Record<LabStatus, string> = { sent: "عند المخبر", received: "وصل من المخبر", fitted: "رُكّب للمريض" };
const NEXT: Record<LabStatus, LabStatus | null> = { sent: "received", received: "fitted", fitted: null };
const NEXT_LABEL: Record<LabStatus, string> = { sent: "وصل من المخبر", received: "رُكّب للمريض", fitted: "" };

/** طلبات المخبر: ما أُرسل، موعد التسليم، الحالة، والأجرة */
export default function LabScreen() {
  const params = useLocalSearchParams<{ patientId?: string }>();
  const orders = useExtras((s) => s.labOrders);
  const addLab = useExtras((s) => s.addLab);
  const updateLab = useExtras((s) => s.updateLab);
  const removeLab = useExtras((s) => s.removeLab);
  const patients = useClinic((s) => s.patients);
  const currency = useSettings((s) => s.currency);
  const green = TYPE_META.private.hex;
  const byId = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);
  const today = todayISO();

  const [tab, setTab] = useState<"open" | "done">("open");
  const [open, setOpen] = useState(false);
  const [pid, setPid] = useState<string | undefined>(params.patientId);
  const [work, setWork] = useState("");
  const [tooth, setTooth] = useState("");
  const [labName, setLabName] = useState("");
  const [labPhone, setLabPhone] = useState("");
  const [due, setDue] = useState<string | undefined>();
  const [cost, setCost] = useState("");

  // آخر مخبر استُعمل يُقترح تلقائيًا
  const lastLab = orders.find((o) => o.labName);

  const list = useMemo(
    () =>
      orders
        .filter((o) => (!params.patientId || o.patientId === params.patientId) && (tab === "open" ? o.status !== "fitted" : o.status === "fitted"))
        .sort((a, b) => (a.dueOn ?? "9999") .localeCompare(b.dueOn ?? "9999")),
    [orders, tab, params.patientId],
  );
  const unpaid = orders.filter((o) => !o.paid && o.cost).reduce((s, o) => s + (o.cost ?? 0), 0);

  const create = () => {
    if (!pid) return Alert.alert("اختر المريض");
    if (!work.trim()) return Alert.alert("اكتب العمل المطلوب");
    const c = cost.trim() ? parseAmount(toWesternDigits(cost)) : undefined;
    addLab({
      patientId: pid,
      work: work.trim(),
      tooth: tooth.trim() || undefined,
      labName: labName.trim() || undefined,
      labPhone: labPhone.trim() || undefined,
      sentOn: today,
      dueOn: due,
      status: "sent",
      cost: c && c > 0 ? c : undefined,
      paid: false,
    });
    setOpen(false);
    setWork("");
    setTooth("");
    setDue(undefined);
    setCost("");
  };

  return (
    <Screen
      title="المخبر"
      subtitle={unpaid > 0 ? `أجور غير مسددة: ${fmtMoney(unpaid, currency)}` : "طلبات مخبر الأسنان"}
      back
      overlay={
        <Fab
          color={green}
          onPress={() => {
            if (!labName && lastLab) {
              setLabName(lastLab.labName ?? "");
              setLabPhone(lastLab.labPhone ?? "");
            }
            setOpen(true);
          }}
        />
      }
    >
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "open", label: "قيد التنفيذ" },
          { value: "done", label: "مكتملة" },
        ]}
      />
      <View className="mt-4">
        {list.length === 0 ? (
          <EmptyState icon="flask-outline" title="لا طلبات" hint="اضغط + لتسجيل عمل أُرسل للمخبر" />
        ) : (
          list.map((o) => {
            const p = byId.get(o.patientId);
            const late = o.status === "sent" && o.dueOn && o.dueOn < today;
            const next = NEXT[o.status];
            return (
              <Card key={o.id} accent="private" className="mb-3">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text w="bold">{o.work}{o.tooth ? ` (سن ${o.tooth})` : ""}</Text>
                    <Text className="text-xs text-muted">
                      {p?.name ?? "مريض محذوف"}{o.labName ? ` • ${o.labName}` : ""}
                    </Text>
                    <Text className="text-xs text-muted">
                      أُرسل {fmtDateShort(o.sentOn)}
                      {o.dueOn ? ` • التسليم ${fmtDateShort(o.dueOn)}` : ""}
                    </Text>
                  </View>
                  <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: late ? "#FEE2E2" : "#F1F5F9" }}>
                    <Text w="semi" className="text-xs" style={{ color: late ? "#991B1B" : "#475569" }}>
                      {late ? "متأخر" : STATUS[o.status]}
                    </Text>
                  </View>
                </View>
                {o.cost ? (
                  <Text className="text-sm mt-1">
                    الأجرة: {fmtMoney(o.cost, currency)} • {o.paid ? "مسددة" : "غير مسددة"}
                  </Text>
                ) : null}
                <View className="flex-row flex-wrap gap-2 mt-3">
                  {next ? <Chip label={NEXT_LABEL[o.status]} icon="checkmark" color={green} onPress={() => updateLab(o.id, { status: next })} /> : null}
                  {o.cost ? <Chip label={o.paid ? "إلغاء التسديد" : "سُدّدت الأجرة"} onPress={() => updateLab(o.id, { paid: !o.paid })} /> : null}
                  {o.labPhone ? <Chip label="اتصال" icon="call" onPress={() => Linking.openURL(telLink(o.labPhone!))} /> : null}
                  <Pressable
                    hitSlop={8}
                    className="justify-center"
                    onPress={() =>
                      Alert.alert("حذف", "حذف هذا الطلب؟", [
                        { text: "إلغاء", style: "cancel" },
                        { text: "حذف", style: "destructive", onPress: () => removeLab(o.id) },
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

      <Sheet visible={open} onClose={() => setOpen(false)} title="طلب مخبر جديد">
        <PatientPick value={pid} onChange={setPid} />
        <Field label="العمل المطلوب" value={work} onChangeText={setWork} placeholder="تاج زركون، طقم كامل..." />
        <Field label="رقم السن (اختياري)" value={tooth} onChangeText={setTooth} keyboardType="number-pad" />
        <Field label="اسم المخبر" value={labName} onChangeText={setLabName} />
        <Field label="هاتف المخبر" value={labPhone} onChangeText={setLabPhone} keyboardType="phone-pad" />
        <DateField label="موعد التسليم المتوقع" value={due} onChange={setDue} clearable placeholder="غير محدد" />
        <Field label={`أجرة المخبر (${currency}) اختياري`} value={cost} onChangeText={setCost} keyboardType="numeric" />
        <Button label="تسجيل الطلب" icon="checkmark" type="private" onPress={create} />
      </Sheet>
    </Screen>
  );
}
