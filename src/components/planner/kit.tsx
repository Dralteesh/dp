import type { ReactNode } from "react";
import { Pressable, ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ProcedureBadge } from "@/components/clinic/ProcedureIcon";
import { Text } from "@/components/ui/Text";
import { PL } from "@/design/planner";
import { useLayout } from "@/hooks/useLayout";
import { initial } from "@/lib/format";
import type { AppointmentStatus } from "@/types";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export const PLANNER_TABS: { key: string; label: string; icon: IconName; iconOn: IconName; href: string }[] = [
  { key: "home", label: "الرئيسية", icon: "home-outline", iconOn: "home", href: "/planner/home" },
  { key: "schedule", label: "الجدول", icon: "calendar-outline", iconOn: "calendar", href: "/planner/schedule" },
  { key: "patients", label: "المرضى", icon: "people-outline", iconOn: "people", href: "/planner/patients" },
  { key: "treatments", label: "العلاجات", icon: "notifications-outline", iconOn: "notifications", href: "/planner/treatments" },
  { key: "settings", label: "الإعدادات", icon: "settings-outline", iconOn: "settings", href: "/planner/settings" },
];

/** الشريط السفلي للواجهة الجديدة */
export function PlannerBottomNav({ active }: { active?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: PL.white,
        borderTopWidth: 1,
        borderTopColor: PL.border,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 8),
        paddingHorizontal: 6,
      }}
    >
      {PLANNER_TABS.map((t) => {
        const on = active ? active === t.key : pathname === t.href;
        return (
          <Pressable
            key={t.key}
            onPress={() => !on && router.replace(t.href as never)}
            accessibilityLabel={t.label}
            style={{ flex: 1, alignItems: "center", paddingVertical: 6, borderRadius: 16, backgroundColor: on ? PL.cardStrong : "transparent" }}
          >
            <Ionicons name={on ? t.iconOn : t.icon} size={22} color={on ? PL.navy : PL.muted} />
            <Text w={on ? "bold" : "regular"} style={{ fontSize: 10.5, color: on ? PL.navy : PL.muted }}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}


/** شريط جانبي (بدل السفلي) على الشاشات العريضة */
export function PlannerSideRail({ active }: { active?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <View style={{ width: 92, backgroundColor: PL.white, borderEndWidth: 1, borderEndColor: PL.border, paddingVertical: 14, paddingHorizontal: 8, gap: 6 }}>
      {PLANNER_TABS.map((t) => {
        const on = active ? active === t.key : pathname === t.href;
        return (
          <Pressable
            key={t.key}
            onPress={() => !on && router.replace(t.href as never)}
            accessibilityLabel={t.label}
            style={{ alignItems: "center", paddingVertical: 12, borderRadius: 16, backgroundColor: on ? PL.cardStrong : "transparent" }}
          >
            <Ionicons name={on ? t.iconOn : t.icon} size={24} color={on ? PL.navy : PL.muted} />
            <Text w={on ? "bold" : "regular"} style={{ fontSize: 11, color: on ? PL.navy : PL.muted, marginTop: 2 }}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** غلاف شاشات الواجهة الجديدة: خلفية زرقاء فاتحة + ترويسة + شريط سفلي اختياري */
export function PlannerShell({
  title,
  left,
  right,
  back,
  nav,
  scroll = true,
  maxWidth = 820,
  children,
  overlay,
}: {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
  back?: boolean;
  /** مفتاح التبويب الفعّال، أو undefined لإخفاء الشريط */
  nav?: string;
  scroll?: boolean;
  /** أقصى عرض للمحتوى على الشاشات العريضة */
  maxWidth?: number;
  children: ReactNode;
  overlay?: ReactNode;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isWide } = useLayout();
  const rail = !!nav && isWide;
  return (
    <View style={{ flex: 1, backgroundColor: PL.bg, paddingTop: insets.top, flexDirection: rail ? "row" : "column" }}>
      {rail ? <PlannerSideRail active={nav} /> : null}
      <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 10 }}>
        {back ? (
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityLabel="رجوع"
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: PL.white, borderWidth: 1, borderColor: PL.border, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="chevron-forward" size={22} color={PL.navy} />
          </Pressable>
        ) : (
          left
        )}
        <Text w="bold" style={{ flex: 1, textAlign: "center", fontSize: 18, color: PL.navy }}>
          {title}
        </Text>
        {right ?? <View style={{ width: 40 }} />}
      </View>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32, alignItems: "center" }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ width: "100%", maxWidth }}>{children}</View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 16, alignItems: "center" }}>
          <View style={{ flex: 1, width: "100%", maxWidth }}>{children}</View>
        </View>
      )}
      {overlay}
      {nav && !rail ? <PlannerBottomNav active={nav} /> : null}
      </View>
    </View>
  );
}

export function PCard({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const base: ViewStyle = { backgroundColor: PL.card, borderRadius: PL.rCard, borderWidth: 1, borderColor: PL.border, padding: 14 };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={[base, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

/** أفاتار بالحرف الأول (ألوان بحسب الجنس) */
export function Avatar({ name, gender, size = 46 }: { name: string; gender?: "male" | "female"; size?: number }) {
  const bg = gender === "female" ? "#F6D8E6" : "#BFD9F2";
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, borderWidth: 2, borderColor: PL.white, alignItems: "center", justifyContent: "center" }}>
      <Text w="bold" style={{ fontSize: size * 0.42, color: PL.navy }}>
        {initial(name)}
      </Text>
    </View>
  );
}

/** أفاتار بصورة الإجراء بدل حرف المريض؛ بلا إجراء يرجع للحرف الأول */
export function ProcAvatar({ procedure, name, gender, size = 46 }: { procedure?: string; name: string; gender?: "male" | "female"; size?: number }) {
  if (!procedure) return <Avatar name={name} gender={gender} size={size} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: PL.white, borderWidth: 2, borderColor: PL.border, alignItems: "center", justifyContent: "center" }}>
      <ProcedureBadge name={procedure} size={Math.round(size * 0.78)} />
    </View>
  );
}

const PILL: Record<AppointmentStatus, { label: string; bg: string; fg: string }> = {
  scheduled: { label: "مجدول", bg: PL.warnSoft, fg: PL.warn },
  arrived: { label: "وصل", bg: "#CFEFF5", fg: "#0E7490" },
  done: { label: "مؤكد ✓", bg: PL.goodSoft, fg: PL.good },
  no_show: { label: "لم يحضر", bg: PL.badSoft, fg: PL.bad },
  postponed: { label: "مؤجل", bg: PL.warnSoft, fg: PL.warn },
  cancelled: { label: "ملغى", bg: "#E5E7EB", fg: "#6B7280" },
};

export function StatusPill({ status }: { status: AppointmentStatus }) {
  const m = PILL[status];
  return (
    <View style={{ backgroundColor: m.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Text w="semi" style={{ fontSize: 11, color: m.fg }}>
        {status === "scheduled" ? "قيد الانتظار" : m.label}
      </Text>
    </View>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18, marginBottom: 10 }}>
      <Text w="bold" style={{ fontSize: 17, color: PL.navy }}>
        {title}
      </Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text w="semi" style={{ fontSize: 13, color: PL.blue }}>
            {action} ←
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
