import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Field, FieldRow } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { useTheme } from "@/hooks/useTheme";
import { fmtUsd } from "@/lib/currency";
import { fmtMoney, parseAmount } from "@/lib/format";
import { useExtras } from "@/store/useExtras";
import { useSettings } from "@/store/useSettings";
import type { PriceItem, TreatmentPackage } from "@/types/extras";
import { useProcedures } from "@/hooks/useProcedures";

/** قائمة أسعار الإجراءات: تُستعمل في «جلسة سريعة» داخل ملف المريض */
export default function PricesScreen() {
  const procedures = useProcedures();
  useTheme();
  const currency = useSettings((s) => s.currency);
  const items = useExtras((s) => s.priceList);
  const addPrice = useExtras((s) => s.addPrice);
  const updatePrice = useExtras((s) => s.updatePrice);
  const removePrice = useExtras((s) => s.removePrice);
  const green = TYPE_META.private.hex;
  const packages = useExtras((s) => s.packages);
  const addPackage = useExtras((s) => s.addPackage);
  const updatePackage = useExtras((s) => s.updatePackage);
  const removePackage = useExtras((s) => s.removePackage);
  const [pkgOpen, setPkgOpen] = useState(false);
  const [pkgId, setPkgId] = useState<string | null>(null);
  const [pkgName, setPkgName] = useState("");
  const [pkgPrice, setPkgPrice] = useState("");
  const [pkgProcs, setPkgProcs] = useState<string[]>([]);
  const openPkg = (p?: TreatmentPackage) => {
    setPkgId(p?.id ?? null);
    setPkgName(p?.name ?? "");
    setPkgPrice(p ? String(p.price) : "");
    setPkgProcs(p?.procedures ?? []);
    setPkgOpen(true);
  };
  const savePkg = () => {
    const n = pkgName.trim();
    const v = parseAmount(pkgPrice);
    if (!n) return Alert.alert("اكتب اسم الحزمة");
    if (pkgProcs.length < 2) return Alert.alert("اختر إجرائين على الأقل");
    if (v <= 0) return Alert.alert("اكتب سعر الحزمة");
    if (pkgId) updatePackage(pkgId, { name: n, price: v, procedures: pkgProcs });
    else addPackage({ name: n, price: v, procedures: pkgProcs });
    setPkgOpen(false);
  };

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [cur, setCur] = useState<PriceItem["currency"]>("base");

  const openNew = () => {
    setEditId(null);
    setName("");
    setPrice("");
    setCur("base");
    setOpen(true);
  };
  const openEdit = (p: PriceItem) => {
    setEditId(p.id);
    setName(p.name);
    setPrice(String(p.price));
    setCur(p.currency);
    setOpen(true);
  };
  const save = () => {
    const n = name.trim();
    const v = parseAmount(price);
    if (!n) return Alert.alert("اكتب اسم الإجراء");
    if (v <= 0) return Alert.alert("اكتب سعرًا أكبر من صفر");
    if (editId) updatePrice(editId, { name: n, price: v, currency: cur });
    else addPrice({ name: n, price: v, currency: cur });
    setOpen(false);
  };
  const importDefaults = () => {
    const have = new Set(items.map((i) => i.name));
    const missing = procedures.filter((p) => !have.has(p.name));
    if (!missing.length) return Alert.alert("كلها موجودة");
    Alert.alert("استيراد الإجراءات", `ستُضاف ${missing.length} إجراءات بسعر صفر لتعدّل أسعارها بنفسك.`, [
      { text: "إلغاء", style: "cancel" },
      { text: "استيراد", onPress: () => missing.forEach((p) => addPrice({ name: p.name, price: 0, currency: "base", minutes: p.minutes })) },
    ]);
  };

  const fmt = (p: PriceItem) => (p.currency === "USD" ? fmtUsd(p.price) : fmtMoney(p.price, currency));

  return (
    <Screen title="أسعار الإجراءات" subtitle="لتسجيل الجلسات بنقرتين" back overlay={<Fab color={green} onPress={openNew} />}>
      {items.length === 0 ? (
        <>
          <EmptyState icon="pricetags-outline" title="لا أسعار بعد" hint="أضف الإجراءات التي تعملها مع أسعارها" />
          <Button label="استيراد الإجراءات الشائعة" icon="download" variant="soft" type="private" onPress={importDefaults} />
        </>
      ) : (
        <>
          {items.map((p) => (
            <Card key={p.id} className="mb-2.5" >
              <View className="flex-row items-center gap-3">
                <Pressable className="flex-1" onPress={() => openEdit(p)}>
                  <Text w="semi" style={{ opacity: p.active ? 1 : 0.4 }}>
                    {p.name}
                  </Text>
                  <Text className="text-xs text-muted">{p.active ? "فعّال" : "مخفي"}</Text>
                </Pressable>
                <Text w="bold" style={{ color: p.price > 0 ? "#14532D" : "#B45309" }}>
                  {p.price > 0 ? fmt(p) : "بلا سعر"}
                </Text>
                <Pressable hitSlop={10} onPress={() => updatePrice(p.id, { active: !p.active })}>
                  <Ionicons name={p.active ? "eye" : "eye-off"} size={20} color="#64748B" />
                </Pressable>
                <Pressable
                  hitSlop={10}
                  onPress={() =>
                    Alert.alert("حذف البند", `حذف «${p.name}» من القائمة؟`, [
                      { text: "إلغاء", style: "cancel" },
                      { text: "حذف", style: "destructive", onPress: () => removePrice(p.id) },
                    ])
                  }
                >
                  <Ionicons name="trash-outline" size={20} color="#DC2626" />
                </Pressable>
              </View>
            </Card>
          ))}
          <View className="mt-2">
            <Button label="استيراد الإجراءات الشائعة" icon="download" variant="soft" small onPress={importDefaults} />
          </View>
        </>
      )}

      <Text w="bold" className="mt-6 mb-2">
        الحزم (سعر واحد لعدة إجراءات)
      </Text>
      {packages.map((p) => (
        <Card key={p.id} className="mb-2.5">
          <View className="flex-row items-center gap-3">
            <Pressable className="flex-1" onPress={() => openPkg(p)}>
              <Text w="semi">{p.name}</Text>
              <Text className="text-xs text-muted">{p.procedures.join(" + ")}</Text>
            </Pressable>
            <Text w="bold" style={{ color: "#14532D" }}>{fmtMoney(p.price, currency)}</Text>
            <Pressable
              hitSlop={10}
              onPress={() =>
                Alert.alert("حذف الحزمة", `حذف «${p.name}»؟`, [
                  { text: "إلغاء", style: "cancel" },
                  { text: "حذف", style: "destructive", onPress: () => removePackage(p.id) },
                ])
              }
            >
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
            </Pressable>
          </View>
        </Card>
      ))}
      <Button label="حزمة جديدة" icon="gift-outline" variant="soft" type="private" onPress={() => openPkg()} />

      <Sheet visible={pkgOpen} onClose={() => setPkgOpen(false)} title={pkgId ? "تعديل الحزمة" : "حزمة جديدة"}>
        <Field label="اسم الحزمة" value={pkgName} onChangeText={setPkgName} placeholder="مثال: تبييض + تنظيف" />
        <FieldRow label="الإجراءات (اختر اثنين أو أكثر)">
          <View className="flex-row flex-wrap gap-2">
            {procedures.map((pr) => (
              <Chip
                key={pr.id}
                label={pr.name}
                selected={pkgProcs.includes(pr.name)}
                color={green}
                onPress={() => setPkgProcs((cur) => (cur.includes(pr.name) ? cur.filter((x) => x !== pr.name) : [...cur, pr.name]))}
              />
            ))}
          </View>
        </FieldRow>
        <Field label={`سعر الحزمة (${currency})`} value={pkgPrice} onChangeText={setPkgPrice} keyboardType="decimal-pad" />
        <Button label="حفظ" icon="checkmark" type="private" onPress={savePkg} />
      </Sheet>

      <Sheet visible={open} onClose={() => setOpen(false)} title={editId ? "تعديل البند" : "بند جديد"}>
        <Field label="الإجراء" value={name} onChangeText={setName} placeholder="مثال: حشوة تجميلية" />
        <FieldRow label="عملة السعر">
          <View className="flex-row gap-2">
            <Chip label={currency} selected={cur === "base"} color={green} onPress={() => setCur("base")} />
            <Chip label="$ دولار" selected={cur === "USD"} color={green} onPress={() => setCur("USD")} />
          </View>
        </FieldRow>
        <Field label="السعر" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0" />
        <Button label="حفظ" icon="checkmark" type="private" onPress={save} />
      </Sheet>
    </Screen>
  );
}
