import { useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PatientDocs } from "@/components/clinic/PatientDocs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { todayISO } from "@/lib/dates";
import { perioStats } from "@/lib/perio";
import { sharePdf } from "@/lib/pdf";
import { combineHtml, consentHtml, invoiceHtml, perioHtml, rxHtml, statementHtml, type DocCtx } from "@/lib/pdfHtml";
import { patientBalance, useClinic } from "@/store/useClinic";
import { useExtras } from "@/store/useExtras";
import { useSettings } from "@/store/useSettings";

type Key = "statement" | "rx" | "invoices" | "consents" | "perio";

/** صفحة المستندات: حدّد ما تريد تصديره ويُجمَّع في ملف PDF واحد */
export default function PatientDocsScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const patient = useClinic((s) => s.patients.find((p) => p.id === patientId));
  const sessions = useClinic((s) => s.sessions);
  const payments = useClinic((s) => s.payments);
  const prescriptions = useClinic((s) => s.prescriptions);
  const invoices = useExtras((s) => s.invoices);
  const consents = useExtras((s) => s.consents);
  const perio = useExtras((s) => s.perioCharts);
  const clinicName = useSettings((s) => s.clinicName);
  const clinicLogo = useSettings((s) => s.clinicLogo);
  const doctorName = useSettings((s) => s.doctorName);
  const currency = useSettings((s) => s.currency);
  const green = TYPE_META.private.hex;

  const [sel, setSel] = useState<Set<Key>>(new Set());
  const [busy, setBusy] = useState(false);

  const mine = useMemo(
    () => ({
      rx: prescriptions.filter((r) => r.patientId === patientId).sort((a, b) => (a.date < b.date ? -1 : 1)),
      invoices: invoices.filter((i) => i.patientId === patientId).sort((a, b) => a.number - b.number),
      consents: consents.filter((c) => c.patientId === patientId).sort((a, b) => (a.date < b.date ? -1 : 1)),
      perio: perio.filter((c) => c.patientId === patientId).sort((a, b) => (a.date < b.date ? 1 : -1))[0],
    }),
    [prescriptions, invoices, consents, perio, patientId],
  );

  if (!patient) return <Screen title="مستندات PDF" back><Text className="text-muted">المريض غير موجود.</Text></Screen>;

  const items: Array<{ key: Key; label: string; hint: string; n: number }> = [
    { key: "statement", label: "كشف الحساب", hint: "الجلسات والدفعات والرصيد", n: 1 },
    { key: "rx", label: "الوصفات", hint: "كل الوصفات", n: mine.rx.length },
    { key: "invoices", label: "الفواتير", hint: "كل الفواتير", n: mine.invoices.length },
    { key: "consents", label: "نماذج الموافقة", hint: "كل النماذج المحفوظة", n: mine.consents.length },
    { key: "perio", label: "قياسات اللثة", hint: "آخر فحص", n: mine.perio ? 1 : 0 },
  ];
  const toggle = (k: Key) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const exportSelected = async () => {
    const ctx: DocCtx = { clinicName, doctorName, logo: clinicLogo || undefined, currency, dateISO: todayISO() };
    const docs: string[] = [];
    if (sel.has("statement"))
      docs.push(statementHtml(ctx, patient, sessions.filter((s) => s.patientId === patient.id), payments.filter((p) => p.patientId === patient.id)));
    if (sel.has("rx")) for (const r of mine.rx) docs.push(rxHtml(ctx, patient, r));
    if (sel.has("invoices")) {
      const bal = patientBalance(patient.id, sessions, payments).balance;
      for (const i of mine.invoices) docs.push(invoiceHtml(ctx, patient, { ...i, balance: bal }));
    }
    if (sel.has("consents")) for (const c of mine.consents) docs.push(consentHtml(ctx, patient, c.title, c.body));
    if (sel.has("perio") && mine.perio) docs.push(perioHtml(ctx, patient, mine.perio.date, mine.perio.teeth, perioStats(mine.perio.teeth)));
    if (!docs.length) return Alert.alert("لا شيء للتصدير", "اختر عناصر لها محتوى.");
    setBusy(true);
    const err = await sharePdf(combineHtml(docs), `ملف-${patient.name}`);
    setBusy(false);
    if (err) Alert.alert("PDF", err);
  };

  return (
    <Screen title="مستندات PDF" subtitle={patient.name} back>
      <SectionHeader title="تصدير مجمَّع في ملف واحد" />
      <Card>
        {items.map((it) => {
          const on = sel.has(it.key);
          const empty = it.n === 0;
          return (
            <Pressable key={it.key} disabled={empty} onPress={() => toggle(it.key)} className="flex-row items-center gap-3 py-3 border-b border-line" style={{ opacity: empty ? 0.4 : 1 }}>
              <Ionicons name={on ? "checkbox" : "square-outline"} size={22} color={on ? green : "#94A3B8"} />
              <View className="flex-1">
                <Text w="semi">{it.label}</Text>
                <Text className="text-xs text-muted">{empty ? "لا يوجد" : it.key === "statement" ? it.hint : `${it.n} • ${it.hint}`}</Text>
              </View>
            </Pressable>
          );
        })}
        <View className="mt-3">
          <Button label={busy ? "جارٍ التجهيز..." : `تصدير المحدد (${sel.size})`} icon="share-social" type="private" disabled={sel.size === 0 || busy} onPress={exportSelected} />
        </View>
      </Card>
      <SectionHeader title="مستندات مفردة" />
      <PatientDocs patient={patient} />
    </Screen>
  );
}
