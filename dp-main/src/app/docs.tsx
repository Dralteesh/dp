import { Redirect } from "expo-router";

/** مسار قديم: يحوّل إلى تبويب المستندات (الملف باقٍ لأن التحديث لا يحذف الملفات) */
export default function OldDocs() {
  return <Redirect href="/documents" />;
}
