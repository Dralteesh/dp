import { Vibration } from "react-native";
import type { SmartAction } from "@/lib/smart";
import { useAlarms } from "@/store/useAlarms";
import { usePlanner } from "@/store/usePlanner";

type Router = { push: (to: never) => void };

/** ينفّذ إجراء اقتراح: فتح شاشة، أو ضبط منبّه، أو إنجاز مهمة */
export function runSmartAction(router: Router, action: SmartAction) {
  if (action.kind === "route") {
    router.push((action.params ? { pathname: action.path, params: action.params } : action.path) as never);
    return;
  }
  Vibration.vibrate(15);
  if (action.kind === "alarm") {
    useAlarms.getState().addAlarm({
      label: action.title,
      time: action.time,
      days: [],
      onceDate: action.date,
      enabled: true,
      snoozeMinutes: 5,
      maxSnoozes: 2,
    });
    return;
  }
  if (action.kind === "completeTask") {
    const t = usePlanner.getState().tasks.find((x) => x.id === action.taskId);
    if (t && !t.done) usePlanner.getState().toggleTask(t.id);
  }
}
