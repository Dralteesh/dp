import { Redirect } from "expo-router";

/** غابة التركيز محذوفة: هذا الملف باقٍ فقط لأن التحديث لا يحذف الملفات القديمة */
export default function RemovedFocus() {
  return <Redirect href="/documents" />;
}
