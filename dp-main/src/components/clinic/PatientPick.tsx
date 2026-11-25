import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Chip } from "@/components/ui/Chip";
import { Field, FieldRow } from "@/components/ui/Field";
import { Text } from "@/components/ui/Text";
import { TYPE_META } from "@/constants/shiftTypes";
import { initial } from "@/lib/format";
import { useClinic } from "@/store/useClinic";

/** اختيار مريض: بحث بالاسم أو الهاتف */
export function PatientPick({ value, onChange }: { value?: string; onChange: (id: string | undefined) => void }) {
  const patients = useClinic((s) => s.patients);
  const [q, setQ] = useState("");
  const green = TYPE_META.private.hex;
  const cur = patients.find((p) => p.id === value);
  const matches = useMemo(
    () => patients.filter((p) => !q.trim() || p.name.includes(q.trim()) || (p.phone ?? "").includes(q.trim())).slice(0, 20),
    [patients, q],
  );
  return (
    <FieldRow label="المريض">
      {cur ? (
        <Chip label={cur.name} selected color={green} icon="checkmark" onPress={() => onChange(undefined)} />
      ) : (
        <View>
          <Field value={q} onChangeText={setQ} placeholder="بحث بالاسم أو الهاتف" />
          {matches.map((p) => (
            <Pressable key={p.id} onPress={() => onChange(p.id)} className="flex-row items-center gap-3 py-2 border-b border-line">
              <View className="w-8 h-8 rounded-full bg-private-soft items-center justify-center">
                <Text w="bold" className="text-private-ink">
                  {initial(p.name)}
                </Text>
              </View>
              <Text w="semi">{p.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </FieldRow>
  );
}
