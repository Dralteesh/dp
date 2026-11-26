import { useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PCard } from "@/components/planner/kit";
import { Text } from "@/components/ui/Text";
import { PL } from "@/design/planner";
import { toISO } from "@/lib/dates";
import { whatsappLink } from "@/lib/phone";
import { PART_LABEL, waitersForDay, type WaitCandidate } from "@/lib/waitlist";
import { useClinic } from "@/store/useClinic";
import { useExtras } from "@/store/useExtras";

/**
 * شريط قائمة الانتظار في منظم العيادة: «N مرضى ينتظرون موعدًا اليوم».
 * من يريد هذا اليوم يظهر أولًا، ثم باقي المنتظرين. الضغط يفتح القائمة، و«احجز» يفتح نموذج الموعد معبّأً.
 */
export function WaitlistBanner({ day }: { day: string }) {
  const router = useRouter();
  const waitlist = useExtras((s) => s.waitlist);
  const patients = useClinic((s) => s.patients);
  const [open, setOpen] = useState(false);
  const today = toISO(new Date());

  const { forDay, others } = useMemo(() => waitersForDay(waitlist, patients, day), [waitlist, patients, day]);
  if (day < today) return null;
  const total = forDay.length + others.length;
  if (total === 0) return null;

  const isToday = day === today;
  const dayWord = isToday ? "اليوم" : "في هذا اليوم";
  const title =
    forDay.length > 0
      ? `${forDay.length === 1 ? "مريض واحد ينتظر" : forDay.length === 2 ? "مريضان ينتظران" : `${forDay.length} مرضى ينتظرون`} موعدًا ${dayWord}`
      : `${total === 1 ? "مريض واحد" : total === 2 ? "مريضان" : `${total} مرضى`} في قائمة الانتظار`;
  const sub = forDay.length > 0 && others.length > 0 ? `و${others.length} آخرون في القائمة` : forDay.length > 0 ? undefined : "بلا يوم محدد";

  const book = (c: WaitCandidate) => {
    const params: Record<string, string> = { patientId: c.entry.patientId, procedure: c.entry.procedure, waitId: c.entry.id, date: day };
    if (c.entry.time) params.startTime = c.entry.time;
    router.push({ pathname: "/clinic/appointment-form", params } as never);
  };

  const Row = ({ c, strong }: { c: WaitCandidate; strong: boolean }) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: PL.border }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: strong ? PL.warn : PL.blueSoft }} />
      <View style={{ flex: 1 }}>
        <Text w="semi" numberOfLines={1} style={{ color: PL.navy }}>
          {c.patient.name}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 11.5, color: PL.muted }}>
          {c.entry.procedure} • {c.entry.time ? c.entry.time : PART_LABEL[c.entry.part]}
        </Text>
      </View>
      {c.patient.phone ? (
        <Pressable
          hitSlop={8}
          accessibilityLabel="واتساب"
          onPress={() => Linking.openURL(whatsappLink(c.patient.phone!, `السلام عليكم ${c.patient.name}، هل ما زلت ترغب بموعد؟`))}
        >
          <Ionicons name="logo-whatsapp" size={22} color={PL.good} />
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => book(c)}
        hitSlop={6}
        style={{ backgroundColor: PL.navy, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}
      >
        <Text w="semi" style={{ color: "#fff", fontSize: 12 }}>
          احجز
        </Text>
      </Pressable>
    </View>
  );

  return (
    <PCard style={{ backgroundColor: PL.warnSoft, borderColor: PL.warn, marginBottom: 10, paddingVertical: 10 }}>
      <Pressable onPress={() => setOpen((v) => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: PL.white, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="hourglass" size={19} color={PL.warn} />
        </View>
        <View style={{ flex: 1 }}>
          <Text w="bold" style={{ color: PL.navy, fontSize: 13.5 }}>
            {title}
          </Text>
          {sub ? <Text style={{ fontSize: 11.5, color: PL.navySoft }}>{sub}</Text> : null}
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={PL.navySoft} />
      </Pressable>
      {open ? (
        <View style={{ marginTop: 8 }}>
          <ScrollView style={{ maxHeight: 230 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {forDay.map((c) => (
              <Row key={c.entry.id} c={c} strong />
            ))}
            {others.map((c) => (
              <Row key={c.entry.id} c={c} strong={false} />
            ))}
          </ScrollView>
          <Pressable onPress={() => router.push("/clinic/waitlist" as never)} style={{ alignSelf: "center", marginTop: 8 }}>
            <Text w="semi" style={{ color: PL.blue, fontSize: 12.5 }}>
              فتح قائمة الانتظار كاملة
            </Text>
          </Pressable>
        </View>
      ) : null}
    </PCard>
  );
}
