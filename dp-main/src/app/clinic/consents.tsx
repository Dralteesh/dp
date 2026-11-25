import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { CONSENT_TEMPLATES, fillConsent } from "@/lib/consents";
import { fmtDateShort, todayISO } from "@/lib/dates";
import { sharePdf } from "@/lib/pdf";
import { consentHtml, type DocCtx } from "@/lib/pdfHtml";
import { useClinic } from "@/store/useClinic";
import { useExtras } from "@/store/useExtras";
import { useSettings } from "@/store/useSettings";

/** نماذج الموافقة المستنيرة: اختر نموذجًا، عدّل نصه، احفظه وصدّره PDF للتوقيع */
export default function ConsentsScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const patient = useClinic((s) => s.patients.find((p) => p.id === patientId));
  const all = useExtras((s) => s.consents);
  const add = useExtras((s) => s.addConsent);
  const update = useExtras((s) => s.updateConsent);
  const remove = useExtras((s) => s.removeConsent);
  const clinicName = useSettings((s) => s.clinicName);
  const clinicLogo = useSettings((s) => s.clinicLogo);
  const doctorName = useSettings((s) => s.doctorName);
  const currency = useSettings((s) => s.currency);
  const green = TYPE_META.private.hex;

  const [pick, setPick] = useState(false);
  const [draft, setDraft] = useState<{ templateId: string; title: string; body: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!patient) return <Screen title="الموافقات" back><Text className="text-muted">المريض غير موجود.</Text></Screen>;
  const list = all.filter((c) => c.patientId === patient.id).sort((a, b) => b.createdAt - a.createdAt);
  const ctx = (): DocCtx => ({ clinicName, doctorName, logo: clinicLogo || undefined, currency, dateISO: todayISO() });

  const print = async (title: string, body: string) => {
    setBusy(true);
    const err = await sharePdf(consentHtml(ctx(), patient, title, body), `${title}-${patient.name}`);
    setBusy(false);
    if (err) Alert.alert("PDF", err);
  };

  return (
    <Screen title="نماذج الموافقة" subtitle={patient.name} back>
      <Button label="نموذج جديد" icon="add" type="private" onPress={() => setPick(true)} />
      <View className="mt-3">
        {list.length === 0 ? (
          <EmptyState icon="document-text-outline" title="لا نماذج بعد" hint="أنشئ نموذج موافقة وصدّره PDF ليوقّعه المريض" />
        ) : (
          list.map((c) => (
            <Card key={c.id} className="mb-2">
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text w="bold">{c.title}</Text>
                  <Text className="text-xs text-muted">{fmtDateShort(c.date)}</Text>
                </View>
                <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: c.signed ? "#DCFCE7" : "#FEF3C7" }}>
                  <Text w="semi" className="text-xs" style={{ color: c.signed ? "#166534" : "#92400E" }}>
                    {c.signed ? "موقَّع" : "بانتظار التوقيع"}
                  </Text>
                </View>
              </View>
              <View className="flex-row flex-wrap gap-2 mt-3">
                <Chip label="PDF" icon="share-outline" color={green} onPress={() => !busy && print(c.title, c.body)} />
                <Chip label={c.signed ? "إلغاء التوقيع" : "تم التوقيع"} icon="checkmark" onPress={() => update(c.id, { signed: !c.signed })} />
                <Pressable
                  hitSlop={8}
                  className="justify-center"
                  onPress={() =>
                    Alert.alert("حذف", "حذف هذا النموذج؟", [
                      { text: "إلغاء", style: "cancel" },
                      { text: "حذف", style: "destructive", onPress: () => remove(c.id) },
                    ])
                  }
                >
                  <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                </Pressable>
              </View>
            </Card>
          ))
        )}
      </View>

      <Sheet visible={pick} onClose={() => setPick(false)} title="اختر النموذج">
        {CONSENT_TEMPLATES.map((t) => (
          <Pressable
            key={t.id}
            className="py-3.5 border-b border-line"
            onPress={() => {
              setPick(false);
              setDraft({ templateId: t.id, title: t.title, body: fillConsent(t, patient, { clinic: clinicName, doctor: doctorName }) });
            }}
          >
            <Text w="semi">{t.title}</Text>
          </Pressable>
        ))}
      </Sheet>

      <Sheet visible={!!draft} onClose={() => setDraft(null)} title={draft?.title ?? ""}>
        <Text className="text-xs text-muted mb-2">راجع النص وعدّله إن لزم قبل الحفظ.</Text>
        <Field value={draft?.body ?? ""} onChangeText={(v) => setDraft((d) => (d ? { ...d, body: v } : d))} multiline style={{ minHeight: 260, textAlignVertical: "top" }} />
        <Button
          label="حفظ"
          icon="checkmark"
          type="private"
          onPress={() => {
            if (!draft) return;
            add({ patientId: patient.id, templateId: draft.templateId, title: draft.title, body: draft.body, date: todayISO(), signed: false });
            setDraft(null);
          }}
        />
        <View className="h-2" />
        <Button label="حفظ وتصدير PDF" icon="share-outline" variant="soft" type="private" onPress={() => {
          if (!draft) return;
          add({ patientId: patient.id, templateId: draft.templateId, title: draft.title, body: draft.body, date: todayISO(), signed: false });
          const d = draft;
          setDraft(null);
          print(d.title, d.body);
        }} />
      </Sheet>
    </Screen>
  );
}
