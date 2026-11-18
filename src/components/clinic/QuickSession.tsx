import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { fmtUsd, priceInBase } from "@/lib/currency";
import { toISO } from "@/lib/dates";
import { fmtMoney } from "@/lib/format";
import { useClinic } from "@/store/useClinic";
import { useExtras } from "@/store/useExtras";
import { useSettings } from "@/store/useSettings";

/** تسجيل جلسة بنقرتين من قائمة الأسعار: اختر الإجراء (واكتب رقم السن إن لزم) فتُسجَّل جلسة اليوم بسعرها */
export function QuickSession({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tooth, setTooth] = useState("");
  const prices = useExtras((s) => s.priceList.filter((p) => p.active));
  const addSession = useClinic((s) => s.addSession);
  const currency = useSettings((s) => s.currency);
  const rate = useSettings((s) => s.usdRate);

  const pick = (id: string) => {
    const item = prices.find((p) => p.id === id);
    if (!item) return;
    const cost = priceInBase(item, rate);
    if (cost === null) {
      Alert.alert("سعر الدولار غير مضبوط", "هذا البند بالدولار. اضبط سعر الدولار من «دخلي الشهري ← الأجور وسعر الدولار».");
      return;
    }
    addSession({
      patientId,
      date: toISO(new Date()),
      procedure: item.name,
      tooth: tooth.trim() || undefined,
      cost,
      foreign: item.currency === "USD" ? { currency: "USD", amount: item.price, rate } : undefined,
    });
    setOpen(false);
    setTooth("");
  };

  return (
    <>
      <Button label="جلسة سريعة من الأسعار" icon="flash" variant="soft" type="private" onPress={() => setOpen(true)} />
      <Sheet visible={open} onClose={() => setOpen(false)} title="جلسة سريعة (اليوم)">
        {prices.length === 0 ? (
          <>
            <EmptyState icon="pricetags-outline" title="لا أسعار بعد" hint="جهّز قائمة أسعار الإجراءات مرة واحدة" />
            <Button
              label="فتح قائمة الأسعار"
              icon="pricetags"
              type="private"
              onPress={() => {
                setOpen(false);
                router.push("/clinic/prices" as never);
              }}
            />
          </>
        ) : (
          <>
            <Field label="رقم السن (اختياري)" value={tooth} onChangeText={setTooth} placeholder="36" keyboardType="number-pad" />
            {prices.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => pick(p.id)}
                className="flex-row items-center justify-between border-b border-line py-3"
              >
                <Text w="semi" className="flex-1">
                  {p.name}
                </Text>
                <Text w="bold" className="text-private-ink">
                  {p.currency === "USD" ? fmtUsd(p.price) : fmtMoney(p.price, currency)}
                </Text>
              </Pressable>
            ))}
            <View className="h-2" />
          </>
        )}
      </Sheet>
    </>
  );
}
