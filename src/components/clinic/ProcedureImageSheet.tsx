import { useState } from "react";
import { Alert, View } from "react-native";
import { ProcedureGlyph } from "@/components/clinic/ProcedureIcon";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { DEFAULT_PROCEDURES } from "@/constants/clinic";
import { useProcedures } from "@/hooks/useProcedures";
import { GENERIC_ICON } from "@/lib/procedures";
import { pickLogo, transformImage, type ImageOp } from "@/lib/logo";
import { useSettings } from "@/store/useSettings";
import type { ProcedureDef, ProcedureIcon } from "@/types";

/** أدوات التعديل اليدوي لصورة إجراء: اختيار وقص من المعرض، تدوير، قلب، وإزالة (استعادة الأيقونة الافتراضية) */
export function ImageTools({ icon, procedureId, onChange }: { icon: ProcedureIcon; procedureId?: string; onChange: (icon: ProcedureIcon) => void }) {
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    try {
      const uri = await pickLogo();
      if (uri) onChange({ kind: "image", uri });
    } catch {
      Alert.alert("تعذّر فتح المعرض", "تحقق من إذن الصور.");
    }
  };

  const run = async (op: ImageOp) => {
    if (icon.kind !== "image" || busy) return;
    setBusy(true);
    try {
      const uri = await transformImage(icon.uri, op);
      if (uri) onChange({ kind: "image", uri });
    } catch {
      Alert.alert("تعذّر تعديل الصورة", "جرّب اختيار الصورة من جديد.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => onChange(DEFAULT_PROCEDURES.find((p) => p.id === procedureId)?.icon ?? GENERIC_ICON);
  const isImage = icon.kind === "image";

  return (
    <View className="gap-2">
      <Button label="اختيار صورة من المعرض وقصّها يدويًا" icon="image-outline" variant="ghost" onPress={pick} />
      {isImage ? (
        <View className="flex-row flex-wrap gap-2">
          <Button small label="تدوير يمين" icon="refresh" variant="soft" disabled={busy} onPress={() => run("right")} />
          <Button small label="تدوير يسار" icon="refresh" variant="soft" disabled={busy} onPress={() => run("left")} />
          <Button small label="قلب" icon="swap-horizontal" variant="soft" disabled={busy} onPress={() => run("flip")} />
          <Button small label="إزالة الصورة" icon="trash-outline" variant="danger" onPress={reset} />
        </View>
      ) : null}
    </View>
  );
}

/** نافذة تعديل صورة إجراء مباشرة (بالضغط المطوّل على الإجراء): تُحفظ فور كل تعديل */
export function ProcedureImageSheet({ proc, onClose }: { proc: ProcedureDef | null; onClose: () => void }) {
  const list = useProcedures();
  const update = useSettings((s) => s.update);
  const [override, setOverride] = useState<{ id: string; icon: ProcedureIcon } | null>(null);

  const current = proc ? list.find((p) => p.id === proc.id) ?? proc : null;
  const icon = current ? (override && override.id === current.id ? override.icon : current.icon) : GENERIC_ICON;

  const change = (next: ProcedureIcon) => {
    if (!current) return;
    setOverride({ id: current.id, icon: next });
    update({ procedures: list.map((p) => (p.id === current.id ? { ...p, icon: next } : p)) });
  };

  return (
    <Sheet visible={!!proc} onClose={() => { setOverride(null); onClose(); }} title={current ? `صورة «${current.name}»` : undefined}>
      {current ? (
        <>
          <View className="items-center mb-4">
            <ProcedureGlyph icon={icon} size={110} />
          </View>
          <ImageTools icon={icon} procedureId={current.id} onChange={change} />
          <Text className="text-xs text-muted mt-3">للأيقونات الجاهزة والرموز واسم الإجراء ومدته: «تعديل الإجراءات» في الأدوات.</Text>
        </>
      ) : null}
    </Sheet>
  );
}
