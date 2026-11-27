import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { fmtMoney, parseAmount } from "@/lib/format";
import { useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";

/** مجموع المقبوض في شهر (YYYY-MM): الاستردادات سالبة فتُنقص تلقائيًا */
export const collectedIn = (payments: { date: string; amount: number }[], month: string) =>
  payments.filter((p) => p.date.startsWith(month)).reduce((a, p) => a + p.amount, 0);

/**
 * شريط هدف التحصيل الشهري: المقبوض هذا الشهر مقابل الهدف، ومقارنة بوتيرة اليوم من الشهر.
 * الضغط عليه يفتح تعديل الهدف. بلا هدف: يظهر رابط «حدّد هدفًا» فقط إن طُلب showEmpty.
 */
export function GoalBar({ showEmpty = false }: { showEmpty?: boolean }) {
  const goal = useSettings((s) => s.collectionGoal);
  const currency = useSettings((s) => s.currency);
  const update = useSettings((s) => s.update);
  const payments = useClinic((s) => s.payments);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const d = useMemo(() => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return { collected: collectedIn(payments, month), day: now.getDate(), days };
  }, [payments]);

  const edit = () => {
    setText(goal ? String(Math.round(goal)) : "");
    setOpen(true);
  };
  const save = () => {
    update({ collectionGoal: Math.max(0, parseAmount(text)) });
    setOpen(false);
  };

  const sheet = (
    <Sheet visible={open} onClose={() => setOpen(false)} title="هدف التحصيل الشهري">
      <Field label={`الهدف (${currency})`} value={text} onChangeText={setText} keyboardType="decimal-pad" autoFocus />
      <Button label="حفظ" icon="checkmark" type="private" onPress={save} />
      {goal ? (
        <View className="mt-2">
          <Button
            label="إزالة الهدف"
            icon="trash-outline"
            variant="soft"
            onPress={() => {
              update({ collectionGoal: 0 });
              setOpen(false);
            }}
          />
        </View>
      ) : null}
    </Sheet>
  );

  if (!goal) {
    return showEmpty ? (
      <>
        <Pressable onPress={edit} className="rounded-2xl border border-dashed border-line px-4 py-3 mb-3">
          <Text className="text-muted text-center text-sm">+ حدّد هدف التحصيل الشهري</Text>
        </Pressable>
        {sheet}
      </>
    ) : null;
  }

  const pct = Math.max(0, Math.min(100, Math.round((d.collected / goal) * 100)));
  const expected = (goal * d.day) / d.days;
  const ahead = d.collected >= expected;
  const color = d.collected >= goal ? "#16A34A" : ahead ? "#0E6FA5" : "#D97706";
  return (
    <>
      <Pressable onPress={edit} className="rounded-2xl border border-line bg-surface px-4 py-3 mb-3" accessibilityLabel="هدف التحصيل الشهري">
        <View className="flex-row items-center justify-between">
          <Text w="semi" className="text-sm">هدف الشهر</Text>
          <Text w="bold" style={{ color }}>
            {pct}٪
          </Text>
        </View>
        <View className="h-2 rounded-full bg-slate-100 mt-2 mb-1.5 overflow-hidden">
          <View style={{ width: `${pct}%`, height: 8, backgroundColor: color }} />
        </View>
        <Text className="text-xs text-muted">
          {fmtMoney(d.collected, currency)} من {fmtMoney(goal, currency)}
          {d.collected >= goal ? " • تحقّق الهدف" : ahead ? " • ضمن الوتيرة" : ` • أقل من الوتيرة بـ ${fmtMoney(expected - d.collected, currency)}`}
        </Text>
      </Pressable>
      {sheet}
    </>
  );
}
