import { useState } from "react";
import { Alert, View } from "react-native";
import { DateField } from "@/components/pickers";
import { DictateField } from "@/components/DictateField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Field, FieldRow } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { fmtDateShort, todayISO } from "@/lib/dates";
import { parseAmount } from "@/lib/format";
import { sharePdf } from "@/lib/pdf";
import { medicalReportHtml, rxHtml, sickLeaveHtml, statementHtml, type DocCtx } from "@/lib/pdfHtml";
import { useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";
import type { Patient } from "@/types";

type Sheet_ = null | "rx" | "report" | "leave";

/** مستندات PDF للمريض: وصفة، كشف حساب، تقرير طبي، إجازة مرضية (بشعار واسم العيادة) */
export function PatientDocs({ patient }: { patient: Patient }) {
  const [sheet, setSheet] = useState<Sheet_>(null);
  const [busy, setBusy] = useState(false);
  const [reportText, setReportText] = useState("");
  const [days, setDays] = useState("2");
  const [from, setFrom] = useState(todayISO());
  const [reason, setReason] = useState("");

  const clinicName = useSettings((s) => s.clinicName);
  const clinicLogo = useSettings((s) => s.clinicLogo);
  const doctorName = useSettings((s) => s.doctorName);
  const currency = useSettings((s) => s.currency);
  const allRx = useClinic((s) => s.prescriptions);
  const allSessions = useClinic((s) => s.sessions);
  const allPayments = useClinic((s) => s.payments);
  const green = TYPE_META.private.hex;

  const rxList = allRx.filter((r) => r.patientId === patient.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const ctx = (): DocCtx => ({ clinicName, doctorName, logo: clinicLogo || undefined, currency, dateISO: todayISO() });

  const run = async (html: string, name: string) => {
    setBusy(true);
    const err = await sharePdf(html, `${name}-${patient.name}`);
    setBusy(false);
    if (err) Alert.alert("PDF", err);
  };

  return (
    <Card className="mt-3">
      <Text w="bold" className="mb-2">
        مستندات PDF
      </Text>
      <View className="flex-row flex-wrap gap-2">
        <Chip label="وصفة" icon="document-text" color={green} onPress={() => (rxList.length ? setSheet("rx") : Alert.alert("لا وصفات", "أضف وصفة للمريض أولًا."))} />
        <Chip
          label="كشف حساب"
          icon="receipt"
          color={green}
          onPress={() =>
            run(
              statementHtml(
                ctx(),
                patient,
                allSessions.filter((s) => s.patientId === patient.id),
                allPayments.filter((p) => p.patientId === patient.id),
              ),
              "كشف-حساب",
            )
          }
        />
        <Chip label="تقرير طبي" icon="clipboard" color={green} onPress={() => setSheet("report")} />
        <Chip label="إجازة مرضية" icon="bed" color={green} onPress={() => setSheet("leave")} />
      </View>
      {busy ? <Text className="text-xs text-muted mt-2">جارٍ تجهيز الملف...</Text> : null}

      <Sheet visible={sheet === "rx"} onClose={() => setSheet(null)} title="اختر الوصفة">
        {rxList.map((rx) => (
          <Button
            key={rx.id}
            label={`${fmtDateShort(rx.date)} • ${rx.lines.length} دواء`}
            icon="document-text"
            variant="soft"
            type="private"
            className="mb-2"
            onPress={() => {
              setSheet(null);
              run(rxHtml(ctx(), patient, rx), "وصفة");
            }}
          />
        ))}
      </Sheet>

      <Sheet visible={sheet === "report"} onClose={() => setSheet(null)} title="تقرير طبي">
        <DictateField
          label="نص التقرير"
          value={reportText}
          onChangeText={setReportText}
          multiline
          placeholder="التشخيص والإجراءات المنفّذة والتوصيات..."
        />
        <Button
          label="إنشاء PDF"
          icon="share-social"
          type="private"
          onPress={() => {
            if (!reportText.trim()) return Alert.alert("اكتب نص التقرير");
            setSheet(null);
            run(medicalReportHtml(ctx(), patient, reportText), "تقرير-طبي");
          }}
        />
      </Sheet>

      <Sheet visible={sheet === "leave"} onClose={() => setSheet(null)} title="إجازة مرضية">
        <DateField label="اعتبارًا من" value={from} onChange={(v) => v && setFrom(v)} />
        <FieldRow label="عدد الأيام">
          <View className="flex-row flex-wrap gap-2">
            {["1", "2", "3", "5", "7", "10"].map((d) => (
              <Chip key={d} label={d} selected={days === d} color={green} onPress={() => setDays(d)} />
            ))}
          </View>
        </FieldRow>
        <Field label="أو اكتب عددًا آخر" value={days} onChangeText={setDays} keyboardType="number-pad" />
        <Field label="التشخيص/السبب (اختياري)" value={reason} onChangeText={setReason} />
        <Button
          label="إنشاء PDF"
          icon="share-social"
          type="private"
          onPress={() => {
            const n = parseAmount(days);
            if (n < 1) return Alert.alert("اكتب عدد الأيام");
            setSheet(null);
            run(sickLeaveHtml(ctx(), patient, { days: n, from, reason: reason.trim() || undefined }), "اجازة-مرضية");
          }}
        />
      </Sheet>
    </Card>
  );
}
