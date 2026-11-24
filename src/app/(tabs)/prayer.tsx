import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { SceneDisc, SceneFront, SceneGlow, SceneRing } from "@/components/prayer/PrayerScene";
import { CrossSky, Fade } from "@/components/prayer/SkyFx";
import { WeatherBehind, WeatherFront } from "@/components/prayer/WeatherSky";
import { PrayerToolsSheet } from "@/components/prayer/PrayerToolsSheet";
import { StarField } from "@/components/prayer/StarField";
import { Text } from "@/components/ui/Text";
import { PRAYER_THEMES, skyKey } from "@/constants/prayerThemes";
import { useNow } from "@/hooks/useNow";
import { addDays, combine, fmtCountdown, fmtDateFull, fmtTimeDate, todayISO } from "@/lib/dates";
import { setWeatherReturn } from "@/lib/navReturn";
import { dimOf, skyWeatherOf, tintSky } from "@/lib/skyWeather";
import { ICON_OF, kindOf, labelOf } from "@/lib/weather";
import { fmtTemp } from "@/lib/weatherInsights";
import { CITY, PRAYER_LABELS, PRAYER_METHODS, PRAYER_ORDER, getPrayerTimes, nextPrayer } from "@/lib/prayer";
import { usePrayerLog, type FardKey } from "@/store/usePrayerLog";
import { usePrayerTools } from "@/store/usePrayerTools";
import { useSettings } from "@/store/useSettings";
import { useWeather } from "@/store/useWeather";

