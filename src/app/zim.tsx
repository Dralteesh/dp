import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useZim, type ZimItem } from "@/store/useZim";

const BLUE = "#0E6FA5";
const fmtSize = (b: number) => (b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b > 1e6 ? `${Math.round(b / 1e6)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

/** ملفات ZIM: ويكيبيديا وغيرها (صيغة Kiwix) تُقرأ بلا إنترنت */
export default function ZimLibrary() {
  const router = useRouter();
  const { zims, importZim, removeZim } = useZim();
  const [busy, setBusy] = useState(false);

  const add = async () => {
    setBusy(true);
    try {
      await importZim();
    } catch (e) {
      Alert.alert("تعذّر استيراد الملف", String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const del = (z: ZimItem) =>
    Alert.alert("حذف الملف؟", `${z.name}\nسيُحذف من الجهاز (${fmtSize(z.size)}).`, [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: () => removeZim(z.id) },
    ]);

  return (
    <Screen back title="ملفات ZIM" subtitle={`${zims.length} ملف • ويكيبيديا وغيرها بلا إنترنت`} overlay={busy ? undefined : <Fab onPress={add} color={BLUE} icon="add" />}>
      {busy && (
        <View className="bg-surface border border-line rounded-2xl p-4 mb-3 flex-row items-center gap-3">
          <ActivityIndicator color={BLUE} />
          <Text className="flex-1 text-sm">جارٍ نسخ الملف وفحصه… قد يستغرق دقائق للملفات الكبيرة.</Text>
        </View>
      )}

      {zims.length === 0 && !busy ? (
        <EmptyState
          icon="albums-outline"
          title="لا ملفات ZIM بعد"
          hint="نزّل ملف .zim (مثل ويكيبيديا المصغّرة) من library.kiwix.org ثم اضغط + لاختياره. يفضّل الملفات الصغيرة أو المتوسطة."
        />
      ) : (
        zims.map((z) => (
          <Pressable
            key={z.id}
            onPress={() => router.push({ pathname: "/zim-read", params: { id: z.id } })}
            onLongPress={() => del(z)}
            className="flex-row items-center gap-3 bg-surface border border-line rounded-2xl p-3 mb-2"
          >
            <View className="w-12 h-12 rounded-2xl items-center justify-center" style={{ backgroundColor: "#DBEAFE" }}>
              <Ionicons name="globe-outline" size={24} color="#2563EB" />
            </View>
            <View className="flex-1">
              <Text w="bold" numberOfLines={1}>
                {z.name}
              </Text>
              <Text className="text-xs text-muted" numberOfLines={1}>
                {[fmtSize(z.size), `${z.count.toLocaleString()} مدخل`, z.lang].filter(Boolean).join(" • ")}
              </Text>
              {z.desc ? (
                <Text className="text-xs text-slate-500" numberOfLines={1}>
                  {z.desc}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-back" size={18} color="#94A3B8" />
          </Pressable>
        ))
      )}
      {zims.length > 0 && <Text className="text-xs text-muted text-center mt-2">اضغط مطوّلًا على ملف لحذفه</Text>}
    </Screen>
  );
}
