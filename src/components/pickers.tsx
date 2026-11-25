import { useEffect, useRef, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MonthGrid } from "@/components/MonthGrid";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { fmtDateFull, fmtTime, fromISO, pad } from "@/lib/dates";

/** زر يعرض قيمة ويفتح منتقيًا عند الضغط */
function PickerButton({
  icon,
  text,
  onPress,
  placeholder,
}: {
  icon: "calendar-outline" | "time-outline";
  text?: string;
  placeholder?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-2 bg-slate-50 border border-line rounded-xl px-3.5 py-3"
    >
      <Ionicons name={icon} size={18} color="#64748B" />
      <Text className={text ? "text-ink" : "text-slate-400"}>{text ?? placeholder}</Text>
    </Pressable>
  );
}

// ---------------- التاريخ ----------------

export function DateField({
  label,
  value,
  onChange,
  clearable,
  placeholder = "اختر تاريخًا",
}: {
  label?: string;
  value?: string;
  onChange: (iso: string | undefined) => void;
  clearable?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const base = value ? fromISO(value) : new Date();
  const [ym, setYm] = useState({ y: base.getFullYear(), m: base.getMonth() });

  useEffect(() => {
    if (open) {
      const b = value ? fromISO(value) : new Date();
      setYm({ y: b.getFullYear(), m: b.getMonth() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <View className="mb-3">
      {label ? (
        <Text w="semi" className="text-sm text-slate-600 mb-1.5">
          {label}
        </Text>
      ) : null}
      <PickerButton
        icon="calendar-outline"
        text={value ? fmtDateFull(value) : undefined}
        placeholder={placeholder}
        onPress={() => setOpen(true)}
      />
      <Sheet visible={open} onClose={() => setOpen(false)} title={label ?? "اختر التاريخ"}>
        <MonthGrid
          year={ym.y}
          month={ym.m}
          selected={value ?? ""}
          onSelect={(iso) => {
            onChange(iso);
            setOpen(false);
          }}
          onMonthChange={(y, m) => setYm({ y, m })}
          dotsFor={() => []}
        />
        {clearable && value ? (
          <View className="mt-3">
            <Button
              label="إزالة التاريخ"
              variant="danger"
              onPress={() => {
                onChange(undefined);
                setOpen(false);
              }}
            />
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

// ---------------- الوقت ----------------

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const ITEM_H = 44;

function Wheel({
  data,
  value,
  onPick,
  format,
}: {
  data: number[];
  value: number;
  onPick: (n: number) => void;
  format: (n: number) => string;
}) {
  const ref = useRef<FlatList<number>>(null);

  useEffect(() => {
    const idx = Math.max(0, data.indexOf(value));
    const t = setTimeout(() => ref.current?.scrollToOffset({ offset: idx * ITEM_H, animated: false }), 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <FlatList
      ref={ref}
      data={data}
      style={{ height: ITEM_H * 5, width: 90 }}
      keyExtractor={(n) => String(n)}
      showsVerticalScrollIndicator={false}
      getItemLayout={(_, i) => ({ length: ITEM_H, offset: ITEM_H * i, index: i })}
      renderItem={({ item }) => {
        const active = item === value;
        return (
          <Pressable
            onPress={() => onPick(item)}
            style={{ height: ITEM_H }}
            className={`items-center justify-center rounded-xl ${active ? "bg-ink" : ""}`}
          >
            <Text w={active ? "bold" : "regular"} className={`text-xl ${active ? "text-white" : "text-slate-500"}`}>
              {format(item)}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

export function TimeField({
  label,
  value,
  onChange,
  clearable,
  onClear,
  placeholder = "اختر وقتًا",
}: {
  label?: string;
  value?: string;
  onChange: (t: string) => void;
  /** يسمح بترك الوقت فارغًا (يظهر زر إزالة ويستدعي onClear) */
  clearable?: boolean;
  onClear?: () => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [h, m] = (value ?? "16:00").split(":").map(Number);
  const [hh, setHh] = useState(h);
  const [mm, setMm] = useState(Math.round(m / 5) * 5 === 60 ? 55 : Math.round(m / 5) * 5);

  const openPicker = () => {
    setHh(h);
    setMm(Math.min(55, Math.round(m / 5) * 5));
    setOpen(true);
  };

  return (
    <View className="mb-3">
      {label ? (
        <Text w="semi" className="text-sm text-slate-600 mb-1.5">
          {label}
        </Text>
      ) : null}
      <PickerButton icon="time-outline" text={value ? fmtTime(value) : undefined} placeholder={placeholder} onPress={openPicker} />
      <Sheet visible={open} onClose={() => setOpen(false)} title={label ?? "اختر الوقت"}>
        <View className="items-center">
          <Text w="bold" className="text-4xl mb-3">
            {fmtTime(`${pad(hh)}:${pad(mm)}`)}
          </Text>
          <View className="flex-row gap-4" style={{ direction: "ltr" }}>
            <Wheel data={HOURS} value={hh} onPick={setHh} format={(n) => pad(n)} />
            <Wheel data={MINUTES} value={mm} onPick={setMm} format={(n) => pad(n)} />
          </View>
          <View className="flex-row gap-3 mt-4 w-full">
            <View className="flex-1">
              <Button
                label="تأكيد"
                icon="checkmark"
                onPress={() => {
                  onChange(`${pad(hh)}:${pad(mm)}`);
                  setOpen(false);
                }}
              />
            </View>
            <View className="flex-1">
              <Button label="إلغاء" variant="soft" onPress={() => setOpen(false)} />
            </View>
          </View>
          {clearable && value && onClear ? (
            <View className="mt-3 w-full">
              <Button
                label="إزالة الوقت"
                variant="danger"
                onPress={() => {
                  onClear();
                  setOpen(false);
                }}
              />
            </View>
          ) : null}
        </View>
      </Sheet>
    </View>
  );
}
