import { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import { DateField } from "@/components/pickers";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Field, FieldRow } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { fmtMoney, parseAmount } from "@/lib/format";
import { confirmIfClosed } from "@/lib/closedDays";
import { shareReceipt } from "@/lib/receipt";
import { OPENING_PROCEDURE } from "@/lib/finance";
import { useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";

export type MoneyTarget = { kind: "payment" | "session"; id: string } | null;

/**
 * تعديل دفعة أو ذمة (جلسة): المبلغ والتاريخ والملاحظة، وللدفعة خطة العلاج المنسوبة إليها.
 * للدفعة زر «إيصال PDF» يُشارَك (واتساب...). تغيير المبلغ يُلغي أصله بالدولار (يبقى المبلغ بعملة العيادة).
 */
export function EditMoneySheet({ target, onClose }: { target: MoneyTarget; onClose: () => void }) {
  const currency = useSettings((s) => s.currency);
  const payment = useClinic((s) => (target?.kind === "payment" ? s.payments.find((p) => p.id === target.id) : undefined));
  const session = useClinic((s) => (target?.kind === "session" ? s.sessions.find((p) => p.id === target.id) : undefined));
  const plans = useClinic((s) => s.plans);
  const updatePayment = useClinic((s) => s.updatePayment);
  const updateSession = useClinic((s) => s.updateSession);
  const removePayment = useClinic((s) => s.removePayment);
  const removeSession = useClinic((s) => s.removeSession);

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [proc, setProc] = useState("");
  const [planId, setPlanId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const row = payment ?? session;
  useEffect(() => {
    if (!row) return;
    setAmount(String(Math.round(payment ? Math.abs(payment.amount) : session!.cost)));
    setDate(row.date);
    setNote(payment ? payment.note ?? "" : session!.notes ?? "");
    setProc(session?.procedure ?? "");
    setPlanId(payment?.planId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.id]);

  if (!target || !row) return <Sheet visible={false} onClose={onClose}>{null}</Sheet>;
  const myPlans = plans.filter((p) => p.patientId === row.patientId);
  const isOpening = session?.procedure === OPENING_PROCEDURE;

  const save = () => {
    const v = parseAmount(amount);
    if (v <= 0) return Alert.alert("أدخل المبلغ");
    // تعديل أو نقل حركة ليوم مغلق يطلب تأكيدًا (التاريخ القديم والجديد)
    confirmIfClosed([row!.date, date], "تعديل الحركة", () => apply(v));
  };

  const apply = (v: number) => {
    if (payment) {
      const signed = payment.refund ? -v : v;
      const changed = Math.round(signed) !== Math.round(payment.amount);
      updatePayment(payment.id, { amount: signed, date, note: note.trim() || undefined, planId, ...(changed ? { foreign: undefined } : {}) });
    } else if (session) {
      const changed = Math.round(v) !== Math.round(session.cost);
      updateSession(session.id, { cost: v, date, notes: note.trim() || undefined, procedure: isOpening ? session.procedure : proc.trim() || session.procedure, ...(changed ? { foreign: undefined } : {}) });
    }
    onClose();
  };

  const del = () =>
    confirmIfClosed(row!.date, "حذف الحركة", () =>
      Alert.alert(payment ? "حذف الدفعة" : "حذف الذمة", `${fmtMoney(parseAmount(amount), currency)} بتاريخ ${date}`, [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: () => {
            if (payment) removePayment(payment.id);
            else if (session) removeSession(session.id);
            onClose();
          },
        },
      ]),
    );

  const receipt = async () => {
    if (!payment || busy) return;
    setBusy(true);
    const err = await shareReceipt(payment.id);
    setBusy(false);
    if (err) Alert.alert("PDF", err);
  };

  return (
    <Sheet visible onClose={onClose} title={payment ? (payment.refund ? "تعديل استرداد" : "تعديل دفعة") : isOpening ? "تعديل رصيد سابق" : "تعديل ذمة"}>
      <Field label={`المبلغ (${currency})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      {(payment?.foreign ?? session?.foreign) ? <Text className="text-xs text-muted -mt-2 mb-3">سُجّل أصلًا بالدولار؛ تغيير المبلغ يحوّله إلى {currency} فقط.</Text> : null}
      {session && !isOpening ? <Field label="البيان" value={proc} onChangeText={setProc} /> : null}
      <DateField label="التاريخ" value={date} onChange={(v) => v && setDate(v)} />
      <Field label="ملاحظة" value={note} onChangeText={setNote} />
      {payment && !payment.refund && myPlans.length ? (
        <FieldRow label="خطة العلاج">
          <View className="flex-row flex-wrap gap-2">
            <Chip label="عامة (بلا خطة)" selected={!planId} color="#0E6FA5" onPress={() => setPlanId(undefined)} />
            {myPlans.map((p) => (
              <Chip key={p.id} label={p.title} selected={planId === p.id} color="#0E6FA5" onPress={() => setPlanId(p.id)} />
            ))}
          </View>
        </FieldRow>
      ) : null}
      <Button label="حفظ التعديل" icon="checkmark" type="private" onPress={save} />
      <View className="flex-row gap-2 mt-2">
        {payment && !payment.refund ? (
          <View className="flex-1">
            <Button label="إيصال PDF" icon="share-outline" variant="soft" type="private" disabled={busy} onPress={receipt} />
          </View>
        ) : null}
        <View className="flex-1">
          <Button label="حذف" icon="trash-outline" variant="danger" onPress={del} />
        </View>
      </View>
    </Sheet>
  );
}
