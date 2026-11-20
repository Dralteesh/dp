import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

const MAX_CHARS = 180_000; // ~135KB: كبير بما يكفي لشعار، وصغير ليُزامَن مع الإعدادات

/**
 * يفتح معرض الصور، يقصّ الصورة مربعة، ويصغّرها، ويعيدها كنص data:image
 * لتُخزَّن داخل الإعدادات وتُزامَن مع الحساب دون خدمة تخزين منفصلة.
 */
export async function pickLogo(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const uri = res.assets[0].uri;

  // PNG (يحفظ الشفافية)، وإن كبر الحجم نعيد الترميز JPEG بحجم أصغر
  const png = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 256 } }], {
    compress: 1,
    format: ImageManipulator.SaveFormat.PNG,
    base64: true,
  });
  if (png.base64 && png.base64.length <= MAX_CHARS) return `data:image/png;base64,${png.base64}`;

  const jpg = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 192 } }], {
    compress: 0.7,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
  return jpg.base64 ? `data:image/jpeg;base64,${jpg.base64}` : null;
}
