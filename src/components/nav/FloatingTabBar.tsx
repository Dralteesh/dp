import { useEffect, useState } from "react";
import { Image, Keyboard, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import { NAV_ICONS } from "@/constants/icons";
import { useClinicTools } from "@/store/useClinicTools";
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

/** ترتيب الأزرار من اليمين إلى اليسار (واجهة RTL): المنبّه، العيادة، الرئيسية، الصلاة، الطقس */
const ORDER = ["alarms", "clinic", "index", "prayer", "weather"] as const;
type Name = (typeof ORDER)[number];

/** الأيقونات ملوّنة: نسختان (نشطة وخاملة) لكل زر، والعيادة بشعارها */
const META: Record<Name, { label: string }> = {
  alarms: { label: "المنبّه" },
  clinic: { label: "العيادة" },
  index: { label: "الرئيسية" },
  prayer: { label: "الصلاة" },
  weather: { label: "الطقس" },
};

const ICON_KEY: Record<Exclude<Name, "clinic">, keyof typeof NAV_ICONS> = {
  alarms: "alarms",
  index: "home",
  prayer: "prayer",
  weather: "weather",
};

/** الشاشات المخفية من الشريط تُحسب تحت زرٍّ قريب منها ليبقى الزر مضاءً */
const OWNER: Record<string, Name> = { calendar: "index", tasks: "index", documents: "index", docs: "index" };

const BLUE = "#0E6FA5";
const INK = "#0F1B3D";
const MUTED = "#94A3B8";

/** شريط تنقل عائم: الرئيسية كبيرة في المنتصف، والعيادة بشعارها، والضغط المطوّل على الرئيسية = إضافة سريعة */
export function FloatingTabBar({ state, navigation }: BarProps) {
  const insets = useSafeAreaInsets();
  const showQuickAdd = useQuickAdd((s) => s.show);
  const requestTools = useClinicTools((s) => s.request);
  const requestPrayerTools = usePrayerTools((s) => s.request);
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

  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: Math.max(insets.bottom, 10) + 4, paddingHorizontal: 14 }}
    >
      <View
        style={{
          height: 66,
          borderRadius: 33,
          backgroundColor: "#FFFFFF",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 8,
          elevation: 12,
          shadowColor: "#0F172A",
          shadowOpacity: 0.14,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          borderWidth: 1,
          borderColor: "#E3E6EB",
        }}
      >
        {ORDER.map((name) => {
          const m = META[name];
          const on = active === name;

          if (name === "index") {
            return (
              <View key={name} style={{ width: 76, alignItems: "center" }}>
                <Pressable
                  onPress={() => press(name)}
                  onLongPress={() => showQuickAdd()}
                  delayLongPress={350}
                  accessibilityLabel="الرئيسية (اضغط مطوّلًا للإضافة السريعة)"
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    marginTop: -26,
                    backgroundColor: "#FFFFFF",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 4,
                    borderColor: "#F1F1EF",
                    elevation: 8,
                    shadowColor: INK,
                    shadowOpacity: 0.35,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                  }}
                >
                  <Image source={NAV_ICONS.home.on} style={{ width: 54, height: 54 }} resizeMode="contain" />
                </Pressable>
                <Text w="semi" style={{ fontSize: 10.5, color: on ? BLUE : MUTED, marginTop: 1 }}>
                  {m.label}
                </Text>
              </View>
            );
          }

          return (
            <Pressable
              key={name}
              onPress={() => press(name)}
              onLongPress={
                name === "clinic"
                  ? () => {
                      press("clinic");
                      requestTools();
                    }
                  : name === "prayer"
                    ? () => {
                        press("prayer");
                        requestPrayerTools();
                      }
                    : undefined
              }
              delayLongPress={350}
              accessibilityLabel={name === "clinic" ? "العيادة (اضغط مطوّلًا لأدوات العيادة)" : name === "prayer" ? "الصلاة (اضغط مطوّلًا لأدوات الصلاة)" : m.label}
              style={{ flex: 1, alignItems: "center", paddingVertical: 6 }}
            >
              <View
                style={{
                  width: 46,
                  height: 30,
                  borderRadius: 15,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "transparent",
                }}
              >
                {name === "clinic" ? (
                  <Image source={on ? CLINIC_LOGO : CLINIC_LOGO_OFF} style={{ width: 30, height: 30 }} resizeMode="contain" />
                ) : (
                  <Image
                    source={on ? NAV_ICONS[ICON_KEY[name]].on : NAV_ICONS[ICON_KEY[name]].off}
                    style={{ width: 34, height: 34 }}
                    resizeMode="contain"
                  />
                )}
              </View>
              <Text w={on ? "bold" : "semi"} style={{ fontSize: 10.5, color: on ? INK : MUTED }}>
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
