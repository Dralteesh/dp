import { Alert, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Field, FieldRow } from "@/components/ui/Field";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { ALL_TYPE_KEYS, PATIENT_TYPES, toggleTypePatch, type PatientTypeKey } from "@/lib/patientType";
import { toISO } from "@/lib/dates";
import { useClinic } from "@/store/useClinic";
import { useExtras } from "@/store/useExtras";
import type { ApptExtra, Patient } from "@/types";

export const ORTHO_WORKS = ["تبديل سلك", "ربط", "تفعيل", "تركيب جهاز", "إزالة براكيت", "جهاز تثبيت"];
export const IMPLANT_STAGES = ["جراحة", "كشف اندماج", "طبعة", "تركيب دعامة", "تركيب تاج", "متابعة"];
export const ENDO_STAGES = ["فتح وتنظيف", "حشو قنوات", "ترميم نهائي", "متابعة"];
export const CROWN_STAGES = ["تحضير وطبعة", "تجربة", "تركيب نهائي"];
export const PEDO_WORKS = ["فلورايد", "سدّ وقائي", "حشوة لبنية", "قلع لبني"];

type Props = {
  patient: Patient;
  types: PatientTypeKey[];
  detected: PatientTypeKey[];
  extra: ApptExtra;
  onExtra: (patch: ApptExtra) => void;
  /** يضبط الإجراء والمدة عند اختيار مرحلة/عمل */
  onProcedure: (name: string, minutes?: number) => void;
  teeth: string[];
};

