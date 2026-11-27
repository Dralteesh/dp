import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Field } from "@/components/ui/Field";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { itemTeeth, type OpenItem } from "@/lib/clinicLink";
import { fmtMoney, parseAmount } from "@/lib/format";
import { itemNet } from "@/lib/planFinance";
import type { TreatmentPlan } from "@/types";

type Props = {
  procedure: string;
  teeth: string[];
  /** بنود الخطة المفتوحة للمريض */
  opens: OpenItem[];
  /** معرّفات البنود المرتبطة بالموعد */
  linked: string[];
  onToggleItem: (o: OpenItem) => void;
  /** خطط المريض الحالية */
  plans: TreatmentPlan[];
  /** الخطة التي ستُضاف إليها البنود الجديدة ("new" = خطة جديدة) */
  planId: string;
  onPlanId: (id: string) => void;
  /** أسنان ستُنشأ لها بنود جديدة */
  willCreate: string[];
  /** سعر الإجراء من قائمة الأسعار (0 إن لم يوجد) */
  unitCost: number;
  /** تكلفة مكتوبة يدويًا لكل سن */
  costs: Record<string, string>;
  onCost: (tooth: string, v: string) => void;
  currency: string;
};

/** تكلفة بند جديد لسنّ: المكتوب يدويًا وإلا سعر قائمة الأسعار */
export const costFor = (tooth: string, costs: Record<string, string>, unit: number): number => {
  const typed = parseAmount(costs[tooth] ?? "");
  return typed > 0 ? typed : unit;
};

/** الخطوة الثالثة في الحجز: خطة العلاج — البنود المفتوحة، البنود الجديدة بتكلفتها، والخطة المستهدفة */
export function ApptPlanSection({ procedure, teeth, opens, linked, onToggleItem, plans, planId, onPlanId, willCreate, unitCost, costs, onCost, currency }: Props) {
  const green = TYPE_META.private.hex;
  // البنود المطابقة للأسنان المحددة تظهر أولًا
  const sel = new Set(teeth);
  const ordered = [...opens].sort((a, b) => Number(itemTeeth(b.item).some((t) => sel.has(t))) - Number(itemTeeth(a.item).some((t) => sel.has(t))));
  const linkedCost = opens.filter((o) => linked.includes(o.item.id)).reduce((a, o) => a + itemNet(o.item), 0);
  const newCost = willCreate.reduce((a, t) => a + costFor(t, costs, unitCost), 0);
  const total = linkedCost + newCost;

  return (
    <Card className="mt-3">
      <Text w="bold" className="mb-1">
        ٣. خطة العلاج والتكلفة
      </Text>

      {willCreate.length ? (
        <View className="mt-1">
          <Text w="semi" className="text-sm mb-1.5">
            بنود جديدة تُضاف للخطة عند الحفظ
          </Text>
          {willCreate.map((t) => (
            <View key={t} className="flex-row items-center gap-3 py-1.5 border-t border-line">
              <View className="flex-1">
                <Text w="semi">
                  {procedure} • سن {t}
                </Text>
                <Text className="text-xs text-muted">{unitCost ? `من قائمة الأسعار: ${fmtMoney(unitCost, currency)}` : "لا سعر في قائمة الأسعار — اكتب التكلفة"}</Text>
              </View>
              <View style={{ width: 110 }}>
                <Field value={costs[t] ?? ""} onChangeText={(v) => onCost(t, v)} placeholder={unitCost ? String(Math.round(unitCost)) : "0"} keyboardType="decimal-pad" />
              </View>
            </View>
          ))}
          {plans.length ? (
            <View className="mt-2">
              <Text className="text-xs text-muted mb-1.5">أضِف إلى:</Text>
              <View className="flex-row flex-wrap gap-2">
                {plans.map((p) => (
                  <Chip key={p.id} label={p.title} selected={planId === p.id} color={green} onPress={() => onPlanId(p.id)} />
                ))}
                <Chip label="+ خطة جديدة" selected={planId === "new"} color={green} onPress={() => onPlanId("new")} />
              </View>
            </View>
          ) : null}
        </View>
      ) : (
        <Text className="text-xs text-muted mt-1">
          {teeth.length ? "لا بنود جديدة: الإجراء الحالي لا يُنشئ بند خطة (كشف/مراجعة) أو يوجد بند مفتوح مطابق." : "حدّد الأسنان من المخطط ثم نوع الإجراء لتظهر بنود الخطة وتكلفتها."}
        </Text>
      )}

      {ordered.length ? (
        <View className="mt-4">
          <Text w="semi" className="text-sm mb-1.5">
            من خطة العلاج المفتوحة (اضغط لربطها بالموعد)
          </Text>
          {ordered.map((o) => {
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
                    {o.plan.title} • {fmtMoney(itemNet(o.item), currency)}
                    {o.item.dueOn ? ` • مستهدف ${o.item.dueOn}` : ""}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {total > 0 ? (
        <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-line">
          <Text w="semi">تكلفة بنود هذا الموعد</Text>
          <Text w="bold" style={{ color: green }}>
            {fmtMoney(total, currency)}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}
