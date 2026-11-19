import { useMemo } from "react";
import { PRAYER_THEMES, skyKey } from "@/constants/prayerThemes";
import { useNow } from "@/hooks/useNow";
import { nextPrayer } from "@/lib/prayer";
import { useSettings } from "@/store/useSettings";
import type { Sky } from "@/components/focus/Scene";

/** سماء الآن (من ثيمات الصلاة) وسماء الصلاة التالية، تُحدَّث كل دقيقة فقط */
export function useSky(): { now: Sky; next: Sky } {
  const t = useNow(60000);
  const prayerMethod = useSettings((s) => s.prayerMethod);
  const madhab = useSettings((s) => s.madhab);
  const prayerAdjust = useSettings((s) => s.prayerAdjust);
  const minuteKey = Math.floor(t.getTime() / 60000);
  return useMemo(() => {
    const s = { prayerMethod, madhab, prayerAdjust };
    const n = nextPrayer(new Date(), s);
    const k = skyKey(new Date(), s, n.key);
    return {
      now: { colors: PRAYER_THEMES[k].sky, night: PRAYER_THEMES[k].night },
      next: { colors: PRAYER_THEMES[n.key].sky, night: PRAYER_THEMES[n.key].night },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minuteKey, prayerMethod, madhab, prayerAdjust]);
}
