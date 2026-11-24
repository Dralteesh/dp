import { useEffect } from "react";
import { AppState } from "react-native";
import { getOwner, syncAll } from "@/lib/cloudSync";
import { useAlarms } from "@/store/useAlarms";
import { useAuth } from "@/store/useAuth";
import { useClinic } from "@/store/useClinic";
import { useExtras } from "@/store/useExtras";
import { usePlanner } from "@/store/usePlanner";
import { useCountdowns } from "@/store/useCountdowns";
import { usePrayerLog } from "@/store/usePrayerLog";
import { useQuranPrefs } from "@/store/useQuranPrefs";
import { useSettings } from "@/store/useSettings";
import { useSleep } from "@/store/useSleep";
import { useWeather } from "@/store/useWeather";

/** مكوّن بلا واجهة: يزامن مع Supabase عند الدخول وعند عودة التطبيق وبعد كل تغيير (بمهلة 3 ثوانٍ). */
export function CloudSync() {
  const init = useAuth((s) => s.init);
  const userId = useAuth((s) => s.session?.user.id);
  const setSync = useAuth((s) => s.setSync);

  useEffect(() => init(), [init]);

  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const run = async () => {
      // لا نزامن حتى يؤكَّد أن بيانات الجهاز تخص هذا الحساب (يتم من شاشة الحساب)
      if ((await getOwner()) !== userId) return;
      setSync({ syncStatus: "syncing", syncError: null });
      try {
        await syncAll(userId);
        if (!cancelled) setSync({ syncStatus: "ok", lastSyncAt: Date.now() });
      } catch (e: any) {
        if (!cancelled) setSync({ syncStatus: "error", syncError: e?.message ?? "تعذّرت المزامنة" });
      }
    };
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, 3000);
    };

    run();
    const unsubs = [
      usePlanner.subscribe(schedule),
      useClinic.subscribe(schedule),
      useAlarms.subscribe(schedule),
      useCountdowns.subscribe(schedule),
      useSettings.subscribe(schedule),
      useExtras.subscribe(schedule),
      // نتجاهل تغيّرات الحقول المحلية فقط (الجلسة الجارية، التخزين المؤقت، رقم الصفحة) كي لا تتكرر الطلبات
      useSleep.subscribe((s, p) => {
        if (s.logs !== p.logs) schedule();
      }),
      usePrayerLog.subscribe((s, p) => {
        if (s.done !== p.done) schedule();
      }),
      useQuranPrefs.subscribe((s, p) => {
        if (s.fontSize !== p.fontSize || s.paper !== p.paper || s.tajweed !== p.tajweed || s.bookmarks !== p.bookmarks) schedule();
      }),
      useWeather.subscribe((s, p) => {
        if (s.cities !== p.cities || s.units !== p.units || s.rainAlert !== p.rainAlert || s.severeAlert !== p.severeAlert) schedule();
      }),
    ];
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") run();
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      unsubs.forEach((u) => u());
      sub.remove();
    };
  }, [userId, setSync]);

  return null;
}
