import { useRef, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import { Text } from "@/components/ui/Text";
import { CountdownFace } from "@/components/countdown/CountdownFace";
import { GlassCard, NightShell, PillButton, RoundButton } from "@/design/kit";
import { DS, surface } from "@/design/tokens";
import { useCdMode } from "@/hooks/useCdMode";
import { useTicker } from "@/hooks/useTicker";
import { statusOf, tickResolution } from "@/lib/countdown/engine";
import { reminderLabel, repeatLabel, viewOf, whenLabel } from "@/lib/countdown/format";
import { deleteMedia } from "@/lib/countdown/media";
import { useCountdowns } from "@/store/useCountdowns";

export default function CountdownDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const mode = useCdMode();
  const s = surface(mode);
  const cd = useCountdowns((x) => x.items.find((i) => i.id === id));
  const toggleFav = useCountdowns((x) => x.toggleFavorite);
  const togglePin = useCountdowns((x) => x.togglePin);
  const duplicate = useCountdowns((x) => x.duplicate);
  const remove = useCountdowns((x) => x.remove);
  const now = useTicker(cd ? tickResolution(cd, Date.now()) : 60_000);
  const shot = useRef<View>(null);
  const [full, setFull] = useState(false);
  const [sharing, setSharing] = useState(false);

  if (!cd) {
    return (
      <NightShell title="لحظة" mode={mode}>
        <View style={{ padding: 24, alignItems: "center" }}>
          <Text style={{ color: s.soft }}>هذه اللحظة غير موجودة (ربما حُذفت).</Text>
        </View>
      </NightShell>
    );
  }

  const v = viewOf(cd, now);
  const st = statusOf(cd, now);

  const share = async () => {
    setSharing(true);
    // ننتظر إعادة الرسم (الفيديو → تدرّج) ثم نلتقط الصورة
    await new Promise((r) => setTimeout(r, 200));
    try {
      const uri = await captureRef(shot, { format: "png", quality: 1, result: "tmpfile" });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "مشاركة العدّاد" });
      else Alert.alert("المشاركة غير متاحة على هذا الجهاز");
    } catch {
      Alert.alert("تعذّرت المشاركة", "حاول مرة أخرى.");
    } finally {
      setSharing(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert("حذف اللحظة", `سيُحذف «${cd.title}» نهائيًا.`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: () => {
          void deleteMedia(cd.bg.uri);
          remove(cd.id);
          router.back();
        },
      },
    ]);

  const row = (icon: React.ComponentProps<typeof Ionicons>["name"], text: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 }}>
      <Ionicons name={icon} size={18} color={s.soft} />
      <Text style={{ color: s.text, flex: 1, fontSize: 14 }}>{text}</Text>
    </View>
  );

  const rem = cd.direction === "down" ? [...(cd.notifyAtEvent ? [0] : []), ...cd.reminders.map((r) => r.minutes).sort((a, b) => b - a)] : [];

  return (
    <NightShell
      title={cd.title || "لحظة"}
      mode={mode}
      right={
        <View style={{ flexDirection: "row", gap: 8 }}>
          <RoundButton icon="expand-outline" label="ملء الشاشة" mode={mode} onPress={() => setFull(true)} />
          <RoundButton icon="share-social-outline" label="مشاركة كصورة" mode={mode} onPress={share} />
          <RoundButton icon="create-outline" label="تعديل" mode={mode} onPress={() => router.push({ pathname: "/countdowns/edit", params: { id: cd.id } })} />
        </View>
      }
    >
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View ref={shot} collapsable={false}>
          <CountdownFace cd={cd} v={v} forShare={sharing} />
        </View>

        <GlassCard mode={mode} style={{ gap: 2 }}>
          {row("calendar-outline", whenLabel(cd))}
          {cd.repeat.type !== "none" && cd.direction === "down" ? row("repeat", `${repeatLabel(cd.repeat)} • الموعد القادم: ${whenLabelAt(st.target)}`) : null}
          {cd.instantMs != null ? row("globe-outline", "لحظة مطلقة: لا تتغير مع المنطقة الزمنية") : row("time-outline", "تتبع ساعة جهازك (تتكيّف مع المنطقة والتوقيت الصيفي)")}
          {rem.length > 0 ? row("notifications-outline", rem.map(reminderLabel).join(" • ")) : null}
          {v.progress != null && v.state === "upcoming" ? row("hourglass-outline", `انقضى ${Math.floor(v.progress * 100)}% من الفترة`) : null}
        </GlassCard>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <PillButton label={cd.favorite ? "في المفضلة" : "مفضّلة"} icon={cd.favorite ? "star" : "star-outline"} color={cd.favorite ? "#D97706" : DS.accent} onPress={() => toggleFav(cd.id)} />
          </View>
          <View style={{ flex: 1 }}>
            <PillButton label={cd.pinned ? "مثبّتة" : "تثبيت"} icon={cd.pinned ? "pin" : "pin-outline"} color={cd.pinned ? "#D97706" : DS.accent} onPress={() => togglePin(cd.id)} />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <PillButton
              label="نسخ"
              icon="copy-outline"
              color="#475569"
              onPress={() => {
                const nid = duplicate(cd.id);
                if (nid) router.replace({ pathname: "/countdowns/[id]", params: { id: nid } });
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <PillButton label="حذف" icon="trash-outline" color="#DC2626" onPress={confirmDelete} />
          </View>
        </View>
      </ScrollView>

      <Modal visible={full} animationType="fade" statusBarTranslucent onRequestClose={() => setFull(false)}>
        <StatusBar hidden />
        <Pressable style={{ flex: 1 }} onPress={() => setFull(false)}>
          <CountdownFace cd={cd} v={v} full radius={0} />
          <View style={{ position: "absolute", top: 40, end: 16 }}>
            <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.8)" />
          </View>
        </Pressable>
      </Modal>
    </NightShell>
  );
}

/** تاريخ لحظة معيّنة بصيغة مختصرة للعرض */
function whenLabelAt(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
