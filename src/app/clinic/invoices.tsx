import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DateField } from "@/components/pickers";
import { PatientPick } from "@/components/clinic/PatientPick";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Field } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { fmtDateShort, todayISO } from "@/lib/dates";
import { fmtMoney, parseAmount, toWesternDigits } from "@/lib/format";
import { uid } from "@/lib/id";
import { sharePdf } from "@/lib/pdf";
import { invoiceHtml, type DocCtx } from "@/lib/pdfHtml";
import { patientBalance, useClinic } from "@/store/useClinic";
import { useExtras } from "@/store/useExtras";
import { useSettings } from "@/store/useSettings";
import type { Invoice, InvoiceLine } from "@/types/extras";

const sumOf = (lines: InvoiceLine[], discount: number) => Math.max(0, lines.reduce((a, l) => a + l.qty * l.price, 0) - discount);

/** الفواتير: مرقّمة، تُبنى من الجلسات غير المفوتَرة أو ببنود يدوية، وتُصدَّر PDF */
export default function InvoicesScreen() {
  const params = useLocalSearchParams<{ patientId?: string; planId?: string }>();
  const invoices = useExtras((s) => s.invoices);
  const addInvoice = useExtras((s) => s.addInvoice);
  const removeInvoice = useExtras((s) => s.removeInvoice);
  const patients = useClinic((s) => s.patients);
  const sessions = useClinic((s) => s.sessions);
  const payments = useClinic((s) => s.payments);
  const clinicName = useSettings((s) => s.clinicName);
  const clinicLogo = useSettings((s) => s.clinicLogo);
  const doctorName = useSettings((s) => s.doctorName);
  const currency = useSettings((s) => s.currency);
  const green = TYPE_META.private.hex;
  const byId = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);

  const [open, setOpen] = useState(false);
  const [pid, setPid] = useState<string | undefined>(params.patientId);
  const [date, setDate] = useState(todayISO());
  const [picked, setPicked] = useState<string[]>([]);
  const [manual, setManual] = useState<InvoiceLine[]>([]);
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("1");
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const billed = useMemo(() => new Set(invoices.flatMap((i) => i.sessionIds)), [invoices]);
  const free = useMemo(
    () => (pid ? sessions.filter((s) => s.patientId === pid && !billed.has(s.id)).sort((a, b) => (a.date < b.date ? -1 : 1)) : []),
    [sessions, pid, billed],
  );
  const treatPlans = useClinic((s) => s.plans);
  // قادمٌ من «فاتورة» في خطة علاج: نحدّد جلسات بنودها المنجزة وغير المفوتَرة
  useEffect(() => {
    if (!params.planId) return;
    const pl = treatPlans.find((x) => x.id === params.planId);
    if (!pl) return;
    setPicked(pl.items.filter((i) => i.done && i.sessionId && !billed.has(i.sessionId)).map((i) => i.sessionId as string));
    setNotes(`خطة العلاج: ${pl.title}`);
    setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const list = useMemo(
    () => invoices.filter((i) => !params.patientId || i.patientId === params.patientId).sort((a, b) => b.number - a.number),
    [invoices, params.patientId],
  );

  const sessionLines: InvoiceLine[] = free
    .filter((s) => picked.includes(s.id))
    .map((s) => ({ id: s.id, desc: `${s.procedure}${s.tooth ? ` (سن ${s.tooth})` : ""} — ${fmtDateShort(s.date)}`, qty: 1, price: s.cost }));
  const lines = [...sessionLines, ...manual];
  const disc = Math.max(0, parseAmount(toWesternDigits(discount)) || 0);

  const reset = () => {
    setPicked([]);
    setManual([]);
    setDesc("");
    setPrice("");
    setQty("1");
    setDiscount("");
    setNotes("");
    setDate(todayISO());
  };

  const ctx = (): DocCtx => ({ clinicName, doctorName, logo: clinicLogo || undefined, currency, dateISO: todayISO() });
  const pdf = async (inv: Pick<Invoice, "number" | "date" | "lines" | "discount" | "notes" | "patientId">) => {
    const p = byId.get(inv.patientId);
    if (!p) return;
    setBusy(true);
    const bal = patientBalance(p.id, sessions, payments).balance;
    const err = await sharePdf(invoiceHtml(ctx(), p, { ...inv, balance: bal }), `فاتورة-${inv.number}-${p.name}`);
    setBusy(false);
    if (err) Alert.alert("PDF", err);
  };

  const addManual = () => {
    const pr = parseAmount(toWesternDigits(price));
    const q = Math.max(1, Math.round(Number(toWesternDigits(qty)) || 1));
    if (!desc.trim() || !pr || pr <= 0) return Alert.alert("اكتب البند والسعر");
    setManual((m) => [...m, { id: uid(), desc: desc.trim(), qty: q, price: pr }]);
    setDesc("");
    setPrice("");
    setQty("1");
  };

  const create = async () => {
    if (!pid) return Alert.alert("اختر المريض");
    if (!lines.length) return Alert.alert("لا بنود", "اختر جلسات أو أضف بنداً يدويًا.");
    const data = { patientId: pid, date, lines, discount: disc, notes: notes.trim() || undefined, sessionIds: picked.filter((id) => free.some((s) => s.id === id)) };
    const number = addInvoice(data);
    setOpen(false);
    reset();
    await pdf({ ...data, number });
  };

  return (
    <Screen
      title="الفواتير"
      subtitle={`${invoices.length} فاتورة`}
      back
      overlay={
        <Fab
          color={green}
          onPress={() => {
            reset();
            setOpen(true);
          }}
        />
      }
    >
      {list.length === 0 ? (
        <EmptyState icon="receipt-outline" title="لا فواتير" hint="اضغط + لإنشاء فاتورة من الجلسات أو ببنود يدوية" />
      ) : (
        list.map((i) => {
          const p = byId.get(i.patientId);
          return (
            <Card key={i.id} accent="private" className="mb-2">
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text w="bold">
                    #{i.number} • {p?.name ?? "مريض محذوف"}
                  </Text>
                  <Text className="text-xs text-muted">
                    {fmtDateShort(i.date)} • {i.lines.length} بند
                  </Text>
                </View>
                <Text w="bold">{fmtMoney(sumOf(i.lines, i.discount), currency)}</Text>
              </View>
              <View className="flex-row flex-wrap gap-2 mt-3">
                <Chip label="PDF" icon="share-outline" color={green} onPress={() => !busy && pdf(i)} />
                <Pressable
                  hitSlop={8}
                  className="justify-center"
                  onPress={() =>
                    Alert.alert("حذف الفاتورة", "تُحذف الفاتورة وتُحرَّر جلساتها لفوترتها من جديد. الدفعات لا تتأثر.", [
                      { text: "إلغاء", style: "cancel" },
                      { text: "حذف", style: "destructive", onPress: () => removeInvoice(i.id) },
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

      <Sheet visible={open} onClose={() => setOpen(false)} title="فاتورة جديدة">
        <PatientPick value={pid} onChange={(v) => { setPid(v); setPicked([]); }} />
        <DateField label="التاريخ" value={date} onChange={(v) => setDate(v ?? date)} />
        {pid ? (
          <>
            <Text w="semi" className="mb-1">
              جلسات غير مفوتَرة ({free.length})
            </Text>
            {free.length === 0 ? <Text className="text-xs text-muted mb-2">لا جلسات متاحة.</Text> : null}
            {free.map((s) => {
              const on = picked.includes(s.id);
              return (
                <Pressable key={s.id} onPress={() => setPicked((x) => (on ? x.filter((y) => y !== s.id) : [...x, s.id]))} className="flex-row items-center gap-2 py-2 border-b border-line">
                  <Ionicons name={on ? "checkbox" : "square-outline"} size={20} color={on ? green : "#94A3B8"} />
                  <Text className="flex-1 text-sm">
                    {s.procedure}
                    {s.tooth ? ` (سن ${s.tooth})` : ""} • {fmtDateShort(s.date)}
                  </Text>
                  <Text className="text-sm">{fmtMoney(s.cost, currency)}</Text>
                </Pressable>
              );
            })}
          </>
        ) : null}
        <Text w="semi" className="mt-3 mb-1">
          بند يدوي
        </Text>
        <Field value={desc} onChangeText={setDesc} placeholder="الوصف" />
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Field value={price} onChangeText={setPrice} placeholder={`السعر (${currency})`} keyboardType="numeric" />
          </View>
          <View style={{ width: 80 }}>
            <Field value={qty} onChangeText={setQty} placeholder="الكمية" keyboardType="number-pad" />
          </View>
        </View>
        <Button label="إضافة البند" icon="add" variant="soft" type="private" onPress={addManual} />
        {manual.map((m) => (
          <Pressable key={m.id} onPress={() => setManual((x) => x.filter((y) => y.id !== m.id))} className="flex-row justify-between py-1.5">
            <Text className="text-sm flex-1">
              {m.desc} × {m.qty}
            </Text>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </Pressable>
        ))}
        <View className="h-3" />
        <Field label={`حسم (${currency})`} value={discount} onChangeText={setDiscount} keyboardType="numeric" placeholder="0" />
        <Field label="ملاحظات" value={notes} onChangeText={setNotes} multiline />
        <Text w="bold" className="mb-2">
          الصافي: {fmtMoney(sumOf(lines, disc), currency)}
        </Text>
        <Button label="حفظ وتصدير PDF" icon="checkmark" type="private" onPress={create} />
      </Sheet>
    </Screen>
  );
}
