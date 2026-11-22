import { useEffect, useState } from "react";
import { Image, Keyboard, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NAV_ICONS } from "@/constants/icons";
import { useClinicTools } from "@/store/useClinicTools";
import { useFabRequest } from "@/store/useFabRequest";
import { usePrayerTools } from "@/store/usePrayerTools";
import { useQuickAdd } from "@/store/useQuickAdd";

type Route = { key: string; name: string; params?: object };
type BarProps = {
  state: { index: number; routes: Route[] };
  navigation: {
    emit: (e: { type: "tabPress"; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
};

const INK = "#0F1B3D";
const BLUE = "#0E6FA5";

/** شارة القسم الحالي على الزر: أيقونة ولون إجراء الضغط المطوّل */
const SECTION: Record<string, { icon: string; color: string; hint: string }> = {
  index: { icon: "add", color: BLUE, hint: "إضافة سريعة" },
  clinic: { icon: "construct", color: BLUE, hint: "أدوات العيادة" },
  prayer: { icon: "moon", color: "#16A34A", hint: "أدوات الصلاة" },
  alarms: { icon: "add", color: "#E5322D", hint: "منبّه جديد" },
  weather: { icon: "search", color: "#F59E0B", hint: "المدن" },
  calendar: { icon: "add", color: "#6366F1", hint: "إضافة" },
  documents: { icon: "document-attach", color: BLUE, hint: "إضافة ملف" },
};

/**
 * الزر العائم الوحيد (بدل الشريط السفلي):
 * - في الرئيسية: ضغطة أو مطوّلة = الإضافة السريعة.
 * - في أي قسم: ضغطة = الرجوع للرئيسية، ومطوّلة = إجراء القسم (الشارة على الزر تبيّنه).
 */
export function HomeFab({ state, navigation }: BarProps) {
  const insets = useSafeAreaInsets();
  const showQuickAdd = useQuickAdd((s) => s.show);
  const requestTools = useClinicTools((s) => s.request);
  const requestPrayerTools = usePrayerTools((s) => s.request);
  const requestFab = useFabRequest((s) => s.request);
  const [kb, setKb] = useState(false);

  useEffect(() => {
    const a = Keyboard.addListener("keyboardDidShow", () => setKb(true));
    const b = Keyboard.addListener("keyboardDidHide", () => setKb(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  if (kb) return null;

  const current = state.routes[state.index]?.name ?? "index";
  const sec = SECTION[current] ?? SECTION.index;

  const goHome = () => {
    const route = state.routes.find((r) => r.name === "index");
    if (!route) return;
    const ev = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (!ev.defaultPrevented) navigation.navigate(route.name, route.params);
  };

  const onPress = () => (current === "index" ? showQuickAdd() : goHome());

  const onLong = () => {
    if (current === "index") showQuickAdd();
    else if (current === "clinic") requestTools();
    else if (current === "prayer") requestPrayerTools();
    else requestFab(current);
  };

  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center", paddingBottom: Math.max(insets.bottom, 10) + 6 }}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLong}
        delayLongPress={350}
        accessibilityLabel={current === "index" ? "إضافة سريعة" : `الرئيسية (اضغط مطوّلًا: ${sec.hint})`}
        style={{
          width: 68,
          height: 68,
          borderRadius: 34,
          backgroundColor: "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 4,
          borderColor: "#F1F1EF",
          elevation: 10,
          shadowColor: INK,
          shadowOpacity: 0.3,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 5 },
        }}
      >
        <Image source={NAV_ICONS.home.on} style={{ width: 56, height: 56 }} resizeMode="contain" />
        <View
          style={{
            position: "absolute",
            top: -5,
            end: -5,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: sec.color,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2.5,
            borderColor: "#FFFFFF",
          }}
        >
          <Ionicons name={sec.icon as never} size={15} color="#FFFFFF" />
        </View>
      </Pressable>
    </View>
  );
}
