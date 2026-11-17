import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";
import { usePathname } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useDevice } from "@/store/useDevice";

const GRACE_MS = 30_000; // لا نقفل إن غادر التطبيق أقل من هذه المدة

/** قفل التطبيق ببصمة الوجه/الإصبع أو رمز/نمط الهاتف. لا يحجب شاشة رنين المنبّه. */
export function LockGate() {
  const enabled = useDevice((s) => s.lockEnabled);
  const pathname = usePathname();
  const [locked, setLocked] = useState(enabled);
  const [failed, setFailed] = useState(false);
  const busy = useRef(false);
  const leftAt = useRef<number | null>(null);

  const unlock = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setFailed(false);
    try {
      const r = await LocalAuthentication.authenticateAsync({
        promptMessage: "افتح Dentist Planner",
        cancelLabel: "إلغاء",
        // يسمح برمز/نمط الهاتف إن لم تنجح البصمة
        disableDeviceFallback: false,
      });
      if (r.success) setLocked(false);
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
    }
  }, []);

  // عند التشغيل أو تفعيل القفل
  useEffect(() => {
    if (enabled) {
      setLocked(true);
      unlock();
    } else {
      setLocked(false);
    }
  }, [enabled, unlock]);

  // عند العودة من الخلفية
  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "background") {
        // نافذة المصادقة نفسها تُحدث inactive لا background
        if (!busy.current) leftAt.current = Date.now();
      } else if (s === "active") {
        const t = leftAt.current;
        leftAt.current = null;
        if (t && Date.now() - t > GRACE_MS) {
          setLocked(true);
          unlock();
        }
      }
    });
    return () => sub.remove();
  }, [enabled, unlock]);

  if (!enabled || !locked || pathname.startsWith("/ringing")) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#F5F7FB",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
      accessibilityViewIsModal
    >
      <Logo size={96} app />
      <Text w="bold" className="text-2xl mt-4">
        Dentist Planner
      </Text>
      <Text className="text-muted text-center mt-1 mb-6">
        {failed ? "لم تتم المصادقة. حاول مرة أخرى." : "التطبيق مقفل لحماية بيانات المرضى"}
      </Text>
      <View style={{ width: "100%", maxWidth: 320 }}>
        <Button label="فتح" icon="finger-print" onPress={unlock} />
      </View>
    </View>
  );
}
