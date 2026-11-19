import { useMemo } from "react";
import { procedureList } from "@/lib/procedures";
import { useSettings } from "@/store/useSettings";
import type { ProcedureDef } from "@/types";

/** كتالوج الإجراءات الحالي (المخصّص أو الافتراضي) */
export function useProcedures(): ProcedureDef[] {
  const custom = useSettings((s) => s.procedures);
  return useMemo(() => procedureList(custom), [custom]);
}
