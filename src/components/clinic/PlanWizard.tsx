import { useEffect, useMemo, useState, type ReactNode } from "react";
import { TextInput, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Field } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { PL } from "@/design/planner";
import { fmtMoney, parseAmount } from "@/lib/format";
import { isEndoProcedure } from "@/lib/patientType";
import {
  buildEndoPlan,
  CROWN_LABEL,
  DEFAULT_ENDO,
  hasOpenEndoPlan,
  lookupPrices,
  type CrownType,
  type EndoAnswers,
} from "@/lib/planWizard";
import { useClinic } from "@/store/useClinic";
import { useExtras } from "@/store/useExtras";
import { useSettings } from "@/store/useSettings";

function Ask({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text w="semi" className="mb-1.5">
        {label}
      </Text>
      {hint ? <Text className="text-xs text-muted mb-1.5">{hint}</Text> : null}
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}

function YesNo({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <>
      <Chip label="لا" selected={!value} onPress={() => onChange(false)} />
      <Chip label="نعم" selected={value} color="#16A34A" onPress={() => onChange(true)} />
    </>
  );
}

/**
 * معالج المعالجة اللبية: أسئلة قصيرة تبني خطة العلاج مباشرة
 * (أشعة، تصريف، ضمادات 2–3 داخل سعر الحشو، وتد، بناء، تتويج) مع معاينة قابلة لتعديل التكاليف.
 */
export function PlanWizard({
  visible,
  patientId,
  initialTooth,
  onClose,
}: {
  visible: boolean;
  patientId: string;
  initialTooth?: string;
  onClose: (saved: boolean) => void;
}) {
  const currency = useSettings((s) => s.currency);
  const rate = useSettings((s) => s.usdRate);
  const priceList = useExtras((s) => s.priceList);
  const patient = useClinic((s) => s.patients.find((p) => p.id === patientId));
  const addPlan = useClinic((s) => s.addPlan);

  const [a, setA] = useState<EndoAnswers>({ ...DEFAULT_ENDO, tooth: initialTooth ?? "" });
  const [over, setOver] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      setA({ ...DEFAULT_ENDO, tooth: initialTooth ?? "" });
      setOver({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const book = useMemo(() => lookupPrices(priceList, rate || 0), [priceList, rate]);
  const items = useMemo(() => buildEndoPlan(a, book), [a, book]);
  const costOf = (procedure: string, def: number) => (over[procedure] !== undefined ? parseAmount(over[procedure]) : def);
  const total = items.reduce((s, it) => s + costOf(it.procedure, it.cost), 0);
  const set = (patch: Partial<EndoAnswers>) => setA((cur) => ({ ...cur, ...patch }));

  const save = () => {
    const tooth = a.tooth.trim();
    addPlan(
      patientId,
      `معالجة لبية${tooth ? ` — سن ${tooth}` : ""}`,
      items.map((it) => ({ procedure: it.procedure, tooth: it.tooth, cost: costOf(it.procedure, it.cost) })),
    );
    onClose(true);
  };

  return (
    <Sheet visible={visible} onClose={() => onClose(false)} title="خطة المعالجة اللبية">
      {patient ? <Text className="text-xs text-muted mb-3">{patient.name}</Text> : null}

      <Field label="رقم السن (اختياري)" value={a.tooth} onChangeText={(v) => set({ tooth: v })} placeholder="36" keyboardType="number-pad" />

      <Ask label="هل هي إعادة معالجة لعصب سابق؟">
        <YesNo value={a.retreatment} onChange={(v) => set({ retreatment: v, ...(v ? { dressings: 3 } : {}) })} />
      </Ask>

      <Ask label="هل الحالة عفنة وتستدعي ضمادات؟">
        <YesNo value={a.infected} onChange={(v) => set({ infected: v, swelling: v ? a.swelling : false })} />
      </Ask>
      {a.infected ? (
        <View style={{ paddingStart: 12, borderStartWidth: 3, borderStartColor: "#CBD5E1", marginBottom: 6 }}>
          <Ask label="كم جلسة ضماد؟" hint="تدخل في سعر الحشو">
            <Chip label="2" selected={a.dressings === 2} onPress={() => set({ dressings: 2 })} />
            <Chip label="3" selected={a.dressings === 3} onPress={() => set({ dressings: 3 })} />
          </Ask>
          <Ask label="هل يوجد تورم أو ألم شديد؟" hint="تُضاف جلسة تصريف وعلاج طارئ أولًا">
            <YesNo value={a.swelling} onChange={(v) => set({ swelling: v })} />
          </Ask>
        </View>
      ) : null}

      <Ask label="هل تحتاج وتدًا جذريًا؟" hint="الوتد يشمل بناء السن">
        <YesNo value={a.post} onChange={(v) => set({ post: v })} />
      </Ask>

      <Ask label="هل تحتاج تتويجًا؟">
        <YesNo value={a.crown} onChange={(v) => set({ crown: v })} />
      </Ask>
      {a.crown ? (
        <View style={{ paddingStart: 12, borderStartWidth: 3, borderStartColor: "#CBD5E1", marginBottom: 6 }}>
          <Ask label="نوع التاج">
            {(Object.keys(CROWN_LABEL) as CrownType[]).map((k) => (
              <Chip key={k} label={CROWN_LABEL[k]} selected={a.crownType === k} onPress={() => set({ crownType: k })} />
            ))}
          </Ask>
          {!a.post ? (
            <Ask label="هل يحتاج بناء السن (Core) قبل التاج؟" hint="لأن السن بلا وتد">
              <YesNo value={a.core} onChange={(v) => set({ core: v })} />
            </Ask>
          ) : null}
        </View>
      ) : null}

      <Ask label="أشعة قبل المعالجة وبعد الحشو؟">
        <YesNo value={a.xray} onChange={(v) => set({ xray: v })} />
      </Ask>

      <Text w="bold" className="mb-2 mt-1">
        الخطة المقترحة
      </Text>
      {items.map((it, i) => (
        <View key={it.procedure} className="flex-row items-center gap-2 py-2 border-b border-line">
          <Text w="semi" className="text-xs" style={{ width: 18, color: PL.muted }}>
            {i + 1}
          </Text>
          <Text className="flex-1 text-sm">{it.procedure}</Text>
          <TextInput
            value={over[it.procedure] ?? (it.cost ? String(it.cost) : "")}
            onChangeText={(v) => setOver((o) => ({ ...o, [it.procedure]: v }))}
            placeholder="0"
            placeholderTextColor="#94A3B8"
            keyboardType="decimal-pad"
            style={{ width: 92, borderWidth: 1, borderColor: "#E3E6EB", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, textAlign: "center", fontFamily: "Cairo_400Regular", backgroundColor: "#F8FAFC" }}
          />
        </View>
      ))}
      <View className="flex-row items-center justify-between mt-3 mb-4">
        <Text w="bold">الإجمالي</Text>
        <Text w="bold">{fmtMoney(total, currency)}</Text>
      </View>
      {book.fill === 0 ? (
        <Text className="text-xs text-muted mb-3">لم أجد سعر حشو العصب في قائمة الأسعار؛ اكتب التكلفة يدويًا أو أضفها من «الأسعار».</Text>
      ) : null}

      <Button label="حفظ الخطة" icon="checkmark" type="private" onPress={save} />
      <View className="h-2" />
      <Button label="تخطي" variant="ghost" onPress={() => onClose(false)} />
    </Sheet>
  );
}

/** يفحص هل يلزم عرض المعالج (إجراء عصب ولا خطة عصب مفتوحة) ويعرضه؛ يعيد true إن عرضه */
export function useEndoPlanPrompt() {
  const [state, setState] = useState<{ patientId: string; tooth?: string; after?: () => void } | null>(null);

  const check = (patientId: string, procedure: string, tooth?: string, after?: () => void): boolean => {
    if (!isEndoProcedure(procedure)) return false;
    if (hasOpenEndoPlan(useClinic.getState().plans, patientId, isEndoProcedure)) return false;
    setState({ patientId, tooth, after });
    return true;
  };

  const node = state ? (
    <PlanWizard
      visible
      patientId={state.patientId}
      initialTooth={state.tooth}
      onClose={() => {
        const after = state.after;
        setState(null);
        after?.();
      }}
    />
  ) : null;

  return { check, node };
}
