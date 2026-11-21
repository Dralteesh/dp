import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Ionicons } from "@expo/vector-icons";
import { Chip } from "@/components/ui/Chip";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import {
  SURAHS,
  audioPath,
  deleteAudio,
  downloadAudio,
  downloadedSurahs,
  loadSurah,
  remoteAudio,
  type Ayah,
} from "@/lib/quran";
import { useSettings } from "@/store/useSettings";

const TRANSLATIONS: Array<[string, string]> = [
  ["none", "بدون"],
  ["en.sahih", "English"],
  ["fr.hamidullah", "Français"],
  ["tr.diyanet", "Türkçe"],
  ["ur.jalandhry", "اردو"],
  ["id.indonesian", "Indonesia"],
];
const NAVY = "#0B4F73";

export default function QuranScreen() {
  const tr = useSettings((s) => s.quranTranslation);
  const update = useSettings((s) => s.update);
  const [open, setOpen] = useState<number | null>(null);
  const [ayahs, setAyahs] = useState<Ayah[] | null>(null);
  const [err, setErr] = useState(false);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState<number | null>(null);

  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  const refreshSaved = useCallback(() => downloadedSurahs().then(setSaved).catch(() => undefined), []);
  useEffect(() => {
    refreshSaved();
  }, [refreshSaved]);

  // فتح سورة: تحميل النص
  useEffect(() => {
    if (open == null) return;
    setAyahs(null);
    setErr(false);
    loadSurah(open, tr).then(setAyahs).catch(() => setErr(true));
  }, [open, tr]);

  // إيقاف الصوت عند الخروج من السورة
  const close = () => {
    player.pause();
    setOpen(null);
    setProgress(null);
  };

  const play = () => {
    if (open == null) return;
    if (status.playing) return player.pause();
    if (status.isLoaded && player.currentTime > 0 && player.currentTime < status.duration) return player.play();
    player.replace({ uri: saved.has(open) ? audioPath(open) : remoteAudio(open) });
    player.play();
  };

  const download = async () => {
    if (open == null) return;
    try {
      setProgress(0);
      await downloadAudio(open, setProgress);
      await refreshSaved();
    } catch {
      Alert.alert("تعذّر التنزيل", "تحقق من الإنترنت وجرّب مجددًا.");
    } finally {
      setProgress(null);
    }
  };

  const remove = async () => {
    if (open == null) return;
    await deleteAudio(open);
    await refreshSaved();
  };

  if (open == null) {
    return (
      <Screen title="القرآن الكريم" back scroll={false}>
        <View className="flex-row flex-wrap gap-2 mb-2">
          {TRANSLATIONS.map(([k, label]) => (
            <Chip key={k} label={label} color={NAVY} selected={tr === k} onPress={() => update({ quranTranslation: k })} />
          ))}
        </View>
        <FlatList
          data={SURAHS}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => setOpen(index + 1)}
              className="flex-row items-center justify-between py-3.5 px-2"
              style={{ borderBottomWidth: 1, borderBottomColor: "#DBE7EF" }}
            >
              <Text w="semi">
                {index + 1}. {item}
              </Text>
              {saved.has(index + 1) ? <Ionicons name="checkmark-circle" size={18} color="#16A34A" /> : null}
            </Pressable>
          )}
        />
      </Screen>
    );
  }

  const isSaved = saved.has(open);
  return (
    <Screen title={`سورة ${SURAHS[open - 1]}`} back scroll={false}>
      <View className="flex-row items-center gap-3 mb-2">
        <Pressable onPress={close} hitSlop={10}>
          <Ionicons name="list" size={24} color={NAVY} />
        </Pressable>
        <Pressable onPress={play} className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: NAVY }}>
          <Ionicons name={status.playing ? "pause" : "play"} size={22} color="#FFFFFF" />
        </Pressable>
        <View className="flex-1">
          {progress != null ? (
            <Text className="text-xs text-muted">جارٍ التنزيل {Math.round(progress * 100)}%</Text>
          ) : (
            <Text className="text-xs text-muted">{isSaved ? "الصوت محفوظ على الجهاز" : "الصوت يُبثّ من الإنترنت"}</Text>
          )}
        </View>
        {progress != null ? (
          <ActivityIndicator />
        ) : isSaved ? (
          <Pressable onPress={remove} hitSlop={10}>
            <Ionicons name="trash-outline" size={22} color="#DC2626" />
          </Pressable>
        ) : (
          <Pressable onPress={download} hitSlop={10}>
            <Ionicons name="download-outline" size={24} color={NAVY} />
          </Pressable>
        )}
      </View>
      {err ? (
        <Text className="text-center text-muted mt-6">تحتاج إنترنت لفتح هذه السورة أول مرة.</Text>
      ) : !ayahs ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={ayahs}
          keyExtractor={(a) => String(a.n)}
          renderItem={({ item }) => (
            <View className="py-3" style={{ borderBottomWidth: 1, borderBottomColor: "#DBE7EF" }}>
              <Text style={{ fontSize: 24, lineHeight: 46, color: NAVY }}>
                {item.ar} ﴿{item.n}﴾
              </Text>
              {item.tr ? (
                <Text className="text-sm text-muted mt-1" style={{ writingDirection: tr === "ur.jalandhry" ? "rtl" : "ltr", textAlign: tr === "ur.jalandhry" ? "right" : "left" }}>
                  {item.tr}
                </Text>
              ) : null}
            </View>
          )}
        />
      )}
    </Screen>
  );
}
