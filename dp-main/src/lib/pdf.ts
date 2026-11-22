import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

const safeName = (s: string) => s.replace(/[\\/:*?"<>|\s]+/g, "-").slice(0, 60) || "document";

/**
 * يحوّل HTML إلى PDF ويفتح قائمة المشاركة (واتساب، حفظ، طباعة...).
 * يعيد رسالة خطأ نصية عند الفشل، أو null عند النجاح.
 * يحتاج حزمة expo-print (وحدة أصلية: تتطلب إعادة بناء التطبيق بعد تثبيتها).
 */
export async function sharePdf(html: string, name: string): Promise<string | null> {
  let Print: any;
  try {
    Print = require("expo-print");
  } catch {
    return "ميزة PDF تحتاج تثبيت حزمة expo-print ثم إعادة بناء التطبيق.";
  }
  try {
    const { uri } = await Print.printToFileAsync({ html });
    let out: string = uri;
    try {
      const dest = `${FileSystem.cacheDirectory}${safeName(name)}.pdf`;
      await FileSystem.deleteAsync(dest, { idempotent: true });
      await FileSystem.moveAsync({ from: uri, to: dest });
      out = dest;
    } catch {
      // الاسم الأصلي يكفي
    }
    if (!(await Sharing.isAvailableAsync())) return "المشاركة غير متاحة على هذا الجهاز.";
    await Sharing.shareAsync(out, { mimeType: "application/pdf", dialogTitle: name, UTI: "com.adobe.pdf" });
    return null;
  } catch (e: any) {
    return `تعذّر إنشاء الملف: ${e?.message ?? "خطأ غير معروف"}`;
  }
}
