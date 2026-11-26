/**
 * ترحيل آمن لبيانات العيادة إلى نموذج الربط (يعمل مرة واحدة):
 * 1) نسخة احتياطية من بيانات العيادة عبر التخزين المشفّر (لا نكتب بيانات مرضى غير مشفّرة).
 *    إن فشلت النسخة أو لم تتطابق عند إعادة قراءتها يُلغى الترحيل.
 * 2) تحويل tooth النصّي الحرّ في بنود الخطة إلى teeth[] (لا حذف ولا تغيير للقيم القديمة).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { splitTeeth } from "@/lib/clinicLink";
import { flushSecure, peekSecure, secureStateStorage } from "@/lib/secureStore";
import { STORAGE_KEYS } from "@/lib/storage";
import { useClinic } from "@/store/useClinic";

const DONE_KEY = "dp.clinic.link-migration.v1";
export const PRE_LINK_BACKUP_KEY = "dp.clinic.backup.pre-link";

export async function runClinicLinkMigration(): Promise<void> {
  try {
    if (await AsyncStorage.getItem(DONE_KEY)) return;
    await flushSecure();
    const raw = await peekSecure(STORAGE_KEYS.clinic);
    if (raw) {
      secureStateStorage.setItem(PRE_LINK_BACKUP_KEY, raw);
      await flushSecure();
      if ((await peekSecure(PRE_LINK_BACKUP_KEY)) !== raw) return;
    }
    useClinic.setState((s) => ({
      plans: s.plans.map((pl) => ({
        ...pl,
        items: pl.items.map((it) => (it.teeth?.length || !it.tooth ? it : { ...it, teeth: splitTeeth(it.tooth) })),
      })),
    }));
    await AsyncStorage.setItem(DONE_KEY, new Date().toISOString());
  } catch {
    // لا نكسر التطبيق: تُعاد المحاولة في التشغيل التالي
  }
}
