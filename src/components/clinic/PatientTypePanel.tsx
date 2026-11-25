import { useMemo, useState, type ReactNode } from "react";
import { Alert, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { useSmartPatient } from "@/hooks/useSmartPatient";
import { fmtDateShort, toISO } from "@/lib/dates";
import {
  ALL_TYPE_KEYS,
  PATIENT_TYPES,
  endoProgress,
  lastOrthoVisit,
  needsFittingBooking,
  orthoNextVisit,
  overdueLabOrders,
  toggleTypePatch,
  type PatientTypeKey,
} from "@/lib/patientType";
import { useClinic } from "@/store/useClinic";
import { useExtras } from "@/store/useExtras";
import type { LabStatus } from "@/types/extras";

const LAB_STEPS: { key: LabStatus; label: string }[] = [
  { key: "sent", label: "أُرسل" },
  { key: "received", label: "وصل" },
  { key: "fitted", label: "رُكّب" },
];

function Pill({ label, hex, on, onPress }: { label: string; hex: string; on: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-full px-3 py-1 border"
      style={{ backgroundColor: on ? hex + "22" : "#FFFFFF", borderColor: on ? hex : "#E3E6EB" }}
    >
      <Text w="semi" className="text-xs" style={{ color: on ? hex : "#64748B" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Section({ type, children }: { type: PatientTypeKey; children: ReactNode }) {
  const m = PATIENT_TYPES[type];
  return (
    <Card className="mt-3">
      <View className="flex-row items-center gap-2 mb-2">
        <Ionicons name={m.icon as never} size={18} color={m.hex} />
        <Text w="bold" style={{ color: m.hex }}>
          {m.label}
        </Text>
      </View>
      {children}
    </Card>
  );
}

function Line({ children }: { children: ReactNode }) {
  return <Text className="text-sm text-muted mb-1">{children}</Text>;
}

function Action({ label, icon, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-1.5 self-start rounded-full px-3 py-1.5 mt-1 bg-slate-100">
      <Ionicons name={icon} size={15} color="#334155" />
      <Text w="semi" className="text-xs">
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * أنواع المريض (تُكتشف تلقائيًا ويمكن تعديلها يدويًا) + الأقسام الخاصة بكل نوع.
 * الأقسام غير المنطبقة تبقى تحت «المزيد» ولا تُحذف.
 */
export function PatientTypePanel({ patientId }: { patientId: string }) {
  const router = useRouter();
  const patient = useClinic((s) => s.patients.find((p) => p.id === patientId));
  const sessions = useClinic((s) => s.sessions);
  const appointments = useClinic((s) => s.appointments);
  const updatePatient = useClinic((s) => s.updatePatient);
  const addSession = useClinic((s) => s.addSession);
  const labOrders = useExtras((s) => s.labOrders);
  const orthoCases = useExtras((s) => s.orthoCases);
  const updateLab = useExtras((s) => s.updateLab);
  const { detected, types } = useSmartPatient(patientId);
  const [editing, setEditing] = useState(false);
  const [more, setMore] = useState(false);
  const today = toISO(new Date());

  const myLabs = useMemo(() => labOrders.filter((l) => l.patientId === patientId), [labOrders, patientId]);
  const orthoCase = orthoCases.find((o) => o.patientId === patientId);
  const upcoming = useMemo(
    () =>
      appointments
        .filter((a) => a.patientId === patientId && a.status === "scheduled" && a.date >= today)
        .sort((a, b) => (a.date + a.startTime < b.date + b.startTime ? -1 : 1)),
    [appointments, patientId, today],
  );

  if (!patient) return null;

  const book = (procedure: string, date?: string) =>
    router.push({ pathname: "/clinic/appointment-form", params: { patientId, procedure, ...(date ? { date } : {}) } } as never);

  const body = (t: PatientTypeKey): ReactNode => {
    if (t === "ortho") {
      const last = lastOrthoVisit(orthoCase, sessions, patientId);
      const next = last ? orthoNextVisit(last) : undefined;
      return (
        <>
          <Line>التصنيف: {orthoCase?.angleClass ?? "—"} • الجهاز: {orthoCase?.appliance || "—"}</Line>
          <Line>
            خطة الزيارات: {orthoCase?.plan || "زيارة كل 4–6 أسابيع"}
          </Line>
          {last && next ? (
            <Line>
              آخر زيارة {fmtDateShort(last)} • الزيارة القادمة المقترحة {fmtDateShort(next.date)} (بين {fmtDateShort(next.from)} و{fmtDateShort(next.to)})
            </Line>
          ) : (
            <Line>تُقترح الزيارة القادمة تلقائيًا بعد تسجيل أول زيارة تقويم.</Line>
          )}
          <View className="flex-row flex-wrap gap-2">
            <Action label="إعدادات التقويم" icon="settings-outline" onPress={() => router.push({ pathname: "/clinic/ortho", params: { patientId } } as never)} />
            {next ? <Action label="حجز الزيارة" icon="calendar-outline" onPress={() => book("تقويم - مراجعة", next.date < today ? undefined : next.date)} /> : null}
          </View>
        </>
      );
    }
    if (t === "crowns") {
      const late = overdueLabOrders(myLabs, patientId, today);
      return (
        <>
          {late.map((l) => (
            <View key={l.order.id} className="rounded-xl p-2 mb-2" style={{ backgroundColor: "#FEE2E2" }}>
              <Text w="semi" className="text-xs" style={{ color: "#DC2626" }}>
                ⚠ تأخر «{l.order.work}» {l.daysLate} يوم عن موعده{l.order.labName ? ` (${l.order.labName})` : ""}
              </Text>
            </View>
          ))}
          {myLabs.length === 0 ? <Line>لا طلبات مخبر بعد.</Line> : null}
          {myLabs.map((o) => (
            <View key={o.id} className="mb-2">
              <Text w="semi" className="text-sm">
                {o.work}
                {o.tooth ? ` • سن ${o.tooth}` : ""}
              </Text>
              <View className="flex-row gap-2 mt-1">
                {LAB_STEPS.map((st, idx) => {
                  const cur = LAB_STEPS.findIndex((x) => x.key === o.status);
                  return <Pill key={st.key} label={st.label} hex="#D97706" on={idx <= cur} onPress={() => updateLab(o.id, { status: st.key })} />;
                })}
              </View>
              {needsFittingBooking(o, appointments, today) ? <Action label="وصل العمل — احجز موعد التركيب" icon="calendar-outline" onPress={() => book("تاج / جسر")} /> : null}
            </View>
          ))}
          <Action label="المخبر والتعويضات" icon="construct-outline" onPress={() => router.push({ pathname: "/clinic/lab", params: { patientId } } as never)} />
        </>
      );
    }
    if (t === "implant") {
      const f = upcoming.filter((a) => /زرع|implant/i.test(a.procedure));
      return (
        <>
          {f.length === 0 ? (
            <Line>تُنشأ مواعيد المتابعة تلقائيًا (أسبوع، أسبوعان، 3 أشهر، 6 أشهر) بعد تسجيل جلسة الزرع.</Line>
          ) : (
            f.map((a) => (
              <Line key={a.id}>
                {fmtDateShort(a.date)} — {a.procedure}
              </Line>
            ))
          )}
          <Text className="text-xs text-muted">المواعيد افتراضية ويمكن تعديلها أو حذفها من قائمة المواعيد.</Text>
        </>
      );
    }
    if (t === "pedo") {
      const f = upcoming.find((a) => /فلورايد|سد|sealant/i.test(a.procedure));
      return (
        <>
          <Line>تذكير بالفلورايد والسدّ الوقائي كل 6 أشهر.</Line>
          <Line>{f ? `الموعد القادم: ${fmtDateShort(f.date)}` : "يُنشأ التذكير تلقائيًا بعد أول جلسة."}</Line>
        </>
      );
    }
    const e = endoProgress(sessions, patientId);
    return (
      <>
        <Line>جلسات العصب المسجّلة: {e.count}</Line>
        <Line>{e.finalDone ? "✓ تم الحشو النهائي" : "قيد المتابعة حتى الحشو النهائي"}</Line>
        {!e.finalDone ? (
          <Action
            label="تسجيل الحشو النهائي"
            icon="checkmark-circle-outline"
            onPress={() =>
              Alert.alert("الحشو النهائي", "تسجيل جلسة «حشو نهائي (عصب)» اليوم؟", [
                { text: "إلغاء", style: "cancel" },
                { text: "تسجيل", onPress: () => addSession({ patientId, date: today, procedure: "حشو نهائي (عصب)", cost: 0 }) },
              ])
            }
          />
        ) : null}
        <Action label="موعد جلسة" icon="calendar-outline" onPress={() => book("معالجة لبية")} />
      </>
    );
  };

  const rest = ALL_TYPE_KEYS.filter((k) => !types.includes(k));

  return (
    <View className="mb-3">
      <View className="flex-row flex-wrap items-center gap-2">
        {types.map((k) => (
          <Pill key={k} label={PATIENT_TYPES[k].label} hex={PATIENT_TYPES[k].hex} on />
        ))}
        <Pressable onPress={() => setEditing((v) => !v)} hitSlop={8} className="flex-row items-center gap-1 px-2 py-1">
          <Ionicons name={editing ? "checkmark" : "pricetag-outline"} size={14} color="#64748B" />
          <Text className="text-xs text-muted">{editing ? "تم" : "تعديل الأنواع"}</Text>
        </Pressable>
      </View>

      {editing ? (
        <Card className="mt-2">
          <Text className="text-xs text-muted mb-2">يُكتشف النوع تلقائيًا من الخطط والجلسات وطلبات المخبر. اضغط للإضافة أو الإزالة يدويًا (لا تُحذف أي بيانات).</Text>
          <View className="flex-row flex-wrap gap-2">
            {ALL_TYPE_KEYS.map((k) => (
              <Pill
                key={k}
                label={PATIENT_TYPES[k].label + (detected.includes(k) ? " • تلقائي" : "")}
                hex={PATIENT_TYPES[k].hex}
                on={types.includes(k)}
                onPress={() => updatePatient(patientId, toggleTypePatch(patient, k, detected.includes(k), !types.includes(k)))}
              />
            ))}
          </View>
        </Card>
      ) : null}

      {types.map((k) => (
        <Section key={k} type={k}>
          {body(k)}
        </Section>
      ))}

      {rest.length ? (
        <>
          <Pressable onPress={() => setMore((v) => !v)} className="flex-row items-center gap-1.5 mt-3 self-start">
            <Ionicons name={more ? "chevron-up" : "chevron-down"} size={16} color="#475569" />
            <Text w="semi" className="text-sm" style={{ color: "#475569" }}>
              المزيد
            </Text>
          </Pressable>
          {more
            ? rest.map((k) => (
                <Section key={k} type={k}>
                  {body(k)}
                </Section>
              ))
            : null}
        </>
      ) : null}
    </View>
  );
}
