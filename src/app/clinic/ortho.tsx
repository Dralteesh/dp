import { useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DateField } from "@/components/pickers";
import { DictateField } from "@/components/DictateField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Field, FieldRow } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { fmtDateShort, todayISO } from "@/lib/dates";
import { uid } from "@/lib/id";
import { useClinic } from "@/store/useClinic";
import { useExtras } from "@/store/useExtras";
import type { OrthoCase } from "@/types/extras";

const CLASSES: Array<NonNullable<OrthoCase["angleClass"]>> = ["I", "II-1", "II-2", "III"];

/** ملف حالة التقويم: فحص، علاقات، مسافات، خطة، وسجل زيارات */
export default function OrthoScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const patient = useClinic((s) => s.patients.find((p) => p.id === patientId));
  const cases = useExtras((s) => s.orthoCases);
  const save = useExtras((s) => s.saveOrtho);
  const cur = cases.find((o) => o.patientId === patientId);
  const green = TYPE_META.private.hex;

  const [f, setF] = useState({
    angleClass: cur?.angleClass,
    overjet: cur?.overjet ?? "",
    overbite: cur?.overbite ?? "",
    spaceUpper: cur?.spaceUpper ?? "",
    spaceLower: cur?.spaceLower ?? "",
    exam: cur?.exam ?? "",
    problems: cur?.problems ?? "",
    plan: cur?.plan ?? "",
    appliance: cur?.appliance ?? "",
    startDate: cur?.startDate,
    endDate: cur?.endDate,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const [vDate, setVDate] = useState(todayISO());
  const [vDone, setVDone] = useState("");
  const [vNext, setVNext] = useState("");

  // إن وصلت بيانات من المزامنة بعد فتح الشاشة ولم يبدأ المستخدم بالكتابة
  useEffect(() => {
    if (cur && !f.exam && !f.plan && !f.problems) {
      setF({
        angleClass: cur.angleClass,
        overjet: cur.overjet ?? "",
        overbite: cur.overbite ?? "",
        spaceUpper: cur.spaceUpper ?? "",
        spaceLower: cur.spaceLower ?? "",
        exam: cur.exam ?? "",
        problems: cur.problems ?? "",
        plan: cur.plan ?? "",
        appliance: cur.appliance ?? "",
        startDate: cur.startDate,
        endDate: cur.endDate,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur?.id]);

  if (!patient) return <Screen title="التقويم" back><Text className="text-muted">المريض غير موجود.</Text></Screen>;

  const clean = (s: string) => s.trim() || undefined;
  const saveAll = () => {
    save(patient.id, {
      angleClass: f.angleClass,
      overjet: clean(f.overjet),
      overbite: clean(f.overbite),
      spaceUpper: clean(f.spaceUpper),
      spaceLower: clean(f.spaceLower),
      exam: clean(f.exam),
      problems: clean(f.problems),
      plan: clean(f.plan),
      appliance: clean(f.appliance),
      startDate: f.startDate,
      endDate: f.endDate,
    });
    Alert.alert("تم الحفظ");
  };

  const addVisit = () => {
    if (!vDone.trim()) return Alert.alert("اكتب ما أُجري في الزيارة");
    const visits = [...(cur?.visits ?? []), { id: uid(), date: vDate, done: vDone.trim(), next: clean(vNext) }];
    save(patient.id, { visits });
    setVDone("");
    setVNext("");
  };
  const removeVisit = (id: string) => save(patient.id, { visits: (cur?.visits ?? []).filter((v) => v.id !== id) });
  const visits = [...(cur?.visits ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1));
  const last = visits.find((v) => v.next);

  return (
    <Screen title="ملف التقويم" subtitle={patient.name} back>
      {last?.next ? (
        <Card accent="private" className="mb-3">
          <Text className="text-xs text-muted">للزيارة القادمة ({fmtDateShort(last.date)})</Text>
          <Text w="semi">{last.next}</Text>
        </Card>
      ) : null}

      <Card accent="private">
        <FieldRow label="تصنيف أنجل (الأرحاء)">
          <View className="flex-row flex-wrap gap-2">
            {CLASSES.map((c) => (
              <Chip key={c} label={`صنف ${c}`} selected={f.angleClass === c} color={green} onPress={() => set("angleClass", f.angleClass === c ? undefined : c)} />
            ))}
          </View>
        </FieldRow>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="Overjet (مم)" value={f.overjet} onChangeText={(v) => set("overjet", v)} keyboardType="numbers-and-punctuation" />
          </View>
          <View className="flex-1">
            <Field label="Overbite (مم)" value={f.overbite} onChangeText={(v) => set("overbite", v)} keyboardType="numbers-and-punctuation" />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="مسافات علوي" value={f.spaceUpper} onChangeText={(v) => set("spaceUpper", v)} hint="+ ازدحام / − فراغ" keyboardType="numbers-and-punctuation" />
          </View>
          <View className="flex-1">
            <Field label="مسافات سفلي" value={f.spaceLower} onChangeText={(v) => set("spaceLower", v)} hint="+ ازدحام / − فراغ" keyboardType="numbers-and-punctuation" />
          </View>
        </View>
        <DictateField label="الفحص السريري" value={f.exam} onChangeText={(v) => set("exam", v)} multiline />
        <DictateField label="قائمة المشاكل" value={f.problems} onChangeText={(v) => set("problems", v)} multiline />
        <DictateField label="خطة المعالجة" value={f.plan} onChangeText={(v) => set("plan", v)} multiline />
        <Field label="الجهاز المستعمل" value={f.appliance} onChangeText={(v) => set("appliance", v)} placeholder="تقويم ثابت معدني، شفاف..." />
        <DateField label="بدء العلاج" value={f.startDate} onChange={(v) => set("startDate", v)} clearable placeholder="غير محدد" />
        <DateField label="انتهاء العلاج" value={f.endDate} onChange={(v) => set("endDate", v)} clearable placeholder="غير محدد" />
        <Button label="حفظ الملف" icon="checkmark" type="private" onPress={saveAll} />
      </Card>

      <Text w="bold" className="mt-5 mb-2">
        سجل الزيارات
      </Text>
      <Card>
        <DateField label="تاريخ الزيارة" value={vDate} onChange={(v) => setVDate(v ?? todayISO())} />
        <Field label="ما أُجري" value={vDone} onChangeText={setVDone} placeholder="تبديل سلك 014 نيتي، ربط مطاط..." />
        <Field label="الزيارة القادمة (اختياري)" value={vNext} onChangeText={setVNext} placeholder="سلك 016، إضافة مطاط صنف II" />
        <Button label="إضافة زيارة" icon="add" variant="soft" type="private" onPress={addVisit} />
      </Card>
      {visits.map((v) => (
        <Card key={v.id} className="mt-2">
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-xs text-muted">{fmtDateShort(v.date)}</Text>
              <Text w="semi">{v.done}</Text>
              {v.next ? <Text className="text-sm text-muted mt-1">القادمة: {v.next}</Text> : null}
            </View>
            <Pressable
              hitSlop={8}
              onPress={() =>
                Alert.alert("حذف الزيارة", "حذف هذه الزيارة؟", [
                  { text: "إلغاء", style: "cancel" },
                  { text: "حذف", style: "destructive", onPress: () => removeVisit(v.id) },
                ])
              }
            >
              <Ionicons name="trash-outline" size={18} color="#94A3B8" />
            </Pressable>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
