import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState, SectionHeader } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Field, FieldRow } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { useTheme } from "@/hooks/useTheme";
import { parseNum } from "@/lib/dosage";
import { fmtMoney } from "@/lib/format";
import { useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";
import type { InventoryItem, StockMoveKind } from "@/types";

const KINDS: { v: StockMoveKind; label: string }[] = [
  { v: "in", label: "وارد" },
  { v: "out", label: "صرف" },
  { v: "adjust", label: "جرد (ضبط الكمية)" },
];
const KIND_LABEL: Record<StockMoveKind, string> = { in: "وارد", out: "صرف", adjust: "جرد" };

const state = (i: InventoryItem): { label: string; color: string; bg: string } =>
  i.quantity <= 0
    ? { label: "نفد", color: "#991B1B", bg: "#FEE2E2" }
    : i.quantity <= i.minQuantity
      ? { label: "منخفض", color: "#92400E", bg: "#FEF3C7" }
      : { label: "متوفر", color: "#166534", bg: "#DCFCE7" };

export default function InventoryScreen() {
  useTheme();
  const inventory = useClinic((s) => s.inventory);
  const moves = useClinic((s) => s.stockMoves);
  const addItem = useClinic((s) => s.addInventoryItem);
  const updateItem = useClinic((s) => s.updateInventoryItem);
  const removeItem = useClinic((s) => s.removeInventoryItem);
  const moveStock = useClinic((s) => s.moveStock);
  const currency = useSettings((s) => s.currency);
  const green = TYPE_META.private.hex;

  // إضافة/تعديل مادة
  const [itemSheet, setItemSheet] = useState<{ open: boolean; item?: InventoryItem }>({ open: false });
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("قطعة");
  const [qty, setQty] = useState("0");
  const [min, setMin] = useState("5");
  const [cost, setCost] = useState("");

  // حركة مخزون
  const [move, setMove] = useState<InventoryItem | null>(null);
  const [kind, setKind] = useState<StockMoveKind>("out");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const openItem = (i?: InventoryItem) => {
    setName(i?.name ?? "");
    setUnit(i?.unit ?? "قطعة");
    setQty(String(i?.quantity ?? 0));
    setMin(String(i?.minQuantity ?? 5));
    setCost(i?.unitCost ? String(i.unitCost) : "");
    setItemSheet({ open: true, item: i });
  };

  const saveItem = () => {
    if (!name.trim()) return Alert.alert("اسم المادة مطلوب");
    const base = {
      name: name.trim(),
      unit: unit.trim() || "قطعة",
      minQuantity: Math.max(0, parseNum(min) ?? 0),
      unitCost: Math.max(0, parseNum(cost) ?? 0),
    };
    if (itemSheet.item) updateItem(itemSheet.item.id, base);
    else addItem({ ...base, quantity: Math.max(0, parseNum(qty) ?? 0) });
    setItemSheet({ open: false });
  };

  const saveMove = () => {
    const q = parseNum(amount);
    if (!move || q === undefined || q < 0) return Alert.alert("اكتب كمية صحيحة");
    moveStock(move.id, kind, q, note.trim() || undefined);
    setMove(null);
  };

  const low = inventory.filter((i) => i.active && i.quantity <= i.minQuantity);
  const value = inventory.reduce((a, i) => a + i.quantity * i.unitCost, 0);
  const name_of = (id: string) => inventory.find((i) => i.id === id);

  return (
    <Screen title="المخزون" subtitle="مواد العيادة وتنبيه النقص" back overlay={<Fab onPress={() => openItem()} color={green} />}>
      <View className="flex-row gap-2.5 mb-4">
        <View className="flex-1 rounded-2xl p-3" style={{ backgroundColor: TYPE_META.private.soft }}>
          <Text className="text-xs" style={{ color: TYPE_META.private.inkHex }}>
            عدد المواد
          </Text>
          <Text w="bold" style={{ color: TYPE_META.private.inkHex }}>
            {inventory.length}
          </Text>
        </View>
        <View className="flex-1 rounded-2xl p-3" style={{ backgroundColor: low.length ? "#FEF3C7" : "#F1F5F9" }}>
          <Text className="text-xs text-slate-600">تحتاج تزويدًا</Text>
          <Text w="bold">{low.length}</Text>
        </View>
        <View className="flex-1 rounded-2xl p-3 bg-slate-100">
          <Text className="text-xs text-slate-600">قيمة المخزون</Text>
          <Text w="bold" className="text-sm">
            {fmtMoney(value, currency)}
          </Text>
        </View>
      </View>

      {inventory.length === 0 ? (
        <EmptyState icon="cube-outline" title="لا مواد" hint="اضغط + لإضافة مادة (قفازات، حقن تخدير، حشوات...)" />
      ) : (
        inventory.map((i) => {
          const st = state(i);
          return (
            <Card key={i.id} className={`mb-2.5 ${i.active ? "" : "opacity-50"}`}>
              <Pressable onPress={() => openItem(i)} className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text w="bold">{i.name}</Text>
                  <Text className="text-sm text-muted">
                    {i.quantity} {i.unit} • الحد الأدنى {i.minQuantity}
                  </Text>
                </View>
                <View className="rounded-lg px-2.5 py-1" style={{ backgroundColor: st.bg }}>
                  <Text w="semi" className="text-xs" style={{ color: st.color }}>
                    {st.label}
                  </Text>
                </View>
              </Pressable>
              <View className="mt-2.5">
                <Button
                  label="حركة (وارد / صرف / جرد)"
                  icon="swap-vertical"
                  variant="soft"
                  small
                  onPress={() => {
                    setMove(i);
                    setKind("out");
                    setAmount("");
                    setNote("");
                  }}
                />
              </View>
            </Card>
          );
        })
      )}

      {moves.length > 0 ? (
        <>
          <SectionHeader title="آخر الحركات" />
          {moves.slice(0, 20).map((m) => (
            <View key={m.id} className="flex-row items-center justify-between py-2 border-b border-line">
              <View className="flex-1">
                <Text w="semi" className="text-sm">
                  {name_of(m.itemId)?.name ?? "مادة محذوفة"}
                </Text>
                <Text className="text-xs text-muted">
                  {new Date(m.createdAt).toLocaleDateString("ar-SY")} {m.note ? `• ${m.note}` : ""}
                </Text>
              </View>
              <Text className="text-sm" style={{ fontVariant: ["tabular-nums"] }}>
                {KIND_LABEL[m.kind]} {m.quantity} ← {m.after}
              </Text>
            </View>
          ))}
        </>
      ) : null}

      <Sheet visible={itemSheet.open} onClose={() => setItemSheet({ open: false })} title={itemSheet.item ? "تعديل مادة" : "مادة جديدة"}>
        <Field label="اسم المادة" value={name} onChangeText={setName} />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="الوحدة" value={unit} onChangeText={setUnit} />
          </View>
          {!itemSheet.item ? (
            <View className="flex-1">
              <Field label="الكمية الحالية" value={qty} onChangeText={setQty} keyboardType="decimal-pad" />
            </View>
          ) : null}
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="حد التنبيه" value={min} onChangeText={setMin} keyboardType="decimal-pad" />
          </View>
          <View className="flex-1">
            <Field label={`تكلفة الوحدة (${currency})`} value={cost} onChangeText={setCost} keyboardType="decimal-pad" />
          </View>
        </View>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button label="حفظ" icon="checkmark" type="private" onPress={saveItem} />
          </View>
          {itemSheet.item ? (
            <>
              <Button
                label={itemSheet.item.active ? "تعطيل" : "تفعيل"}
                variant="soft"
                onPress={() => {
                  updateItem(itemSheet.item!.id, { active: !itemSheet.item!.active });
                  setItemSheet({ open: false });
                }}
              />
              <Button
                label="حذف"
                variant="danger"
                icon="trash-outline"
                onPress={() =>
                  Alert.alert("حذف المادة", "ستُحذف المادة وسجل حركاتها نهائيًا.", [
                    { text: "إلغاء", style: "cancel" },
                    {
                      text: "حذف",
                      style: "destructive",
                      onPress: () => {
                        removeItem(itemSheet.item!.id);
                        setItemSheet({ open: false });
                      },
                    },
                  ])
                }
              />
            </>
          ) : null}
        </View>
      </Sheet>

      <Sheet visible={!!move} onClose={() => setMove(null)} title={move ? `حركة — ${move.name}` : ""}>
        {move ? (
          <>
            <Text className="text-sm text-muted mb-2">
              الكمية الحالية: {move.quantity} {move.unit}
            </Text>
            <FieldRow label="نوع الحركة">
              <View className="flex-row flex-wrap gap-2">
                {KINDS.map((k) => (
                  <Chip key={k.v} label={k.label} selected={kind === k.v} color={green} onPress={() => setKind(k.v)} />
                ))}
              </View>
            </FieldRow>
            <Field
              label={kind === "adjust" ? "الكمية الفعلية بعد الجرد" : "الكمية"}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            <Field label="ملاحظة" value={note} onChangeText={setNote} />
            <Button label="حفظ الحركة" icon="checkmark" type="private" onPress={saveMove} />
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
