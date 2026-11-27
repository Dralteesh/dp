import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { EditMoneySheet, type MoneyTarget } from "@/components/clinic/EditMoneySheet";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { fmtDateShort } from "@/lib/dates";
import { fmtMoney } from "@/lib/format";
import { useClinic } from "@/store/useClinic";
import { useSettings } from "@/store/useSettings";

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

/** بحث شامل بشريط واحد: مرضى، دفعات، خطط علاج، مواعيد، وجلسات/ذمم */
export default function SearchScreen() {
  const router = useRouter();
  const currency = useSettings((s) => s.currency);
  const patients = useClinic((s) => s.patients);
  const payments = useClinic((s) => s.payments);
  const plans = useClinic((s) => s.plans);
  const appointments = useClinic((s) => s.appointments);
  const sessions = useClinic((s) => s.sessions);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<MoneyTarget>(null);
  const byId = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);
  const nameOf = (id: string) => byId.get(id)?.name ?? "مريض";

  const res = useMemo(() => {
    const t = norm(q.trim());
    if (t.length < 2) return null;
    const has = (...v: (string | number | undefined)[]) => v.some((x) => x !== undefined && norm(String(x)).includes(t));
    return {
      patients: patients.filter((p) => has(p.name, p.phone)).slice(0, 8),
      plans: plans.filter((p) => has(p.title, nameOf(p.patientId), ...p.items.map((i) => i.procedure))).slice(0, 8),
      payments: payments.filter((p) => has(p.note, nameOf(p.patientId), p.date, Math.abs(p.amount))).slice(0, 10),
      sessions: sessions.filter((s) => has(s.procedure, s.notes, nameOf(s.patientId), s.date, s.cost)).slice(0, 10),
      appointments: appointments.filter((a) => has(a.procedure, nameOf(a.patientId), a.date, a.notes)).slice(0, 8),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, patients, plans, payments, sessions, appointments]);

  const total = res ? res.patients.length + res.plans.length + res.payments.length + res.sessions.length + res.appointments.length : 0;

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View className="mb-3">
      <Text w="bold" className="mb-1.5">{title}</Text>
      {children}
    </View>
  );
  const Row = ({ title, sub, right, onPress, color }: { title: string; sub?: string; right?: string; onPress: () => void; color?: string }) => (
    <Pressable onPress={onPress} className="flex-row items-center justify-between bg-surface border border-line rounded-2xl px-4 py-3 mb-1.5">
      <View className="flex-1 pe-2">
        <Text w="semi" numberOfLines={1}>{title}</Text>
        {sub ? <Text className="text-xs text-muted" numberOfLines={1}>{sub}</Text> : null}
      </View>
      {right ? <Text w="bold" style={{ color: color ?? "#0F172A" }}>{right}</Text> : null}
      <Ionicons name="chevron-back" size={16} color="#94A3B8" style={{ marginStart: 8 }} />
    </Pressable>
  );

  return (
    <Screen title="بحث شامل" subtitle="مرضى • دفعات • خطط • مواعيد" back>
      <Field label="ابحث" value={q} onChangeText={setQ} placeholder="اسم مريض، رقم، مبلغ، إجراء، تاريخ 2026-11..." autoFocus />
      {!res ? (
        <EmptyState icon="search-outline" title="اكتب حرفين على الأقل" hint="يبحث في المرضى والدفعات والخطط والمواعيد والجلسات معًا" />
      ) : total === 0 ? (
        <EmptyState icon="file-tray-outline" title="لا نتائج" hint="جرّب كلمة أقصر أو الاسم فقط" />
      ) : (
        <>
          {res.patients.length ? (
            <Section title="مرضى">
              {res.patients.map((p) => (
                <Row key={p.id} title={p.name} sub={p.phone} onPress={() => router.push({ pathname: "/clinic/patient/[id]", params: { id: p.id } } as never)} />
              ))}
            </Section>
          ) : null}
          {res.plans.length ? (
            <Section title="خطط علاج">
              {res.plans.map((p) => (
                <Row key={p.id} title={`${nameOf(p.patientId)} — ${p.title}`} sub={p.items.map((i) => i.procedure).join("، ")} onPress={() => router.push({ pathname: "/clinic/plan", params: { patientId: p.patientId } } as never)} />
              ))}
            </Section>
          ) : null}
          {res.payments.length ? (
            <Section title="دفعات">
              {res.payments.map((p) => (
                <Row
                  key={p.id}
                  title={nameOf(p.patientId)}
                  sub={`${fmtDateShort(p.date)}${p.note ? ` • ${p.note}` : ""}`}
                  right={`${p.amount < 0 ? "−" : "+"}${fmtMoney(Math.abs(p.amount), currency)}`}
                  color={p.amount < 0 ? "#DC2626" : "#16A34A"}
                  onPress={() => setEdit({ kind: "payment", id: p.id })}
                />
              ))}
            </Section>
          ) : null}
          {res.sessions.length ? (
            <Section title="جلسات وذمم">
              {res.sessions.map((s) => (
                <Row key={s.id} title={`${nameOf(s.patientId)} — ${s.procedure}`} sub={fmtDateShort(s.date)} right={fmtMoney(s.cost, currency)} onPress={() => setEdit({ kind: "session", id: s.id })} />
              ))}
            </Section>
          ) : null}
          {res.appointments.length ? (
            <Section title="مواعيد">
              {res.appointments.map((a) => (
                <Row key={a.id} title={`${nameOf(a.patientId)} — ${a.procedure}`} sub={`${fmtDateShort(a.date)} • ${a.startTime}`} onPress={() => router.push({ pathname: "/clinic/appointment-form", params: { id: a.id } } as never)} />
              ))}
            </Section>
          ) : null}
        </>
      )}
      <EditMoneySheet target={edit} onClose={() => setEdit(null)} />
    </Screen>
  );
}
