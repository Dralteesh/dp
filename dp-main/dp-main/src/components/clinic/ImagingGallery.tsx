import { useState } from "react";
import { Alert, Image, Modal, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Text } from "@/components/ui/Text";
import { fmtDateShort, todayISO } from "@/lib/dates";
import { uid } from "@/lib/id";
import { useClinic } from "@/store/useClinic";
import type { Patient, PatientImageKind } from "@/types";

const KINDS: { value: PatientImageKind; label: string; hex: string }[] = [
  { value: "periapical", label: "Periapical", hex: "#0E6FA5" },
  { value: "panoramic", label: "بانوراما", hex: "#7C3AED" },
  { value: "photo", label: "صورة سريرية", hex: "#16A34A" },
  { value: "other", label: "أخرى", hex: "#64748B" },
];
const kindLabel = (k: PatientImageKind) => KINDS.find((x) => x.value === k)?.label ?? k;

const DIR = `${FileSystem.documentDirectory}patient-images/`;

/** الأشعة والصور السريرية للمريض: رفع من المعرض أو الكاميرا، تصنيف، عرض بحجم كامل، حذف */
export function ImagingGallery({ patient }: { patient: Patient }) {
  const add = useClinic((s) => s.addPatientImage);
  const remove = useClinic((s) => s.removePatientImage);
  const [kind, setKind] = useState<PatientImageKind>("periapical");
  const [view, setView] = useState<string | null>(null);
  const images = patient.images ?? [];

  const save = async (uri: string) => {
    try {
      await FileSystem.makeDirectoryAsync(DIR, { intermediates: true }).catch(() => {});
      const dest = `${DIR}${uid()}.jpg`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      add(patient.id, { uri: dest, kind, date: todayISO() });
    } catch {
      Alert.alert("تعذّر حفظ الصورة");
    }
  };

  const pick = async (camera: boolean) => {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("لا توجد صلاحية", camera ? "اسمح للتطبيق باستخدام الكاميرا." : "اسمح للتطبيق بالوصول إلى الصور.");
      return;
    }
    const res = camera
      ? await ImagePicker.launchCameraAsync({ quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (!res.canceled && res.assets[0]) await save(res.assets[0].uri);
  };

  const confirmDelete = (id: string, uri: string) =>
    Alert.alert("حذف الصورة؟", "لا يمكن التراجع.", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: () => {
          FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
          remove(patient.id, id);
        },
      },
    ]);

  return (
    <View className="mt-4">
      <Text className="text-xs text-muted mb-2">نوع الصورة التي ستضيفها:</Text>
      <View className="flex-row flex-wrap gap-2">
        {KINDS.map((k) => (
          <Chip key={k.value} label={k.label} color={k.hex} selected={kind === k.value} onPress={() => setKind(k.value)} />
        ))}
      </View>
      <View className="flex-row gap-2 mt-3">
        <View className="flex-1">
          <Button label="من المعرض" icon="images-outline" onPress={() => pick(false)} />
        </View>
        <View className="flex-1">
          <Button label="الكاميرا" icon="camera-outline" variant="outline" onPress={() => pick(true)} />
        </View>
      </View>

      {images.length === 0 ? (
        <View className="items-center py-10">
          <Ionicons name="image-outline" size={40} color="#94A3B8" />
          <Text className="text-muted mt-2">لا توجد أشعة أو صور بعد</Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-2 mt-4">
          {images.map((im) => (
            <Pressable
              key={im.id}
              onPress={() => setView(im.uri)}
              onLongPress={() => confirmDelete(im.id, im.uri)}
              className="rounded-2xl overflow-hidden border border-line bg-surface"
              style={{ width: "48.5%" }}
            >
              <Image source={{ uri: im.uri }} style={{ width: "100%", height: 130 }} resizeMode="cover" />
              <View className="p-2">
                <Text w="bold" className="text-xs">
                  {kindLabel(im.kind)}
                </Text>
                <Text className="text-[11px] text-muted">{fmtDateShort(im.date)}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
      {images.length ? <Text className="text-[11px] text-muted mt-3">اضغط للتكبير، واضغط مطوّلًا للحذف.</Text> : null}

      <Modal visible={!!view} transparent animationType="fade" onRequestClose={() => setView(null)}>
        <Pressable onPress={() => setView(null)} style={{ flex: 1, backgroundColor: "#000000EE", justifyContent: "center" }}>
          {view ? <Image source={{ uri: view }} style={{ width: "100%", height: "80%" }} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </View>
  );
}
