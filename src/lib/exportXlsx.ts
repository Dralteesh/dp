import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export type SheetData = { name: string; rows: (string | number)[][] };

const safe = (s: string) => s.replace(/[\\/:*?"<>|\s]+/g, "-").slice(0, 60) || "export";

/**
 * يبني ملف Excel (.xlsx) من أوراق صفوف ويفتح مشاركته (واتساب/حفظ/بريد).
 * الصف الأول في كل ورقة هو العناوين. الورقة من اليمين لليسار. يعيد رسالة خطأ أو null.
 */
export async function shareXlsx(sheets: SheetData[], name: string): Promise<string | null> {
  try {
    const XLSX = require("xlsx");
    const wb = XLSX.utils.book_new();
    for (const sh of sheets) {
      const ws = XLSX.utils.aoa_to_sheet(sh.rows.length ? sh.rows : [["لا بيانات"]]);
      ws["!cols"] = (sh.rows[0] ?? []).map((_, c) => ({ wch: Math.min(40, Math.max(10, ...sh.rows.map((r) => String(r[c] ?? "").length + 2))) }));
      XLSX.utils.book_append_sheet(wb, ws, sh.name.slice(0, 31));
    }
    wb.Workbook = { Views: [{ RTL: true }] };
    const b64: string = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    const dest = `${FileSystem.cacheDirectory}${safe(name)}.xlsx`;
    await FileSystem.writeAsStringAsync(dest, b64, { encoding: FileSystem.EncodingType.Base64 });
    if (!(await Sharing.isAvailableAsync())) return "المشاركة غير متاحة على هذا الجهاز.";
    await Sharing.shareAsync(dest, { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", dialogTitle: name, UTI: "org.openxmlformats.spreadsheetml.sheet" });
    return null;
  } catch (e: any) {
    return `تعذّر إنشاء الملف: ${e?.message ?? "خطأ غير معروف"}`;
  }
}
