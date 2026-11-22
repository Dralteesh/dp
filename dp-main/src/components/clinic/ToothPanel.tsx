import { useEffect, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { ProcedureBadge } from "@/components/clinic/ProcedureIcon";
import { Chip } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Text";
import { ODONTO_BG, TOOTH_STATUS } from "@/constants/clinic";
import { TYPE_META } from "@/constants/shiftTypes";
import { PRIMARY_SHAPES, TOOTH_SHAPES } from "@/constants/toothShapes";
import { fmtDateShort } from "@/lib/dates";
import { toothName } from "@/lib/odontogram";
import type { ClinicSession, Patient, ToothStatus } from "@/types";

type Props = {
  patient: Patient;
  tooth: string;
  /** جلسات هذا المريض (كلها) — يُصفّى منها ما يخص السن */
  sessions: ClinicSession[];
  onSetStatus: (status: ToothStatus | null) => void;
  onSaveNote: (note: string) => void;
  onAddSession: () => void;
};

const BLUE = ODONTO_BG;
const PALE = "#E7F3FF";
const LINE = "#D3E6F7";

/** رسم السن المحدّد بشكله الحقيقي ولون حالته */
function ToothArt({ code, status }: { code: string; status?: ToothStatus }) {
  const sh = TOOTH_SHAPES[code] ?? PRIMARY_SHAPES[code];
  if (!sh) return <Ionicons name="medical" size={48} color={BLUE} />;
  const pad = 14;
  const size = Math.max(sh.w, sh.h) + pad * 2;
  const gone = status === "missing" || status === "extraction";
  const fill = status ? TOOTH_STATUS[status].hex : "url(#toothGrad)";
  return (
    <Svg width={104} height={104} viewBox={`${sh.cx - size / 2} ${sh.cy - size / 2} ${size} ${size}`}>
      <Defs>
        <LinearGradient id="toothGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#CFE3F5" />
        </LinearGradient>
      </Defs>
      <Path d={sh.d} fill={fill} fillOpacity={gone ? 0.35 : 1} stroke={BLUE} strokeOpacity={0.35} strokeWidth={3} strokeLinejoin="round" strokeDasharray={gone ? "8,5" : undefined} />
    </Svg>
  );
}

/** لوح تفاصيل السن: حالته، سجل علاجاته، وملاحظته السريرية */
export function ToothPanel({ patient, tooth, sessions, onSetStatus, onSaveNote, onAddSession }: Props) {
  const status = patient.teeth[tooth];
  const meta = status ? TOOTH_STATUS[status] : null;
  const history = sessions.filter((x) => x.tooth === tooth); // مرتّبة مسبقًا: الأحدث أولًا
  const last = history[0];
  const savedNote = patient.toothNotes?.[tooth] ?? "";

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(savedNote);

  // عند تغيير السن المحدّد: أغلق المحرّر وحمّل ملاحظة السن الجديد
  useEffect(() => {
    setEditing(false);
    setDraft(patient.toothNotes?.[tooth] ?? "");
  }, [tooth]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveNote = () => {
    onSaveNote(draft.trim());
    setEditing(false);
  };

  return (
    <View>
      {/* بطاقة السن */}
      <Card className="mt-3">
        <View className="flex-row items-center gap-4">
          <View style={{ width: 112, height: 112, borderRadius: 24, backgroundColor: PALE, alignItems: "center", justifyContent: "center" }}>
            <ToothArt code={tooth} status={status} />
          </View>
          <View className="flex-1">
            <Text w="bold" style={{ fontSize: 20, color: BLUE }}>
              السن {tooth}
            </Text>
            <Text className="text-xs text-muted" numberOfLines={2}>
              {toothName(tooth)}
            </Text>
            <View className="mt-2 rounded-2xl p-3" style={{ backgroundColor: PALE, borderWidth: 1, borderColor: LINE }}>
              <Text className="text-xs text-muted">الحالة</Text>
              <Text w="bold" style={{ color: meta ? meta.hex : "#16A34A" }}>
                {meta ? meta.label : "سليم"}
              </Text>
              <View style={{ height: 1, backgroundColor: LINE, marginVertical: 6 }} />
              <Text className="text-xs text-muted">آخر علاج</Text>
              <Text w="semi" className="text-sm">
                {last ? `${last.procedure} • ${fmtDateShort(last.date)}` : "لا علاج مسجّل"}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* تغيير الحالة */}
      <Text w="bold" className="mt-4 mb-2" style={{ color: BLUE }}>
        حالة السن
      </Text>
      <View className="flex-row flex-wrap gap-2">
        <Chip label="سليم" selected={!status} color="#64748B" onPress={() => onSetStatus(null)} />
        {(Object.keys(TOOTH_STATUS) as ToothStatus[]).map((s) => (
          <Chip key={s} label={TOOTH_STATUS[s].label} selected={status === s} color={TOOTH_STATUS[s].hex} onPress={() => onSetStatus(s)} />
        ))}
      </View>

      {/* سجل العلاج */}
      <Text w="bold" className="mt-5 mb-2" style={{ color: BLUE }}>
        سجل العلاج
      </Text>
      {history.length === 0 ? (
        <View className="rounded-2xl px-4 py-5 items-center" style={{ backgroundColor: PALE }}>
          <Ionicons name="time-outline" size={26} color={BLUE} />
          <Text className="text-sm text-muted mt-1">لا جلسات مسجّلة على هذا السن</Text>
        </View>
      ) : (
        history.map((h, i) => (
          <View key={h.id} className="flex-row items-stretch mb-2">
            {/* خط زمني */}
            <View style={{ width: 18, alignItems: "center" }}>
              <View style={{ width: 2, flex: 1, backgroundColor: i === 0 ? "transparent" : LINE }} />
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: BLUE }} />
              <View style={{ width: 2, flex: 1, backgroundColor: i === history.length - 1 ? "transparent" : LINE }} />
            </View>
            <View className="flex-1 flex-row items-center gap-3 bg-surface rounded-2xl px-3 py-2.5 ms-2" style={{ borderWidth: 1, borderColor: LINE }}>
              <View className="w-11 h-11 rounded-2xl items-center justify-center" style={{ backgroundColor: PALE }}>
                <ProcedureBadge name={h.procedure} size={30} color={BLUE} />
              </View>
              <View className="flex-1">
                <Text w="bold">{h.procedure}</Text>
                <Text className="text-xs text-muted">{fmtDateShort(h.date)}</Text>
                {h.notes ? (
                  <Text className="text-xs text-muted" numberOfLines={2}>
                    {h.notes}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        ))
      )}

      <PressableScale
        className="mt-2 rounded-2xl py-3.5 flex-row items-center justify-center gap-2"
        style={{ backgroundColor: BLUE }}
        onPress={onAddSession}
      >
        <Ionicons name="add" size={22} color="#FFFFFF" />
        <Text w="bold" style={{ color: "#FFFFFF" }}>
          إضافة علاج لهذا السن
        </Text>
      </PressableScale>

      {/* الملاحظة */}
      <View className="flex-row items-center justify-between mt-5 mb-2">
        <View className="flex-row items-center gap-2">
          <Ionicons name="document-text-outline" size={20} color={BLUE} />
          <Text w="bold" style={{ color: BLUE }}>
            ملاحظات
          </Text>
        </View>
        {!editing ? (
          <Pressable hitSlop={10} onPress={() => setEditing(true)} accessibilityLabel="تعديل الملاحظة">
            <Ionicons name={savedNote ? "pencil" : "add-circle-outline"} size={20} color={TYPE_META.private.hex} />
          </Pressable>
        ) : null}
      </View>
      {editing ? (
        <View className="rounded-2xl p-3" style={{ backgroundColor: PALE, borderWidth: 1, borderColor: LINE }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            autoFocus
            placeholder="اكتب ملاحظة سريرية عن هذا السن"
            placeholderTextColor="#94A3B8"
            style={{ minHeight: 72, textAlignVertical: "top", textAlign: "right", fontFamily: "Cairo_400Regular", color: "#153D60" }}
          />
          <View className="flex-row gap-2 mt-2">
            <Pressable onPress={saveNote} className="flex-1 rounded-xl py-2.5 items-center" style={{ backgroundColor: BLUE }}>
              <Text w="bold" style={{ color: "#FFFFFF" }}>
                حفظ
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setDraft(savedNote);
                setEditing(false);
              }}
              className="flex-1 rounded-xl py-2.5 items-center bg-surface"
              style={{ borderWidth: 1, borderColor: LINE }}
            >
              <Text w="semi">إلغاء</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View className="rounded-2xl px-4 py-3" style={{ backgroundColor: PALE }}>
          <Text className={savedNote ? "text-sm" : "text-sm text-muted"}>{savedNote || "لا ملاحظات على هذا السن"}</Text>
        </View>
      )}
    </View>
  );
}
