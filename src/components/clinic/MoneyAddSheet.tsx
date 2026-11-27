import { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import { MoneyField, useMoneyInput } from "@/components/MoneyField";
import { PatientPick } from "@/components/clinic/PatientPick";
import { DateField } from "@/components/pickers";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Field } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { todayISO } from "@/lib/dates";
import { OPENING_PROCEDURE } from "@/lib/finance";
import { useClinic } from "@/store/useClinic";

export type MoneyMode = "payment" | "debt";

/**
 * زر + في المالية: يسأل أولًا «دفعة جديدة» أم «ذمة جديدة» ثم يعرض نموذجها.
 * الذمة = جلسة بتكلفة تُضاف لحساب المريض؛ وخيار «رصيد سابق» لا يُحسب علاجًا هذا الشهر.
 * يمرَّر mode لتجاوز سؤال الاختيار (مثل زر + بجانب مريض عليه ذمة).
 */
export function MoneyAddSheet({ visible, onClose, mode, patientId: initialPatient }: { visible: boolean; onClose: () => void; mode?: MoneyMode; patientId?: string }) {
  const addPayment = useClinic((s) => s.addPayment);
  const addSession = useClinic((s) => s.addSession);
  const m = useMoneyInput();
  const [step, setStep] = useState<MoneyMode | "pick">("pick");
  const [patientId, setPatientId] = useState<string | undefined>();
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [desc, setDesc] = useState("");
  const [previous, setPrevious] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setStep(mode ?? "pick");
    setPatientId(initialPatient);
    setDate(todayISO());
    setNote("");
    setDesc("");
    setPrevious(false);
    m.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const save = () => {
    if (!patientId) return Alert.alert("اختر المريض");
    const r = m.result();
    if (!r) return Alert.alert("أدخل المبلغ", "المبلغ مطلوب (وسعر الدولار إن كان بالدولار).");
    if (step === "payment") {
      addPayment({ patientId, date, amount: r.amount, foreign: r.foreign, note: note.trim() || undefined });
    } else {
      addSession({
        patientId,
        date,
        procedure: previous ? OPENING_PROCEDURE : desc.trim() || "ذمة",
        notes: note.trim() || (previous ? "رصيد قبل استخدام التطبيق" : "ذمة مضافة يدويًا"),
        cost: r.amount,
        foreign: r.foreign,
      });
    }
    onClose();
  };

  const title = step === "pick" ? "إضافة" : step === "payment" ? "دفعة جديدة" : "ذمة جديدة";

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {step === "pick" ? (
        <View className="gap-3">
          <Button label="دفعة جديدة" icon="cash-outline" type="private" onPress={() => setStep("payment")} />
          <Button label="ذمة جديدة" icon="receipt-outline" variant="soft" type="private" onPress={() => setStep("debt")} />
        </View>
      ) : (
        <>
          {step === "debt" ? (
            <Text className="text-xs text-muted mb-3">تُضاف إلى حساب المريض كمبلغ مستحق عليه دون خطة علاج.</Text>
          ) : null}
          <PatientPick value={patientId} onChange={setPatientId} />
          <MoneyField label={step === "payment" ? "المبلغ المدفوع" : "مبلغ الذمة"} m={m} />
          {step === "debt" ? (
            <>
              <Field label="البيان" value={desc} onChangeText={setDesc} placeholder="مثال: علاج سابق / مستلزمات" />
              <View className="flex-row mb-3">
                <Chip label="رصيد سابق (قبل التطبيق)" icon={previous ? "checkmark" : undefined} selected={previous} color="#0E6FA5" onPress={() => setPrevious((v) => !v)} />
              </View>
            </>
          ) : null}
          <DateField label={step === "payment" ? "تاريخ الدفع" : "التاريخ"} value={date} onChange={(v) => v && setDate(v)} />
          <Field label="ملاحظة (اختياري)" value={note} onChangeText={setNote} placeholder={step === "payment" ? "مثال: دفعة أولى" : ""} />
          <Button label="حفظ" icon="checkmark" type="private" onPress={save} />
        </>
      )}
    </Sheet>
  );
}
