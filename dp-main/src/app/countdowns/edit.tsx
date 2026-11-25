import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Switch, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, IconButton } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { SectionHeader } from "@/components/ui/EmptyState";
import { Field, FieldRow } from "@/components/ui/Field";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { DateField, TimeField } from "@/components/pickers";
import { CountdownCard } from "@/components/countdown/CountdownCard";
import { normalizeHex } from "@/lib/color";
import { BILLING_ENABLED, FREE_LIMITS, usePro } from "@/lib/countdown/entitlements";
import { deleteMedia, pickBackgroundImage, pickBackgroundVideo } from "@/lib/countdown/media";
import { reminderLabel } from "@/lib/countdown/format";
import {
  CD_COLORS, CD_EMOJIS, CD_GRADIENTS, FONT_OPTIONS, REMINDER_PRESETS, REPEAT_OPTIONS, TEXT_POS_OPTIONS, UNIT_OPTIONS,
  blankCountdown, normalizeCountdown,
} from "@/lib/countdown/presets";
import { combine } from "@/lib/dates";
import { uid } from "@/lib/id";
import { useCountdowns } from "@/store/useCountdowns";
import type { CdBgKind, Countdown } from "@/types/countdown";

type Draft = Omit<Countdown, "id" | "createdAt" | "updatedAt">;
const round2 = (n: number) => Math.round(n * 100) / 100;
const BG_KINDS: { v: CdBgKind; l: string }[] = [
  { v: "color", l: "لون" },
  { v: "gradient", l: "تدرّج" },
  { v: "image", l: "صورة" },
  { v: "video", l: "فيديو" },
];
const REM_UNITS = [
  { v: 1, l: "دقائق" },
  { v: 60, l: "ساعات" },
  { v: 1440, l: "أيام" },
];

function Stepper({ label, value, min, max, step, fmt, onChange }: { label: string; value: number; min: number; max: number; step: number; fmt: (n: number) => string; onChange: (n: number) => void }) {
  const clamp = (n: number) => Math.min(max, Math.max(min, round2(n)));
  return (
    <FieldRow label={label}>
      <View className="flex-row items-center gap-3">
        <IconButton icon="remove" onPress={() => onChange(clamp(value - step))} />
        <Text w="bold" className="text-lg w-16 text-center">
          {fmt(value)}
        </Text>
        <IconButton icon="add" onPress={() => onChange(clamp(value + step))} />
      </View>
    </FieldRow>
  );
}

