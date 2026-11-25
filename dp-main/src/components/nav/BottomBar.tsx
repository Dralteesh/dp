import { useEffect, useState } from "react";
import { Image, Keyboard, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import { NAV_ICONS } from "@/constants/icons";
import { useClinicTools } from "@/store/useClinicTools";
import { useFabRequest } from "@/store/useFabRequest";
import { usePrayerTools } from "@/store/usePrayerTools";
import { useQuickAdd } from "@/store/useQuickAdd";

const CLINIC_LOGO = require("../../../assets/clinic-logo.png");
const CLINIC_LOGO_OFF = require("../../../assets/clinic-logo-off.png");

type Route = { key: string; name: string; params?: object };
type BarProps = {
  state: { index: number; routes: Route[] };
  navigation: {
    emit: (e: { type: "tabPress"; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
};

/** من اليمين إلى اليسار (RTL): المنبّه، العيادة، الرئيسية، الصلاة، الطقس */
const ORDER = ["alarms", "clinic", "index", "prayer", "weather"] as const;
type Name = (typeof ORDER)[number];

const LABEL: Record<Name, string> = {
  alarms: "المنبّه",
  clinic: "العيادة",
  index: "الرئيسية",
  prayer: "الصلاة",
  weather: "الطقس",
};
const ICON_KEY: Record<Exclude<Name, "clinic">, keyof typeof NAV_ICONS> = {
  alarms: "alarms",
  index: "home",
  prayer: "prayer",
  weather: "weather",
};
/** الشاشات المخفية تُحسب تحت زر قريب ليبقى مضاءً */
const OWNER: Record<string, Name> = { calendar: "index", tasks: "index", documents: "index", docs: "index" };

const BLUE = "#0E6FA5";
const INK = "#0F1B3D";
const MUTED = "#94A3B8";

/**
 * شريط تنقل سفلي ملتصق بالحافة (لا زر عائم): خمسة أقسام بأيقونات وأسماء.
 * ضغط مطوّل: الرئيسية = إضافة سريعة، العيادة/الصلاة = أدواتها، المنبّه/الطقس = إجراء القسم.
 */
export function BottomBar({ state, navigation }: BarProps) {
  const insets = useSafeAreaInsets();
  const showQuickAdd = useQuickAdd((s) => s.show);
  const requestClinic = useClinicTools((s) => s.request);
  const requestPrayer = usePrayerTools((s) => s.request);
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
  const active: Name = (OWNER[current] ?? current) as Name;

  const press = (name: Name) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    const ev = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (!ev.defaultPrevented) navigation.navigate(route.name, route.params);
  };

  const longPress = (name: Name) => {
    if (name === "index") return showQuickAdd();
    press(name);
    if (name === "clinic") requestClinic();
    else if (name === "prayer") requestPrayer();
    else requestFab(name);
  };

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: "#E3E6EB",
        paddingTop: 6,
        paddingBottom: Math.max(insets.bottom, 6),
        paddingHorizontal: 6,
        elevation: 14,
        shadowColor: "#0F172A",
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: -3 },
      }}
    >
      {ORDER.map((name) => {
        const on = active === name;
        return (
          <Pressable
            key={name}
            onPress={() => press(name)}
            onLongPress={() => longPress(name)}
            delayLongPress={350}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={name === "index" ? "الرئيسية (اضغط مطوّلًا للإضافة السريعة)" : LABEL[name]}
            style={{ flex: 1, alignItems: "center", paddingVertical: 2 }}
          >
            <View
              style={{
                width: 52,
                height: 30,
                borderRadius: 15,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: on ? "#D6EBF7" : "transparent",
              }}
            >
              {name === "clinic" ? (
                <Image source={on ? CLINIC_LOGO : CLINIC_LOGO_OFF} style={{ width: 26, height: 26 }} resizeMode="contain" />
              ) : (
                <Image
                  source={on ? NAV_ICONS[ICON_KEY[name]].on : NAV_ICONS[ICON_KEY[name]].off}
                  style={{ width: 28, height: 28 }}
                  resizeMode="contain"
                />
              )}
            </View>
            <Text w={on ? "bold" : "semi"} style={{ fontSize: 10.5, color: on ? BLUE : MUTED, marginTop: 1 }}>
              {LABEL[name]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
