import { useState } from "react";
import { Alert, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { uid } from "@/lib/id";
import { buildLegacyPlan, isLegacyExport, type LegacyPlan } from "@/lib/legacyImport";
import { useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";

const BLUE = "#0E6FA5";

/** استيراد ملف JSON من البرنامج السابق: معاينة أولًا ثم دمج دون حذف بياناتك الحالية */
export default function ImportScreen() {
  const router = useRouter();
  const currency = useSettings((s) => s.currency);
  const clinicName = useSettings((s) => s.clinicName);
  const [plan, setPlan] = useState<LegacyPlan | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [applyName, setApplyName] = useState(true);
  const [done, setDone] = useState(false);

  const pick = async () => {
    setBusy(true);
    setDone(false);
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/*", "*/*"], copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      const text = await FileSystem.readAsStringAsync(asset.uri);
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        Alert.alert("ملف غير صالح", "الملف ليس JSON صحيحًا.");
        return;
      }
      if (!isLegacyExport(raw)) {
        Alert.alert(
          "صيغة غير معروفة",
          "هذا ليس تصدير البرنامج السابق. إن كان نسخة من Dentist Planner فاستعدها من «الأمان والنسخ الاحتياطي».",
        );
        return;
      }
      const c = useClinic.getState();
      setPlan(buildLegacyPlan(raw as never, c.patients, c.appointments, c.sessions, c.payments, uid));
      setFileName(asset.name);
    } catch (e) {
      Alert.alert("تعذّرت القراءة", String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!plan) return;
    useClinic.setState((s) => {
      const extraNotes = new Map<string, string[]>();
      for (const n of plan.notesForExisting) extraNotes.set(n.patientId, [...(extraNotes.get(n.patientId) ?? []), n.text]);
      const patients = s.patients.map((p) => {
        const teeth = { ...p.teeth };
        let changed = false;
        for (const t of plan.teethForExisting) if (t.patientId === p.id) { teeth[t.tooth] = t.status; changed = true; }
        const add = extraNotes.get(p.id);
        if (!changed && !add) return p;
        return { ...p, teeth, notes: add ? [p.notes, ...add].filter(Boolean).join("\n") : p.notes };
      });
      return {
        patients: [...plan.patients, ...patients],
        appointments: [...plan.appointments, ...s.appointments],
        sessions: [...plan.sessions, ...s.sessions],
        payments: [...plan.payments, ...s.payments],
      };
    });
    if (applyName && plan.clinic?.name && !clinicName) useSettings.getState().update({ clinicName: plan.clinic.name });
    setDone(true);
    setPlan(null);
  };

  const st = plan?.stats;
  const rows: [string, number | undefined][] = [
    ["مرضى جدد", st?.patientsNew],
    ["مرضى موجودون مسبقًا (لن يُكرَّروا)", st?.patientsExisting],
    ["مواعيد", st?.appointments],
    ["جلسات/فواتير", st?.sessions],
    ["دفعات", st?.payments],
    ["سجلات أسنان", st?.teeth],
    ["ملاحظات جلسات", st?.sessionNotes],
  ];

  return (
    <Screen title="استيراد من البرنامج السابق" subtitle="ملف JSON مُصدَّر" back>
      {done ? (
        <Card className="mb-3">
          <View className="items-center py-4 gap-2">
            <Ionicons name="checkmark-circle" size={48} color="#16A34A" />
            <Text w="bold" className="text-lg">
              تم الاستيراد
            </Text>
            <Text className="text-muted text-center">أُضيفت البيانات إلى العيادة دون حذف أي شيء موجود.</Text>
            <Button label="فتح العيادة" icon="medkit" onPress={() => router.replace("/clinic" as never)} />
          </View>
        </Card>
      ) : null}

      <Card className="mb-3">
        <Text className="text-sm text-muted mb-3 leading-6">
          اختر ملف التصدير من البرنامج السابق. ستظهر معاينة بالأعداد والتنبيهات قبل أي إضافة، والاستيراد يدمج ولا يمسح بياناتك الحالية. يمكنك إعادته دون خوف من تكرار نفس المرضى والمواعيد.
        </Text>
        <Button label={busy ? "جارٍ القراءة..." : plan ? "اختيار ملف آخر" : "اختيار ملف JSON"} icon="document-attach" onPress={pick} disabled={busy} />
      </Card>

      {plan ? (
        <>
          <SectionHeader title={`معاينة: ${fileName}`} />
          <Card>
            {rows.map(([label, n]) => (
              <View key={label} className="flex-row items-center justify-between py-2" style={{ borderBottomWidth: 1, borderBottomColor: "#EFEDE5" }}>
                <Text>{label}</Text>
                <Text w="bold" style={{ color: BLUE }}>
                  {n ?? 0}
                </Text>
              </View>
            ))}
          </Card>

          {plan.moneySample ? (
            <Card className="mt-3 bg-amber-50 border-amber-200">
              <Text w="bold" className="text-amber-900 mb-1">
                تأكّد من العملة
              </Text>
              <Text className="text-amber-900 text-sm">
                المبالغ تُستورد كما هي دون تحويل. مثال من الملف: فاتورة {plan.moneySample.total} مدفوع منها {plan.moneySample.paid}. عملتك في التطبيق: «{currency}». إن كانت مبالغ الملف بعملة أخرى فعدّل العملة من الإعدادات.
              </Text>
            </Card>
          ) : null}

          {plan.warnings.length ? (
            <Card className="mt-3">
              <Text w="bold" className="mb-2">
                تنبيهات
              </Text>
              {plan.warnings.map((w, i) => (
                <View key={i} className="flex-row gap-2 mb-1.5">
                  <Ionicons name="alert-circle-outline" size={18} color="#D97706" />
                  <Text className="flex-1 text-sm">{w}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          {plan.clinic?.name && !clinicName ? (
            <Card className="mt-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pe-3">
                  <Text w="semi">استخدام اسم العيادة: {plan.clinic.name}</Text>
                </View>
                <Switch value={applyName} onValueChange={setApplyName} trackColor={{ true: BLUE, false: "#CBD5E1" }} thumbColor="#FFFFFF" />
              </View>
            </Card>
          ) : null}

          <View className="mt-4">
            <Button label="استيراد الآن" icon="download" onPress={apply} />
          </View>
        </>
      ) : null}
    </Screen>
  );
}