export default function PrayerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const now = useNow(1000);
  const prayerMethod = useSettings((s) => s.prayerMethod);
  const madhab = useSettings((s) => s.madhab);
  const prayerAdjust = useSettings((s) => s.prayerAdjust);
  const prayerNotify = useSettings((s) => s.prayerNotify);
  const location = useSettings((s) => s.location);
  const mosque = useSettings((s) => s.mosque);
  const toggleNotify = useSettings((s) => s.toggleNotify);
  const doneLog = usePrayerLog((s) => s.done);
  const markDone = usePrayerLog((s) => s.markDone);
  const unmark = usePrayerLog((s) => s.unmark);

  // ضغط مطوّل على تبويب الصلاة يفتح نافذة الأدوات (حتى لو كانت الشاشة تُفتح للتو)
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsPending = usePrayerTools((s) => s.pending);
  const consumeTools = usePrayerTools((s) => s.consume);
  useEffect(() => {
    if (toolsPending) {
      setToolsOpen(true);
      consumeTools();
    }
  }, [toolsPending, consumeTools]);

  // الشاشة داكنة: نجعل أيقونات شريط الحالة فاتحة وهي ظاهرة فقط
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      // نجدّد الطقس المنتهي فقط (يُستخدم لسماء الصلاة)
      useWeather.getState().refreshAll().catch(() => {});
      return () => setFocused(false);
    }, []),
  );

  // طقس مدينتك الأولى يلوّن السماء ويحرّكها
  const wx = useWeather((s) => (s.cities[0] ? s.cache[s.cities[0].id] : undefined));
  const units = useWeather((s) => s.units);

  const [iso, setIso] = useState(todayISO());
  const isToday = iso === todayISO();

  const times = useMemo(
    () => getPrayerTimes(combine(iso, "12:00"), { prayerMethod, madhab, prayerAdjust }),
    [iso, prayerMethod, madhab, prayerAdjust, location],
  );

  const minuteKey = Math.floor(now.getTime() / 60000);
  const next = useMemo(
    () => nextPrayer(new Date(), { prayerMethod, madhab, prayerAdjust }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [minuteKey, prayerMethod, madhab, prayerAdjust, location],
  );
  const sky = useMemo(
    () => skyKey(new Date(), { prayerMethod, madhab, prayerAdjust }, next.key),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [minuteKey, prayerMethod, madhab, prayerAdjust, location, next.key],
  );
  const theme = PRAYER_THEMES[sky];

  const sw = useMemo(
    () => skyWeatherOf(wx, minuteKey * 60000),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wx, minuteKey],
  );
  const wKind = sw.kind;
  const wLevel = sw.level;
  const wWind = sw.wind;
  const skyColors = useMemo(() => tintSky(theme.sky, { kind: wKind, level: wLevel, wind: wWind }, theme.night), [theme, wKind, wLevel, wWind]);
  const dim = dimOf(wKind);
  const wxFresh = !!wx && minuteKey * 60000 - wx.fetchedAt < 3 * 60 * 60 * 1000;

  const openWeather = useCallback(() => {
    // نعرض مدينتك الأولى (التي تلوّن السماء) ونعود إلى الصلاة بزر الرجوع
    useWeather.getState().setIndex(0);
    setWeatherReturn("/prayer");
    router.push("/weather" as never);
  }, [router]);

  const remaining = next.time.getTime() - now.getTime();
  const span = next.time.getTime() - next.previous.getTime();
  const progress = Math.min(1, Math.max(0, 1 - remaining / span));

  // اللوح السفلي يتحدد ارتفاعه بمحتواه، والمشهد يستند إليه ويدخل تحته قليلًا
  const [panelH, setPanelH] = useState(340);
  // ارتفاع الترويسة + العدّاد (يُقاس فعليًا)
  const [topH, setTopH] = useState(190);

  // المشهد يُحجَّم بحيث يبدأ مدار التقدّم دائمًا تحت العدّاد فلا يحجب الشمس أو القمر
  const SCENE_W = 360;
  const SCENE_H = 300;
  const RING_TOP = theme.discY - 98 - 6; // أعلى نقطة في المدار (بوحدات المشهد)
  const sceneBottom = height - panelH + 40; // الحافة السفلية للمشهد (إحداثي الشاشة)
  const fitScale = (sceneBottom - topH - 6) / (SCENE_H - RING_TOP);
  const scale = Math.max(0.5, Math.min(width / SCENE_W, fitScale));
  const sceneH = SCENE_H * scale;
  // حدود نطاق الغيوم: من أسفل العدّاد إلى خط الأفق (سطوح المباني)
  const sceneTop = height - (panelH - 40) - sceneH;
  const zoneTop = Math.round(topH + 6);
  const zoneBottom = Math.max(zoneTop + 80, Math.round(sceneTop + 168 * scale));
  const sceneBox = { position: "absolute", left: 0, right: 0, bottom: panelH - 40, height: sceneH } as const;
  const layer = {
    kind: wKind,
    level: wLevel,
    wind: wWind,
    night: theme.night,
    width: Math.round(width),
    height: Math.round(height),
    zoneTop,
    zoneBottom,
  };

  return (
    <View style={{ flex: 1 }}>
      {focused ? <StatusBar style="light" /> : null}
      <CrossSky colors={skyColors} />
      {theme.night ? (
        <Animated.View
          key="stars"
          pointerEvents="none"
          entering={FadeIn.duration(1500)}
          exiting={FadeOut.duration(1500)}
          style={StyleSheet.absoluteFill}
        >
          <Fade to={dim.stars}>
            <StarField />
          </Fade>
        </Animated.View>
      ) : null}

      {/* الشمس/القمر وتوهّجهما (يخفتان بسلاسة خلف الغيوم) */}
      <View pointerEvents="none" style={sceneBox}>
        <Fade to={dim.glow}>
          <SceneGlow sky={sky} />
        </Fade>
        <Fade to={dim.disc}>
          <SceneDisc sky={sky} />
        </Fade>
      </View>

      {/* الغيوم والطيور: بين الشمس وأفق المباني */}
      {focused ? <WeatherBehind {...layer} ambient={theme.clouds} birds={theme.birds} /> : null}

      {/* مدار التقدّم ثم الأفق */}
      <View pointerEvents="none" style={sceneBox}>
        <SceneRing sky={sky} progress={progress} />
        <SceneFront sky={sky} />
      </View>

      {/* المطر والثلج والضباب والبرق: فوق كل شيء ما عدا النصوص */}
      {focused ? <WeatherFront {...layer} /> : null}

      {/* الترويسة */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }} onLayout={(e) => setTopH(e.nativeEvent.layout.height)}>
        <View className="flex-row items-center justify-between">
          <View style={{ width: 84, alignItems: "flex-start" }}>
            <Pressable
              onPress={() => setToolsOpen(true)}
              hitSlop={8}
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
              accessibilityLabel="أدوات الصلاة"
            >
              <Ionicons name="apps-outline" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
          <Pressable onPress={openWeather} className="items-center" accessibilityLabel="فتح الطقس">
            <Text w="semi" className="text-white">
              الصلاة القادمة
            </Text>
            <Text className="text-white text-xs" style={{ opacity: 0.8 }}>
              {location?.name ?? CITY.name} • {PRAYER_METHODS[prayerMethod].label}
            </Text>
          </Pressable>
          <View className="flex-row gap-2" style={{ width: 84, justifyContent: "flex-end" }}>
            <Pressable
              onPress={() => router.push({ pathname: "/reminders-prayer", params: { only: "dhikr" } } as never)}
              hitSlop={8}
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
              accessibilityLabel="الأذكار"
            >
              <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={() => router.push("/prayer-settings" as never)}
              hitSlop={8}
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
              accessibilityLabel="إعدادات الصلاة"
            >
              <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <Pressable onPress={openWeather} accessibilityLabel="فتح الطقس">
          <Text
            w="bold"
            className="text-white text-center"
            style={{ fontSize: 50, lineHeight: 64, marginTop: 6, fontVariant: ["tabular-nums"] }}
          >
            {fmtCountdown(remaining)}
          </Text>
          <Text className="text-white text-center" style={{ opacity: 0.92 }}>
            {PRAYER_LABELS[next.key]} • {fmtTimeDate(next.time)}
          </Text>
        </Pressable>
      </View>

      {/* السماء نفسها: الضغط عليها يفتح الطقس */}
      <Pressable style={{ flex: 1 }} onPress={openWeather} accessibilityLabel="فتح الطقس" />

      {/* شارة الطقس: تلميح بصري بأن السماء تفتح الطقس */}
      <Pressable
        onPress={openWeather}
        hitSlop={8}
        accessibilityLabel="فتح الطقس"
        style={{
          position: "absolute",
          bottom: panelH + 10,
          start: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: 18,
          backgroundColor: "rgba(255,255,255,0.2)",
        }}
      >
        <Ionicons name={(wx ? ICON_OF[kindOf(wx.now.code)] : "partly-sunny") as never} size={16} color="#FFFFFF" />
        <Text w="semi" className="text-white text-xs">
          {wx && wxFresh ? `${fmtTemp(wx.now.temp, units)} • ${labelOf(wx.now.code, wx.now.isDay)}` : "الطقس"}
        </Text>
        <Ionicons name="chevron-back" size={14} color="#FFFFFF" style={{ opacity: 0.8 }} />
      </Pressable>

      {/* اللوح السفلي: التاريخ + الصلوات */}
      <View
        onLayout={(e) => setPanelH(e.nativeEvent.layout.height)}
        style={{
          backgroundColor: theme.glass,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingTop: 14,
          paddingHorizontal: 14,
          // مساحة للشريط السفلي العائم
          paddingBottom: 12 + 86 + insets.bottom,
        }}
      >
        <View className="flex-row items-center justify-between px-1 mb-1.5">
          <Pressable hitSlop={10} onPress={() => setIso(addDays(iso, -1))}>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </Pressable>
          <Pressable onPress={() => setIso(todayISO())} className="items-center">
            <Text w="bold" className="text-white">
              {fmtDateFull(iso)}
            </Text>
            {!isToday ? (
              <Text className="text-white text-xs" style={{ opacity: 0.85 }}>
                العودة لليوم
              </Text>
            ) : null}
          </Pressable>
          <Pressable hitSlop={10} onPress={() => setIso(addDays(iso, 1))}>
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {PRAYER_ORDER.map((k) => {
          const isNext = isToday && next.key === k && next.time.getTime() === times[k].getTime();
          const on = prayerNotify[k];
          const fard = k !== "sunrise";
          const prayed = fard && !!doneLog[iso]?.[k as FardKey];
          return (
            <View
              key={k}
              className="flex-row items-center justify-between px-4 rounded-2xl"
              style={{
                height: isNext ? 50 : 44,
                backgroundColor: isNext ? "rgba(255,255,255,0.2)" : "transparent",
                opacity: isNext ? 1 : 0.8,
              }}
            >
              <Text w={isNext ? "bold" : "semi"} className="text-white text-base">
                {PRAYER_LABELS[k]}
              </Text>
              <View className="flex-row items-center gap-3">
                <Text w="bold" className="text-white text-base" style={{ fontVariant: ["tabular-nums"] }}>
                  {fmtTimeDate(times[k])}
                </Text>
                {mosque?.iqama[k] ? (
                  <Text className="text-white text-xs" style={{ opacity: 0.8 }}>
                    إقامة {fmtTimeDate(new Date(times[k].getTime() + (mosque.iqama[k] as number) * 60000))}
                  </Text>
                ) : null}
                {fard ? (
                  <Pressable
                    onPress={() => (prayed ? unmark(iso, k as FardKey) : markDone(iso, k as FardKey))}
                    hitSlop={10}
                    accessibilityLabel="صليت"
                  >
                    <View
                      className="w-6 h-6 rounded-full items-center justify-center"
                      style={{
                        borderWidth: 1.5,
                        borderColor: "#FFFFFF",
                        backgroundColor: prayed ? "#22C55E" : "transparent",
                        opacity: prayed ? 1 : 0.7,
                      }}
                    >
                      {prayed ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}
                    </View>
                  </Pressable>
                ) : (
                  <View style={{ width: 24 }} />
                )}
                <Pressable onPress={() => toggleNotify(k)} hitSlop={10}>
                  <Ionicons
                    name={on ? "notifications" : "notifications-off-outline"}
                    size={20}
                    color="#FFFFFF"
                    style={{ opacity: on ? 1 : 0.55 }}
                  />
                </Pressable>
              </View>
            </View>
          );
        })}

        <Text
          w="semi"
          className="text-white text-xs text-center mt-2"
          style={{ opacity: 0.85 }}
          onPress={() => router.push("/prayer-settings" as never)}
        >
          قارن الأوقات بمسجدك، وعدّل طريقة الحساب من إعدادات الصلاة
        </Text>
      </View>
      <PrayerToolsSheet visible={toolsOpen} onClose={() => setToolsOpen(false)} />
    </View>
  );
}
