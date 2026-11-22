import { useMemo } from "react";
import { Alert, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { MoonBlobs } from "@/components/sleep/MoonBlobs";
import { Text } from "@/components/ui/Text";
import { useNow } from "@/hooks/useNow";
import { fmtTime, pad } from "@/lib/dates";
import { nextAlarmFire } from "@/lib/alarm";
import { useAlarms } from "@/store/useAlarms";
import { useSleep } from "@/store/useSleep";

const NAVY = "#0F1B3D";
const STARS = Array.from({ length: 26 }, (_, i) => ({
  x: (i * 37 + 11) % 100,
  y: (i * 53 + 7) % 70,
  s: 1 + (i % 3),
  o: 0.35 + ((i * 17) % 50) / 100,
}));

/** شاشة التعقب الليلية: قمر متحرك، الوقت، موعد المنبّه، وزر إيقاف التعقب */
export default function SleepTrackScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const now = useNow(1000);
  const session = useSleep((s) => s.session);
  const startSession = useSleep((s) => s.startSession);
  const stopSession = useSleep((s) => s.stopSession);
  const cancelSession = useSleep((s) => s.cancelSession);
  const alarms = useAlarms((s) => s.alarms);

  const nextWake = useMemo(() => nextAlarmFire(alarms, new Date()), [alarms]);
  const alarmLabel = nextWake ? `${pad(nextWake.at.getHours())}:${pad(nextWake.at.getMinutes())}` : undefined;

  const elapsedMin = session ? Math.max(0, Math.floor((now.getTime() - session.start) / 60000)) : 0;

  const stop = () => {
    const log = stopSession();
    if (!log) {
      Alert.alert("جلسة قصيرة", "أقل من 20 دقيقة، لم تُسجَّل كنوم.");
      router.back();
      return;
    }
    router.replace("/sleep-report");
  };

  return (
    <View style={{ flex: 1, backgroundColor: NAVY, paddingTop: insets.top }}>
      {/* النجوم */}
      {STARS.map((st, i) => (
        <View key={i} pointerEvents="none" style={{ position: "absolute", left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s, borderRadius: st.s, backgroundColor: "#fff", opacity: st.o }} />
      ))}

      <Pressable onPress={() => router.back()} hitSlop={12} style={{ position: "absolute", top: insets.top + 12, start: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", zIndex: 5 }} accessibilityLabel="رجوع">
        <Ionicons name="chevron-forward" size={22} color="#fff" />
      </Pressable>

      <View style={{ alignItems: "center", marginTop: 36 }}>
        <Text w="bold" style={{ color: "#fff", fontSize: 44, fontVariant: ["tabular-nums"] }}>
          {fmtTime(`${pad(now.getHours())}:${pad(now.getMinutes())}`)}
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
          {alarmLabel ? `المنبّه ${fmtTime(alarmLabel)}` : "لا منبّه مفعّل"}
        </Text>
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <MoonBlobs />
        {session ? (
          <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 8 }}>
            مضى {Math.floor(elapsedMin / 60)} س {elapsedMin % 60} د
          </Text>
        ) : (
          <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 8, textAlign: "center", paddingHorizontal: 32 }}>
            ضع الهاتف قرب سريرك، واضغط ابدأ. عند الاستيقاظ اضغط إيقاف ليُحسب نومك.
          </Text>
        )}
      </View>

      {/* الأسفل */}
      <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 18, paddingBottom: insets.bottom + 18, alignItems: "center", gap: 10 }}>
        <Pressable
          onPress={session ? stop : () => startSession(alarmLabel)}
          accessibilityLabel={session ? "إيقاف التعقب" : "بدء التعقب"}
          style={{ paddingVertical: 8, paddingHorizontal: 40 }}
        >
          <Text w="bold" style={{ fontSize: 22, color: NAVY, textAlign: "center" }}>
            {session ? "إيقاف التعقب" : "ابدأ التعقب"}
          </Text>
        </Pressable>
        {session ? (
          <Pressable onPress={() => Alert.alert("إلغاء الجلسة", "لن تُسجَّل هذه الجلسة.", [{ text: "رجوع", style: "cancel" }, { text: "إلغاء الجلسة", style: "destructive", onPress: () => { cancelSession(); router.back(); } }])}>
            <Text className="text-xs" style={{ color: "#64748B" }}>
              إلغاء دون حفظ
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
