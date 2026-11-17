import { useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DateField } from "@/components/pickers";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip, Segmented } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Field, FieldRow } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { EXPENSE_CATEGORIES } from "@/constants/clinic";
import { TYPE_META } from "@/constants/shiftTypes";
import { useTheme } from "@/hooks/useTheme";
import { fmtDateShort, todayISO } from "@/lib/dates";
import { fmtMoney, parseAmount } from "@/lib/format";
import { periodRange, type Period } from "@/lib/reports";
import { useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";
import type { ExpenseCategory } from "@/types";

const PERIODS: { value: Period; label: string }[] = [
  { value: "week", label: "الأسبوع" },
  { value: "month", label: "الشهر" },
  { value: "year", label: "السنة" },
];

/** مصاريف العيادة: تُطرح من المقبوض لإظهار الربح الصافي في التقارير */
export default function ExpensesScreen() {
  useTheme();
  const currency = useSettings((s) => s.currency);
  const expenses = useClinic((s) => s.expenses);
  const addExpense = useClinic((s) => s.addExpense);
  const removeExpense = useClinic((s) => s.removeExpense);
  const green = TYPE_META.private.hex;

  const [period, setPeriod] = useState<Period>("month");
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState<ExpenseCategory>("materials");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const range = periodRange(period);
  const list = useMemo(
    () => expenses.filter((x) => x.date >= range.from && x.date <= range.to).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [expenses, range.from, range.to],
  );
  const total = list.reduce((a, x) => a + x.amount, 0);

  const save = () => {
    const n = parseAmount(amount);
    if (n <= 0) return Alert.alert("اكتب مبلغًا صحيحًا");
    addExpense({ date, category, amount: n, note: note.trim() || undefined });
    setOpen(false);
  };

  return (
    <Screen
      title="المصاريف"
      subtitle={`${range.from} → ${range.to}`}
      back
      overlay={
        <Fab
          color={green}
          onPress={() => {
            setDate(todayISO());
            setAmount("");
            setNote("");
            setOpen(true);
          }}
        />
      }
    >
      <Segmented value={period} onChange={setPeriod} options={PERIODS} />
      <View className="rounded-2xl p-4 mt-4 mb-3" style={{ backgroundColor: "#FEF3C7" }}>
        <Text className="text-sm" style={{ color: "#92400E" }}>
          إجمالي المصاريف
        </Text>
        <Text w="bold" className="text-2xl" style={{ color: "#92400E" }}>
          {fmtMoney(total, currency)}
        </Text>
      </View>

      {list.length === 0 ? (
        <EmptyState icon="wallet-outline" title="لا مصاريف" hint="اضغط + لتسجيل مصروف" />
      ) : (
        list.map((x) => (
          <Card key={x.id} className="mb-2.5">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text w="semi">{EXPENSE_CATEGORIES[x.category]}</Text>
                <Text className="text-xs text-muted">
                  {fmtDateShort(x.date)}
                  {x.note ? ` • ${x.note}` : ""}
                </Text>
              </View>
              <Text w="bold" className="me-3" style={{ fontVariant: ["tabular-nums"] }}>
                {fmtMoney(x.amount, currency)}
              </Text>
              <Pressable
                hitSlop={10}
                onPress={() =>
                  Alert.alert("حذف المصروف", "سيُحذف هذا المصروف.", [
                    { text: "إلغاء", style: "cancel" },
                    { text: "حذف", style: "destructive", onPress: () => removeExpense(x.id) },
                  ])
                }
              >
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
              </Pressable>
            </View>
          </Card>
        ))
      )}

      <Sheet visible={open} onClose={() => setOpen(false)} title="مصروف جديد">
        <DateField label="التاريخ" value={date} onChange={setDate} />
        <FieldRow label="الفئة">
          <View className="flex-row flex-wrap gap-2">
            {(Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).map((k) => (
              <Chip key={k} label={EXPENSE_CATEGORIES[k]} selected={category === k} color={green} onPress={() => setCategory(k)} />
            ))}
          </View>
        </FieldRow>
        <Field label={`المبلغ (${currency})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        <Field label="ملاحظة (اختياري)" value={note} onChangeText={setNote} />
        <Button label="حفظ" icon="checkmark" type="private" onPress={save} />
      </Sheet>
    </Screen>
  );
}
