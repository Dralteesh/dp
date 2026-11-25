import { memo, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text as RNText, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { SURAHS, loadPage, type MushafPage, type PageAyah } from "@/lib/quran";

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
export const arNum = (n: number) => String(n).replace(/\d/g, (d) => AR_DIGITS[Number(d)]);
const BASMALA = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

const TJ: Record<string, string> = {
  h: "#9CA3AF", s: "#9CA3AF", l: "#9CA3AF", n: "#F59E0B", p: "#F97316", m: "#EF4444", o: "#DC2626",
  q: "#3B82F6", c: "#16A34A", f: "#16A34A", w: "#14B8A6", i: "#8B5CF6", a: "#8B5CF6", u: "#16A34A", d: "#16A34A", b: "#16A34A", g: "#8B5CF6",
};

/** يحوّل نص التجويد ([h[ٱ] ...) إلى قطع ملوّنة */
function parseTajweed(src: string): Array<{ t: string; c?: string }> {
  const out: Array<{ t: string; c?: string }> = [];
  const re = /\[([a-z]+)(?::\d+)?\[([^\]]*)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ t: src.slice(last, m.index) });
    out.push({ t: m[2], c: TJ[m[1][0]] });
    last = re.lastIndex;
  }
  if (last < src.length) out.push({ t: src.slice(last) });
  return out;
}

export type PageTheme = { text: string; marker: string; select: string; frame: string; soft: string };
export const PAPER: PageTheme = { text: "#2B1D0E", marker: "#B8860B", select: "rgba(184,134,11,0.28)", frame: "#C9A961", soft: "#7A6A4F" };
export const NIGHT: PageTheme = { text: "#F3E9D2", marker: "#E0B552", select: "rgba(255,255,255,0.16)", frame: "rgba(224,181,82,0.5)", soft: "rgba(243,233,210,0.6)" };

type Props = {
  page: number;
  width: number;
  fontSize: number;
  theme: PageTheme;
  tajweed: boolean;
  selected: string | null;
  marked: string[];
  onLoaded: (p: MushafPage) => void;
  onAyah: (a: PageAyah) => void;
};

function PageViewBase({ page, width, fontSize, theme, tajweed, selected, marked, onLoaded, onAyah }: Props) {
  const [data, setData] = useState<MushafPage | null>(null);
  const [err, setErr] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setErr(false);
    loadPage(page)
      .then((p) => {
        if (!alive) return;
        setData(p);
        onLoaded(p);
      })
      .catch(() => alive && setErr(true));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, tick]);

  const groups = useMemo(() => {
    if (!data) return [];
    const g: Array<{ banner?: number; ayahs: PageAyah[] }> = [];
    let cur: PageAyah[] = [];
    for (const a of data.ayahs) {
      if (a.n === 1) {
        if (cur.length) g.push({ ayahs: cur });
        cur = [];
        g.push({ banner: a.s, ayahs: [] });
      }
      cur.push(a);
    }
    if (cur.length) g.push({ ayahs: cur });
    return g;
  }, [data]);

  return (
    <View style={{ width, paddingHorizontal: 12 }}>
      {!data && !err ? <ActivityIndicator style={{ marginTop: 80 }} color={theme.marker} /> : null}
      {err ? (
        <View style={{ alignItems: "center", marginTop: 80, gap: 12 }}>
          <Text style={{ color: theme.soft, textAlign: "center" }}>تعذّر فتح هذه الصفحة.</Text>
          <Text w="bold" onPress={() => setTick((t) => t + 1)} style={{ color: theme.marker }}>إعادة المحاولة</Text>
        </View>
      ) : null}
      {data ? (
        <ScrollView contentContainerStyle={{ paddingVertical: 14, paddingHorizontal: 6, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          <View style={{ borderWidth: 1.5, borderColor: theme.frame, borderRadius: 14, padding: 10 }}>
            {groups.map((g, gi) =>
              g.banner ? (
                <View key={gi} style={{ marginVertical: 10, borderWidth: 1.5, borderColor: theme.frame, borderRadius: 10, paddingVertical: 6, alignItems: "center" }}>
                  <RNText style={{ fontFamily: "AmiriQuran_400Regular", fontSize: fontSize * 0.9, color: theme.marker }}>سورة {SURAHS[g.banner - 1]}</RNText>
                  {g.banner !== 1 && g.banner !== 9 ? (
                    <RNText style={{ fontFamily: "AmiriQuran_400Regular", fontSize: fontSize * 0.8, color: theme.text, marginTop: 2 }}>{BASMALA}</RNText>
                  ) : null}
                </View>
              ) : (
                <RNText key={gi} style={{ fontFamily: "AmiriQuran_400Regular", fontSize, lineHeight: fontSize * 2, color: theme.text, textAlign: "justify", writingDirection: "rtl" }}>
                  {g.ayahs.map((a) => {
                    const key = `${a.s}:${a.n}`;
                    const sel = selected === key;
                    return (
                      <RNText key={key} onPress={() => onAyah(a)} style={{ backgroundColor: sel ? theme.select : undefined }}>
                        {tajweed && a.tj
                          ? parseTajweed(a.tj).map((c, i) => (
                              <RNText key={i} style={c.c ? { color: c.c } : undefined}>{c.t}</RNText>
                            ))
                          : a.ar}
                        <RNText style={{ color: theme.marker, fontSize: fontSize * 0.8 }}>{` ﴿${arNum(a.n)}﴾${marked.includes(key) ? "🔖" : ""} `}</RNText>
                      </RNText>
                    );
                  })}
                </RNText>
              ),
            )}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

export const PageView = memo(PageViewBase);
