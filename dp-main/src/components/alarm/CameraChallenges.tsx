import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Text } from "@/components/ui/Text";

const BARCODES = ["qr", "ean13", "ean8", "code128", "code39", "upc_a", "upc_e"] as never;

function NoPermission({ onAsk }: { onAsk: () => void }) {
  return (
    <View className="items-center px-6">
      <Text w="semi" className="text-white text-center mb-4">
        تحتاج الكاميرا لإتمام هذه المهمة
      </Text>
      <Pressable onPress={onAsk} style={{ backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 24, paddingVertical: 12 }}>
        <Text w="bold" style={{ color: "#C2410C" }}>
          السماح بالكاميرا
        </Text>
      </Pressable>
    </View>
  );
}

/** امسح الباركود/QR المسجّل في المنبّه */
export function QrChallenge({ expected, onSolved }: { expected: string; onSolved: () => void }) {
  const [perm, ask] = useCameraPermissions();
  const [wrong, setWrong] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (perm && !perm.granted && perm.canAskAgain) ask();
  }, [perm, ask]);

  if (!perm?.granted) return <NoPermission onAsk={ask} />;
  return (
    <View className="items-center">
      <Text w="semi" className="text-red-100 mb-3">
        {wrong ? "هذا ليس الكود المطلوب" : "وجّه الكاميرا إلى الكود المسجّل"}
      </Text>
      <View style={{ width: 260, height: 260, borderRadius: 28, overflow: "hidden", borderWidth: 4, borderColor: "rgba(255,255,255,0.6)" }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: BARCODES }}
          onBarcodeScanned={({ data }) => {
            if (done.current) return;
            if (data === expected) {
              done.current = true;
              onSolved();
            } else {
              setWrong(true);
            }
          }}
        />
      </View>
    </View>
  );
}

/** التقط صورة (لا يتحقق التطبيق من محتواها، الغرض إجبارك على النهوض) */
export function PhotoChallenge({ onSolved }: { onSolved: () => void }) {
  const [perm, ask] = useCameraPermissions();
  const ref = useRef<CameraView>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (perm && !perm.granted && perm.canAskAgain) ask();
  }, [perm, ask]);

  if (!perm?.granted) return <NoPermission onAsk={ask} />;

  const shot = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const p = await ref.current?.takePictureAsync({ quality: 0.2, skipProcessing: true });
      if (p?.uri) onSolved();
    } catch {
      /* حاول مجددًا */
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="items-center">
      <Text w="semi" className="text-red-100 mb-3">
        التقط صورة لمكان بعيد عن سريرك
      </Text>
      <View style={{ width: 260, height: 300, borderRadius: 28, overflow: "hidden", borderWidth: 4, borderColor: "rgba(255,255,255,0.6)" }}>
        <CameraView ref={ref} style={{ flex: 1 }} facing="back" />
      </View>
      <Pressable
        onPress={shot}
        accessibilityLabel="التقاط"
        style={{ marginTop: 16, width: 72, height: 72, borderRadius: 36, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", opacity: busy ? 0.6 : 1 }}
      >
        <Ionicons name="camera" size={32} color="#C2410C" />
      </Pressable>
    </View>
  );
}

/** نافذة تسجيل الكود داخل شاشة تعديل المنبّه */
export function QrScanModal({ visible, onClose, onScan }: { visible: boolean; onClose: () => void; onScan: (data: string) => void }) {
  const [perm, ask] = useCameraPermissions();
  const done = useRef(false);

  useEffect(() => {
    if (visible) done.current = false;
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#111", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="إغلاق" style={{ position: "absolute", top: 48, end: 20 }}>
          <Ionicons name="close" size={30} color="#fff" />
        </Pressable>
        {!perm?.granted ? (
          <NoPermission onAsk={ask} />
        ) : (
          <>
            <Text w="semi" style={{ color: "#fff", marginBottom: 16 }}>
              وجّه الكاميرا إلى الباركود الذي ستستعمله لإيقاف المنبّه
            </Text>
            <View style={{ width: 300, height: 300, borderRadius: 28, overflow: "hidden" }}>
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: BARCODES }}
                onBarcodeScanned={({ data }) => {
                  if (done.current) return;
                  done.current = true;
                  onScan(data);
                }}
              />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}