/** صف أنواع المريض + إعدادات النوع الفعّال داخل نموذج الموعد (تقويم/زرع/عصب/تيجان/أطفال) */
export function ApptTypeSettings({ patient, types, detected, extra, onExtra, onProcedure, teeth }: Props) {
  const updatePatient = useClinic((s) => s.updatePatient);
  const labOrders = useExtras((s) => s.labOrders);
  const addLab = useExtras((s) => s.addLab);
  const myLabs = labOrders.filter((l) => l.patientId === patient.id && l.status !== "fitted");

  const toggle = (k: PatientTypeKey) =>
    updatePatient(patient.id, toggleTypePatch(patient, k, detected.includes(k), !types.includes(k)));

  const chips = (list: string[], cur: string | undefined, hex: string, pick: (v: string) => void) => (
    <View className="flex-row flex-wrap gap-2">
      {list.map((x) => (
        <Chip key={x} label={x} selected={cur === x} color={hex} onPress={() => pick(cur === x ? "" : x)} />
      ))}
    </View>
  );

  const quickLab = () => {
    const work = extra.crowns?.stage === "تركيب نهائي" ? "تاج" : "تاج زركون";
    addLab({
      patientId: patient.id,
      work,
      tooth: teeth[0],
      sentOn: toISO(new Date()),
      status: "sent",
      paid: false,
      notes: "أُنشئ من نموذج الموعد",
    });
    Alert.alert("أُرسل للمخبر", `طُلب «${work}»${teeth[0] ? ` للسن ${teeth[0]}` : ""}. أكمل بياناته من شاشة المخبر.`);
  };

  const m = (k: PatientTypeKey) => PATIENT_TYPES[k];
  const set = <K extends keyof ApptExtra>(k: K, v: ApptExtra[K]) => onExtra({ [k]: v } as ApptExtra);

  return (
    <Card className="mt-3">
      <Text w="bold" className="mb-1">
        نوع المريض
      </Text>
      <Text className="text-xs text-muted mb-2">يُكتشف تلقائيًا من خطته وجلساته، وتستطيع تفعيله يدويًا لتظهر إعداداته هنا.</Text>
      <View className="flex-row flex-wrap gap-2">
        {ALL_TYPE_KEYS.map((k) => (
          <Chip key={k} label={m(k).label} selected={types.includes(k)} color={m(k).hex} onPress={() => toggle(k)} />
        ))}
      </View>

      {types.includes("ortho") ? (
        <View className="mt-4 pt-3 border-t border-line">
          <Text w="bold" style={{ color: m("ortho").hex }} className="mb-2">
            تقويم
          </Text>
          <FieldRow label="العمل اليوم">
            {chips(ORTHO_WORKS, extra.ortho?.work, m("ortho").hex, (v) => {
              set("ortho", { ...extra.ortho, work: v || undefined });
              if (v) onProcedure(`تقويم - ${v}`, 20);
            })}
          </FieldRow>
          <Field label="السلك (اختياري)" value={extra.ortho?.wire ?? ""} onChangeText={(v) => set("ortho", { ...extra.ortho, wire: v || undefined })} placeholder="مثال: .016 NiTi" />
          <Field label="المطاطات (اختياري)" value={extra.ortho?.elastics ?? ""} onChangeText={(v) => set("ortho", { ...extra.ortho, elastics: v || undefined })} placeholder="مثال: صنف II يمين" />
          <FieldRow label="الزيارة القادمة بعد">
            <View className="flex-row gap-2">
              {[4, 5, 6].map((w) => (
                <Chip key={w} label={`${w} أسابيع`} selected={extra.ortho?.nextWeeks === w} color={m("ortho").hex} onPress={() => set("ortho", { ...extra.ortho, nextWeeks: extra.ortho?.nextWeeks === w ? undefined : w })} />
              ))}
            </View>
          </FieldRow>
        </View>
      ) : null}

      {types.includes("implant") ? (
        <View className="mt-4 pt-3 border-t border-line">
          <Text w="bold" style={{ color: m("implant").hex }} className="mb-2">
            زرع
          </Text>
          <FieldRow label="المرحلة">
            {chips(IMPLANT_STAGES, extra.implant?.stage, m("implant").hex, (v) => {
              set("implant", { ...extra.implant, stage: v || undefined });
              if (v) onProcedure(`زرع - ${v}`, v === "جراحة" ? 90 : 45);
            })}
          </FieldRow>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field label="نظام الزرعة" value={extra.implant?.system ?? ""} onChangeText={(v) => set("implant", { ...extra.implant, system: v || undefined })} />
            </View>
            <View className="flex-1">
              <Field label="القياس" value={extra.implant?.size ?? ""} onChangeText={(v) => set("implant", { ...extra.implant, size: v || undefined })} placeholder="4.1×10" />
            </View>
          </View>
        </View>
      ) : null}

      {types.includes("endo") ? (
        <View className="mt-4 pt-3 border-t border-line">
          <Text w="bold" style={{ color: m("endo").hex }} className="mb-2">
            عصب
          </Text>
          <FieldRow label="المرحلة">
            {chips(ENDO_STAGES, extra.endo?.stage, m("endo").hex, (v) => {
              set("endo", { ...extra.endo, stage: v || undefined });
              if (v) onProcedure(`عصب - ${v}`, 60);
            })}
          </FieldRow>
          <Field label="القنوات / الطول العامل (اختياري)" value={extra.endo?.canals ?? ""} onChangeText={(v) => set("endo", { ...extra.endo, canals: v || undefined })} />
        </View>
      ) : null}

      {types.includes("crowns") ? (
        <View className="mt-4 pt-3 border-t border-line">
          <Text w="bold" style={{ color: m("crowns").hex }} className="mb-2">
            تيجان
          </Text>
          <FieldRow label="المرحلة">
            {chips(CROWN_STAGES, extra.crowns?.stage, m("crowns").hex, (v) => {
              set("crowns", { ...extra.crowns, stage: v || undefined });
              if (v) onProcedure(`تاج - ${v}`, 45);
            })}
          </FieldRow>
          {myLabs.length ? (
            myLabs.map((l) => (
              <View key={l.id} className="flex-row items-center gap-2 mb-1">
                <Ionicons name={l.status === "received" ? "checkmark-circle" : "time-outline"} size={18} color={l.status === "received" ? "#16A34A" : "#D97706"} />
                <Text className="text-sm flex-1">
                  {l.work}
                  {l.tooth ? ` • سن ${l.tooth}` : ""} — {l.status === "received" ? "وصل" : "عند المخبر"}
                </Text>
              </View>
            ))
          ) : (
            <Text className="text-xs text-muted mb-1">لا طلبات مخبر مفتوحة لهذا المريض.</Text>
          )}
          <Pressable onPress={quickLab} className="self-start mt-1" hitSlop={8}>
            <Text w="semi" className="text-xs" style={{ color: TYPE_META.private.hex }}>
              + طلب مخبر سريع {teeth[0] ? `للسن ${teeth[0]}` : ""} ›
            </Text>
          </Pressable>
        </View>
      ) : null}

      {types.includes("pedo") ? (
        <View className="mt-4 pt-3 border-t border-line">
          <Text w="bold" style={{ color: m("pedo").hex }} className="mb-2">
            أطفال
          </Text>
          <FieldRow label="العمل">
            {chips(PEDO_WORKS, extra.pedo?.work, m("pedo").hex, (v) => {
              set("pedo", { work: v || undefined });
              if (v === "فلورايد" || v === "سدّ وقائي") onProcedure("فلورايد وسدّ وقائي", 20);
            })}
          </FieldRow>
        </View>
      ) : null}
    </Card>
  );
}
