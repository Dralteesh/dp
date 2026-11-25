import { useEffect, useState } from "react";
import { AppState } from "react-native";

/**
 * مؤقّت واحد مشترك لكل العدّادات (مؤشر زمن واحد بدل مؤقت لكل بطاقة) يتوقف حين يذهب التطبيق للخلفية.
 * كل مشترك يحدّد دقّته: 1000 للثواني، 60000 للدقائق فلا يُعاد رسم البطاقة بلا داعٍ (بطارية أقل).
 */
type Sub = { res: number; last: number; fn: (t: number) => void };
const subs = new Set<Sub>();
let timer: ReturnType<typeof setInterval> | undefined;
let active = AppState.currentState !== "background" && AppState.currentState !== "inactive";

function loop() {
  const t = Date.now();
  subs.forEach((s) => {
    const k = Math.floor(t / s.res);
    if (k !== s.last) {
      s.last = k;
      s.fn(t);
    }
  });
}
function sync() {
  const want = subs.size > 0 && active;
  if (want && !timer) timer = setInterval(loop, 1000);
  else if (!want && timer) {
    clearInterval(timer);
    timer = undefined;
  }
}
AppState.addEventListener("change", (st) => {
  active = st === "active";
  if (active) loop();
  sync();
});

/** يعيد Date.now() محدَّثًا كل res ميلي ثانية */
export function useTicker(res = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const s: Sub = { res, last: Math.floor(Date.now() / res), fn: setNow };
    subs.add(s);
    setNow(Date.now());
    sync();
    return () => {
      subs.delete(s);
      sync();
    };
  }, [res]);
  return now;
}
