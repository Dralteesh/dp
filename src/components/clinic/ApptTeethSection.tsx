import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Odontogram } from "@/components/Odontogram";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { TOOTH_STATUS } from "@/constants/clinic";
import { TYPE_META } from "@/constants/shiftTypes";
import { itemTeeth, type OpenItem } from "@/lib/clinicLink";
import { fmtMoney } from "@/lib/format";
import { toothName } from "@/lib/odontogram";
import { useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";
import type { Patient } from "@/types";

type Props = {
  patient: Patient;
  /** الأسنان المحددة لهذا الموعد */
  teeth: string[];
  onToggleTooth: (tooth: string) => void;
  /** بنود الخطة المفتوحة للمريض */
  opens: OpenItem[];
  /** معرّفات البنود المرتبطة بالموعد */
  linked: string[];
  onToggleItem: (o: OpenItem) => void;
};

/** مخطط أسنان المريض داخل الموعد: تحديد الأسنان يبني الخطة، وبنود الخطة المفتوحة تُربط بالموعد بضغطة */
export function ApptTeethSection({ patient, teeth, onToggleTooth, opens, linked, onToggleItem }: Props) {
  const green = TYPE_META.private.hex;
  const currency = useSettings((s) => s.currency);
  const updatePatient = useClinic((s) => s.updatePatient);
  const last = teeth[teeth.length - 1];

  return (
    <Card className="mt-3">
      <Text w="bold" className="mb-2">
        الأسنان في هذا الموعد
      </Text>
      <Odontogram
        teeth={patient.teeth}
        selected={last}
        highlight={teeth}
        onSelect={onToggleTooth}
        birthYear={patient.birthYear}
        dentition={patient.dentition}
        onDentitionChange={(d) => updatePatient(patient.id, { dentition: d })}
        marks={patient.toothMarks}
        bridges={patient.bridges}
      />

      {teeth.length ? (
        <View className="flex-row flex-wrap gap-2 mt-3">
          {teeth.map((t) => {
            const st = patient.teeth[t];
            return (
              <Pressable
                key={t}
                onPress={() => onToggleTooth(t)}
                className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
                style={{ backgroundColor: TYPE_META.private.soft }}
              >
                <Text w="bold" style={{ color: green, fontVariant: ["tabular-nums"] }}>
                  {t}
                </Text>
                <Text className="text-xs" style={{ color: green }}>
                  {toothName(t)}
                  {st ? ` • ${TOOTH_STATUS[st].label}` : ""}
                </Text>
                <Ionicons name="close" size={14} color={green} />
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text className="text-xs text-muted mt-3">اضغط الأسنان المعمول عليها؛ تُضاف تلقائيًا لخطة العلاج عند الحفظ.</Text>
      )}

      {opens.length ? (
        <View className="mt-4">
          <Text w="semi" className="text-sm mb-1.5">
            من خطة العلاج المفتوحة
          </Text>
          {opens.map((o) => {
            const on = linked.includes(o.item.id);
            const tt = itemTeeth(o.item);
            return (
              <Pressable key={o.item.id} onPress={() => onToggleItem(o)} className="flex-row items-center gap-3 py-2 border-t border-line">
                <Ionicons name={on ? "checkbox" : "square-outline"} size={22} color={on ? green : "#94A3B8"} />
                <View className="flex-1">
                  <Text w="semi">
                    {o.item.procedure}
                    {tt.length ? ` • سن ${tt.join("،")}` : ""}
                  </Text>
                  <Text className="text-xs text-muted">
                    {fmtMoney(o.item.cost, currency)}
                    {o.item.dueOn ? ` • مستهدف ${o.item.dueOn}` : ""}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}
