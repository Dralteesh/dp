import { useState } from "react";
import { View } from "react-native";
import { Chip } from "@/components/ui/Chip";
import { Field, FieldRow } from "@/components/ui/Field";
import { Text } from "@/components/ui/Text";
import { makeMoney, toBase, type Cur } from "@/lib/currency";
import { fmtMoney, parseAmount } from "@/lib/format";
import { useSettings } from "@/store/useSettings";

/** حالة حقل مبلغ بعملتين (عملة العيادة / دولار). result() يعيد amount بعملة العيادة وforeign إن كان بالدولار. */
export function useMoneyInput(initialText = "") {
  const storedRate = useSettings((s) => s.usdRate);
  const [text, setText] = useState(initialText);
  const [cur, setCur] = useState<Cur>("base");
  const [rateText, setRateText] = useState(storedRate ? String(storedRate) : "");
  const rate = parseAmount(rateText);

  return {
    text,
    setText,
    cur,
    setCur,
    rateText,
    setRateText,
    rate,
    value: parseAmount(text),
    /** null إن كان الإدخال غير صالح (صفر أو بلا سعر دولار) */
    result() {
      const r = makeMoney(cur, parseAmount(text), rate);
      // نحفظ سعر الدولار الجديد ليصبح الافتراضي في المرة القادمة
      if (r && cur === "usd" && rate > 0 && rate !== useSettings.getState().usdRate) {
        useSettings.getState().update({ usdRate: rate });
      }
      return r;
    },
    reset() {
      setText("");
      setCur("base");
    },
  };
}

export type MoneyInput = ReturnType<typeof useMoneyInput>;

export function MoneyField({ label = "المبلغ", m, autoFocus }: { label?: string; m: MoneyInput; autoFocus?: boolean }) {
  const currency = useSettings((s) => s.currency);
  return (
    <View>
      <FieldRow label={label}>
        <View className="flex-row gap-2">
          <Chip label={currency} selected={m.cur === "base"} onPress={() => m.setCur("base")} />
          <Chip label="$ دولار" selected={m.cur === "usd"} color="#16A34A" onPress={() => m.setCur("usd")} />
        </View>
      </FieldRow>
      <Field value={m.text} onChangeText={m.setText} placeholder="0" keyboardType="decimal-pad" autoFocus={autoFocus} />
      {m.cur === "usd" ? (
        <View>
          <Field
            label={`سعر الدولار (${currency})`}
            value={m.rateText}
            onChangeText={m.setRateText}
            placeholder="مثال: 14000"
            keyboardType="numeric"
          />
          {m.rate > 0 && m.value > 0 ? (
            <Text className="text-sm text-muted -mt-1 mb-3">
              = {fmtMoney(toBase(m.value, m.rate), currency)} (يُسجَّل بهذا السعر ولا يتغيّر لاحقًا)
            </Text>
          ) : m.rate <= 0 ? (
            <Text className="text-sm mb-3" style={{ color: "#B45309" }}>
              اكتب سعر الدولار اليوم ليُحسب المبلغ.
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