export default function EditCountdown() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const pro = usePro();
  const existing = useCountdowns((s) => (id ? s.items.find((i) => i.id === id) : undefined));
  const count = useCountdowns((s) => s.items.length);
  const add = useCountdowns((s) => s.add);
  const update = useCountdowns((s) => s.update);

  const [draft, setDraft] = useState<Draft>(() => {
    if (existing) {
      const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = existing;
      return rest;
    }
    return blankCountdown();
  });
  const [absolute, setAbsolute] = useState(existing?.instantMs != null);
  const [media, setMedia] = useState<{ image?: string; video?: string }>({
    image: existing?.bg.kind === "image" ? existing.bg.uri : undefined,
    video: existing?.bg.kind === "video" ? existing.bg.uri : undefined,
  });
  const [hex, setHex] = useState(draft.color);
  const [remVal, setRemVal] = useState("");
  const [remUnit, setRemUnit] = useState(60);
  const [busy, setBusy] = useState(false);

  const set = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const down = draft.direction === "down";

  const bgUri = draft.bg.kind === "image" ? media.image : draft.bg.kind === "video" ? media.video : undefined;
  const preview: Countdown = useMemo(
    () =>
      normalizeCountdown({
        ...draft,
        id: "preview",
        instantMs: absolute ? combine(draft.date, draft.time).getTime() : undefined,
        bg: { ...draft.bg, uri: bgUri },
        createdAt: existing?.createdAt ?? Date.now(),
      }),
    [draft, absolute, bgUri, existing?.createdAt],
  );

  const limitReminders = BILLING_ENABLED && !pro;
  const addReminder = (minutes: number) => {
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    if (draft.reminders.some((r) => r.minutes === minutes)) return;
    if (limitReminders && draft.reminders.length >= FREE_LIMITS.reminders) {
      Alert.alert("ميزة مدفوعة", "التذكيرات المتعددة متاحة للمشتركين.");
      return;
    }
    set({ reminders: [...draft.reminders, { id: uid(), minutes }].sort((a, b) => b.minutes - a.minutes) });
  };

  const pick = async (kind: "image" | "video") => {
    setBusy(true);
    try {
      const uri = kind === "image" ? await pickBackgroundImage() : await pickBackgroundVideo();
      if (uri) {
        const old = media[kind];
        if (old && old !== existing?.bg.uri) void deleteMedia(old);
        setMedia((m) => ({ ...m, [kind]: uri }));
        set({ bg: { ...draft.bg, kind } });
      }
    } catch {
      Alert.alert("تعذّر اختيار الملف");
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!draft.title.trim()) {
      Alert.alert("العنوان مطلوب", "اكتب اسمًا للحظة.");
      return;
    }
    if (down && draft.repeat.type === "days" && !(draft.repeat.every && draft.repeat.every >= 1)) {
      Alert.alert("عدد الأيام", "اكتب عدد أيام التكرار (1 أو أكثر).");
      return;
    }
    if (!existing && BILLING_ENABLED && !pro && count >= FREE_LIMITS.counters) {
      Alert.alert("وصلت للحد المجاني", "اشترك لإضافة عدد غير محدود من العدّادات.");
      return;
    }
    let kind = draft.bg.kind;
    if ((kind === "image" || kind === "video") && !bgUri) kind = "gradient";
    const keep = kind === "image" || kind === "video" ? bgUri : undefined;
    // نحذف ملفات الوسائط التي لم تعد مستعملة
    for (const u of new Set([existing?.bg.uri, media.image, media.video])) if (u && u !== keep) void deleteMedia(u);

    const body: Partial<Countdown> = {
      ...draft,
      title: draft.title.trim(),
      instantMs: absolute ? combine(draft.date, draft.time).getTime() : undefined,
      bg: { ...draft.bg, kind, uri: keep },
      repeat: down ? draft.repeat : { type: "none" },
      reminders: down ? draft.reminders : [],
      notifyAtEvent: down ? draft.notifyAtEvent : false,
    };
    if (existing) {
      update(existing.id, body);
      router.back();
    } else {
      const nid = add(body);
      router.replace({ pathname: "/countdowns/[id]", params: { id: nid } });
    }
  };

  const chips = <T extends string | number>(opts: { v: T; l: string }[], cur: T, on: (v: T) => void) => (
    <View className="flex-row flex-wrap gap-2">
      {opts.map((o) => (
        <Chip key={String(o.v)} label={o.l} selected={cur === o.v} onPress={() => on(o.v)} />
      ))}
    </View>
  );

  return (
    <Screen title={existing ? "تعديل اللحظة" : "لحظة جديدة"} back>
      <CountdownCard cd={preview} />

      <SectionHeader title="الأساسيات" />
      <Field label="العنوان" value={draft.title} onChangeText={(t) => set({ title: t })} placeholder="مثال: امتحان الأسنان" maxLength={60} />
      <Field label="وصف (اختياري)" value={draft.description} onChangeText={(t) => set({ description: t })} multiline maxLength={240} />
      <FieldRow label="الرمز">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {CD_EMOJIS.map((e) => (
            <Pressable
              key={e}
              onPress={() => set({ emoji: e })}
              className="w-12 h-12 rounded-2xl items-center justify-center border"
              style={{ backgroundColor: draft.emoji === e ? "#E0E7FF" : "#FFFFFF", borderColor: draft.emoji === e ? "#6366F1" : "#E3E6EB" }}
            >
              <Text style={{ fontSize: 24, lineHeight: 34 }}>{e}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </FieldRow>
      <Field label="أو اكتب رمزًا/إيموجي" value={draft.emoji} onChangeText={(t) => set({ emoji: Array.from(t).slice(0, 2).join("") })} />

      <FieldRow label="النوع">
        {chips(
          [
            { v: "down", l: "عدّ تنازلي (نحو موعد)" },
            { v: "up", l: "عدّ تصاعدي (منذ حدث)" },
          ],
          draft.direction,
          (v) => set({ direction: v }),
        )}
      </FieldRow>

      <DateField label="التاريخ" value={draft.date} onChange={(d) => d && set({ date: d })} />
      <TimeField label="الوقت" value={draft.time} onChange={(t) => set({ time: t })} />
      <View className="flex-row items-center gap-3 mb-3">
        <View className="flex-1">
          <Text w="semi">لحظة مطلقة</Text>
          <Text className="text-xs text-muted">
            {absolute ? "تُثبَّت على لحظة محددة مهما سافرت (مثل رحلة طيران)." : "تتبع ساعة جهازك: «9 صباحًا» تبقى 9 صباحًا حتى مع التوقيت الصيفي."}
          </Text>
        </View>
        <Switch value={absolute} onValueChange={setAbsolute} />
      </View>

      {down ? (
        <>
          <FieldRow label="التكرار">{chips(REPEAT_OPTIONS.map((o) => ({ v: o.value, l: o.label })), draft.repeat.type, (v) => set({ repeat: { type: v, every: v === "days" ? draft.repeat.every ?? 7 : undefined } }))}</FieldRow>
          {draft.repeat.type === "days" ? (
            <Field
              label="كل كم يوم؟"
              keyboardType="number-pad"
              value={draft.repeat.every ? String(draft.repeat.every) : ""}
              onChangeText={(t) => set({ repeat: { type: "days", every: Math.min(3650, parseInt(t.replace(/\D/g, ""), 10) || 0) } })}
            />
          ) : null}
          {draft.repeat.type !== "none" ? <Text className="text-xs text-muted mb-3">بعد مرور الموعد يُحسب الموعد القادم تلقائيًا.</Text> : null}
        </>
      ) : null}

      <FieldRow label="وحدة العرض">{chips(UNIT_OPTIONS.map((o) => ({ v: o.value, l: o.label })), draft.unit, (v) => set({ unit: v }))}</FieldRow>

      <SectionHeader title="المظهر" />
      <FieldRow label="اللون">
        <View className="flex-row flex-wrap gap-2">
          {CD_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => {
                set({ color: c });
                setHex(c);
              }}
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: c, borderWidth: draft.color === c ? 3 : 0, borderColor: "#0F172A" }}
            />
          ))}
        </View>
      </FieldRow>
      <Field
        label="لون مخصّص (HEX)"
        value={hex}
        autoCapitalize="characters"
        maxLength={7}
        onChangeText={(t) => {
          setHex(t);
          const n = normalizeHex(t);
          if (n) set({ color: n });
        }}
      />

      <FieldRow label="الخلفية">{chips(BG_KINDS, draft.bg.kind, (v) => set({ bg: { ...draft.bg, kind: v } }))}</FieldRow>
      {draft.bg.kind === "gradient" ? (
        <View className="flex-row flex-wrap gap-2 mb-3">
          {CD_GRADIENTS.map((g) => {
            const sel = (draft.bg.gradient ?? "auto") === g.id;
            const cols = g.id === "auto" ? [draft.color, draft.color] : g.colors;
            return (
              <Pressable key={g.id} onPress={() => set({ bg: { ...draft.bg, gradient: g.id } })} style={{ alignItems: "center", gap: 4 }}>
                <View style={{ width: 54, height: 38, borderRadius: 12, overflow: "hidden", flexDirection: "row", borderWidth: sel ? 3 : 1, borderColor: sel ? "#0F172A" : "#E3E6EB" }}>
                  <View style={{ flex: 1, backgroundColor: cols[0] }} />
                  <View style={{ flex: 1, backgroundColor: cols[1] }} />
                </View>
                <Text className="text-[10px] text-muted">{g.name}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {draft.bg.kind === "image" || draft.bg.kind === "video" ? (
        <View className="mb-3 gap-2">
          <Button label={bgUri ? "تغيير الملف" : draft.bg.kind === "image" ? "اختر صورة" : "اختر فيديو (حتى 30 ثانية)"} icon={draft.bg.kind === "image" ? "image-outline" : "videocam-outline"} variant="outline" disabled={busy} onPress={() => pick(draft.bg.kind as "image" | "video")} />
          <Stepper label="تعتيم الخلفية" value={draft.bg.dim ?? 0.35} min={0} max={0.8} step={0.05} fmt={(n) => `${Math.round(n * 100)}%`} onChange={(n) => set({ bg: { ...draft.bg, dim: n } })} />
          {draft.bg.kind === "video" ? <Text className="text-xs text-muted">الفيديو يعمل في شاشة التفاصيل فقط (توفيرًا للبطارية)، وفي القوائم يظهر تدرّج لوني.</Text> : null}
        </View>
      ) : null}

      <SectionHeader title="النص" />
      <FieldRow label="موضع النص">{chips(TEXT_POS_OPTIONS.map((o) => ({ v: o.value, l: o.label })), draft.text.pos, (v) => set({ text: { ...draft.text, pos: v } }))}</FieldRow>
      <FieldRow label="الخط">{chips(FONT_OPTIONS.map((o) => ({ v: o.value, l: o.label })), draft.text.font, (v) => set({ text: { ...draft.text, font: v } }))}</FieldRow>
      <Stepper label="حجم النص" value={draft.text.scale} min={0.7} max={1.5} step={0.1} fmt={(n) => `${Math.round(n * 100)}%`} onChange={(n) => set({ text: { ...draft.text, scale: n } })} />
      <Stepper label="شفافية النص" value={draft.text.opacity} min={0.4} max={1} step={0.1} fmt={(n) => `${Math.round(n * 100)}%`} onChange={(n) => set({ text: { ...draft.text, opacity: n } })} />

      {down ? (
        <>
          <SectionHeader title="التذكيرات" />
          <View className="flex-row items-center gap-3 mb-3">
            <Text w="semi" className="flex-1">
              إشعار لحظة الحدث
            </Text>
            <Switch value={draft.notifyAtEvent} onValueChange={(v) => set({ notifyAtEvent: v })} />
          </View>
          <FieldRow label="قبل الحدث (يمكن اختيار أكثر من تذكير)">
            <View className="flex-row flex-wrap gap-2">
              {REMINDER_PRESETS.map((m) => {
                const on = draft.reminders.some((r) => r.minutes === m);
                return (
                  <Chip
                    key={m}
                    label={reminderLabel(m)}
                    selected={on}
                    onPress={() => (on ? set({ reminders: draft.reminders.filter((r) => r.minutes !== m) }) : addReminder(m))}
                  />
                );
              })}
            </View>
          </FieldRow>
          {draft.reminders.filter((r) => !REMINDER_PRESETS.includes(r.minutes)).length > 0 ? (
            <View className="flex-row flex-wrap gap-2 mb-3">
              {draft.reminders
                .filter((r) => !REMINDER_PRESETS.includes(r.minutes))
                .map((r) => (
                  <Chip key={r.id} label={`${reminderLabel(r.minutes)} ✕`} selected onPress={() => set({ reminders: draft.reminders.filter((x) => x.id !== r.id) })} />
                ))}
            </View>
          ) : null}
          <FieldRow label="تذكير مخصّص">
            <View className="flex-row items-center gap-2">
              <View style={{ width: 90 }}>
                <Field value={remVal} onChangeText={(t) => setRemVal(t.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="مثلًا 45" style={{ marginBottom: 0 }} />
              </View>
              <View className="flex-row gap-1.5 flex-1 flex-wrap">
                {REM_UNITS.map((u) => (
                  <Chip key={u.v} label={u.l} selected={remUnit === u.v} onPress={() => setRemUnit(u.v)} />
                ))}
              </View>
              <IconButton
                icon="add"
                onPress={() => {
                  addReminder((parseInt(remVal, 10) || 0) * remUnit);
                  setRemVal("");
                }}
              />
            </View>
          </FieldRow>
        </>
      ) : null}

      <View className="mt-4">
        <Button label={existing ? "حفظ التعديلات" : "إنشاء اللحظة"} icon="checkmark" onPress={save} disabled={busy} />
      </View>
    </Screen>
  );
}
