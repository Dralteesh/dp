import type { Drug, DrugForm } from "@/types";

export const DRUG_FORMS: Record<DrugForm, string> = {
  tablet: "حبة (قرص)",
  capsule: "كبسولة",
  ampoule: "أمبولة",
  syrup: "شراب",
  suspension: "معلّق",
  gel: "جل",
  ointment: "مرهم",
  spray: "بخاخ",
  mouthwash: "غسول فموي",
  toothpaste: "معجون أسنان",
  powder: "مسحوق",
};

/** نص الجرعة الجاهز للوصفة، مثل: «1 كبسولة (500 ملغ) × 3 مرات يوميًا» */
export function dosageText(d: Pick<Drug, "doseMg" | "timesPerDay" | "unitsPerTime" | "form" | "notes">): string {
  const units = d.unitsPerTime || 1;
  const times = d.timesPerDay || 1;
  const dose = d.doseMg && d.doseMg > 0 ? ` (${d.doseMg} ملغ)` : "";
  const timesLabel = times === 1 ? "مرة واحدة" : times === 2 ? "مرتين" : `${times} مرات`;
  return `${units} ${DRUG_FORMS[d.form] ?? d.form}${dose} × ${timesLabel} يوميًا${d.notes ? ` — ${d.notes}` : ""}`;
}

/** رقم من نص عربي/إنجليزي، أو undefined */
export function parseNum(v: string): number | undefined {
  const n = Number(
    v
      .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
      .replace("٫", ".")
      .trim(),
  );
  return v.trim() && Number.isFinite(n) ? n : undefined;
}
