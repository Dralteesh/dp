import { useMemo } from "react";
import { activeTypes } from "@/constants/shiftTypes";
import { useSettings } from "@/store/useSettings";
import type { ShiftType } from "@/types";

/** الأنواع/أماكن العمل الظاهرة حاليًا (تتحدّث عند تعديلها من الإعدادات) */
export function useActiveTypes(): ShiftType[] {
  const workplaces = useSettings((s) => s.workplaces);
  useSettings((s) => s.typeColors);
  return useMemo(() => activeTypes(workplaces), [workplaces]);
}
