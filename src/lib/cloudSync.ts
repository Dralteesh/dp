import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { useAlarms } from "@/store/useAlarms";
import { useClinic } from "@/store/useClinic";
import { useExtras } from "@/store/useExtras";
import { usePlanner } from "@/store/usePlanner";
import { useCountdowns } from "@/store/useCountdowns";
import { usePrayerLog } from "@/store/usePrayerLog";
import { useQuranPrefs } from "@/store/useQuranPrefs";
import { useSleep } from "@/store/useSleep";
import { useWeather } from "@/store/useWeather";
import { DEFAULT_SETTINGS, useSettings } from "@/store/useSettings";

/**
 * مزامنة «محليًا أولًا»: التطبيق يعمل دون إنترنت، وتُرفع التغييرات وتُسحب عند توفر الاتصال.
 * كل جدول بعمود data (jsonb) + deleted + updated_at (يضبطه الخادم). الحذف يُرسل كعلامة deleted.
 * التعارض: آخر كاتب يفوز، ولا يُستبدل عنصر محلي لم يُرفع بعد.
 */

type Item = { id: string; [k: string]: any };
type Slice = {
  table: string;
  get: () => Item[];
  merge: (upserts: Item[], removeIds: string[]) => void;
  /** سجل وحيد لكل مستخدم (الإعدادات): في أول مزامنة بجهاز جديد تتغلّب نسخة السحابة */
  singleton?: boolean;
};

function listSlice<S>(
  table: string,
  store: { getState: () => S; setState: (fn: (s: S) => Partial<S>) => void },
  key: keyof S,
): Slice {
  return {
    table,
    get: () => (store.getState()[key] as unknown as Item[]) ?? [],
    merge: (ups, rm) =>
      store.setState((s) => {
        const cur = (s[key] as unknown as Item[]) ?? [];
        const upMap = new Map(ups.map((u) => [u.id, u]));
        const rmSet = new Set(rm);
        const next = cur.filter((i) => !rmSet.has(i.id)).map((i) => upMap.get(i.id) ?? i);
        const have = new Set(cur.map((i) => i.id));
        for (const u of ups) if (!have.has(u.id)) next.push(u);
        return { [key]: next } as unknown as Partial<S>;
      }),
  };
}

/** سجل وحيد (id = main) لإعدادات صغيرة: تتغلّب نسخة السحابة في الجهاز الجديد */
function singletonSlice(table: string, get: () => Item, apply: (patch: Item) => void): Slice {
  return {
    table,
    singleton: true,
    get: () => [{ id: "main", ...get() }],
    merge: (ups) => {
      const row = ups.find((u) => u.id === "main");
      if (!row) return;
      const { id: _id, ...patch } = row;
      apply(patch);
    },
  };
}

/** سجل «صليت»: صف لكل يوم (id = التاريخ). مؤقّتات التأجيل تبقى محلية */
const prayerDaysSlice: Slice = {
  table: "user_prayer_days",
  get: () => Object.entries(usePrayerLog.getState().done).map(([iso, v]) => ({ id: iso, ...v })),
  merge: (ups, rm) =>
    usePrayerLog.setState((s) => {
      const done = { ...s.done };
      for (const id of rm) delete done[id];
      for (const u of ups) {
        const { id, ...rest } = u;
        done[id] = rest;
      }
      return { done };
    }),
};

const quranSlice = singletonSlice(
  "user_quran",
  () => {
    const q = useQuranPrefs.getState();
    return { fontSize: q.fontSize, paper: q.paper, tajweed: q.tajweed, lastPage: q.lastPage, bookmarks: q.bookmarks };
  },
  (patch) => useQuranPrefs.setState(patch as any),
);

/** المدن والوحدات والتنبيهات (دون موضع المدينة الحالية والتخزين المؤقت) */
const weatherSlice = singletonSlice(
  "user_weather",
  () => {
    const w = useWeather.getState();
    return { cities: w.cities, units: w.units, rainAlert: w.rainAlert, severeAlert: w.severeAlert };
  },
  (patch) =>
    useWeather.setState((s) => {
      const cities = Array.isArray(patch.cities) && patch.cities.length ? patch.cities : s.cities;
      return { ...(patch as any), cities, index: Math.min(s.index, cities.length - 1) };
    }),
);

const SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS);

const settingsSlice: Slice = {
  table: "user_settings",
  singleton: true,
  get: () => {
    const s = useSettings.getState() as any;
    const data: Item = { id: "main" };
    for (const k of SETTINGS_KEYS) data[k] = s[k];
    return [data];
  },
  merge: (ups) => {
    const row = ups.find((u) => u.id === "main");
    if (!row) return;
    const { id: _id, ...patch } = row;
    useSettings.setState(patch as any);
  },
};

const SLICES: Slice[] = [
  listSlice("planner_events", usePlanner as any, "events" as any),
  listSlice("planner_tasks", usePlanner as any, "tasks" as any),
  listSlice("planner_notes", usePlanner as any, "notes" as any),
  listSlice("planner_alarms", useAlarms as any, "alarms" as any),
  listSlice("clinic_patients", useClinic as any, "patients" as any),
  listSlice("clinic_appointments", useClinic as any, "appointments" as any),
  listSlice("clinic_sessions", useClinic as any, "sessions" as any),
  listSlice("clinic_payments", useClinic as any, "payments" as any),
  listSlice("clinic_drugs", useClinic as any, "drugs" as any),
  listSlice("clinic_prescriptions", useClinic as any, "prescriptions" as any),
  listSlice("clinic_inventory", useClinic as any, "inventory" as any),
  listSlice("clinic_stock_moves", useClinic as any, "stockMoves" as any),
  listSlice("clinic_treatment_plans", useClinic as any, "plans" as any),
  listSlice("clinic_expenses", useClinic as any, "expenses" as any),
  listSlice("clinic_price_list", useExtras as any, "priceList" as any),
  listSlice("clinic_waitlist", useExtras as any, "waitlist" as any),
  listSlice("clinic_sterilization", useExtras as any, "sterilization" as any),
  listSlice("clinic_ortho_cases", useExtras as any, "orthoCases" as any),
  listSlice("clinic_consents", useExtras as any, "consents" as any),
  listSlice("clinic_install_plans", useExtras as any, "installPlans" as any),
  listSlice("clinic_lab_orders", useExtras as any, "labOrders" as any),
  listSlice("clinic_perio_charts", useExtras as any, "perioCharts" as any),
  listSlice("clinic_dental_exams", useExtras as any, "dentalExams" as any),
  listSlice("clinic_invoices", useExtras as any, "invoices" as any),
  listSlice("countdowns", useCountdowns as any, "items" as any),
  listSlice("user_sleep_logs", useSleep as any, "logs" as any),
  prayerDaysSlice,
  quranSlice,
  weatherSlice,
  settingsSlice,
];

/** تحويل ثابت الترتيب: jsonb في Postgres لا يحفظ ترتيب المفاتيح */
function stable(v: any): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v)
      .filter((k) => v[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(v[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v);
}

const K = {
  owner: "dp.cloud.owner",
  snap: (u: string) => `dp.cloud.snap.${u}`,
  pull: (u: string) => `dp.cloud.pull.${u}`,
};

type Snap = Record<string, Record<string, string>>;
type PullMap = Record<string, string>;

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function getOwner() {
  return AsyncStorage.getItem(K.owner);
}
export async function setOwner(userId: string) {
  await AsyncStorage.setItem(K.owner, userId);
}

/** يمسح بيانات الجهاز المحلية (عند تسجيل دخول حساب مختلف) */
export function wipeLocal() {
  usePlanner.getState().resetAll();
  useClinic.getState().resetAll();
  useExtras.getState().resetAll();
  useAlarms.setState({ alarms: [] });
  useCountdowns.getState().resetAll();
  useSettings.getState().reset();
  useSleep.setState({ logs: [] });
  usePrayerLog.setState({ done: {} });
}

/** جدول لم يُنشأ بعد في قاعدة البيانات (ترحيل لم يُنفَّذ): نتخطاه بدل إيقاف كل المزامنة */
function isMissingTable(error: { code?: string; message?: string }): boolean {
  return error.code === "PGRST205" || error.code === "42P01" || /could not find the table/i.test(error.message ?? "");
}

async function pull(userId: string, snap: Snap) {
  const pullMap = await readJSON<PullMap>(K.pull(userId), {});

  for (const slice of SLICES) {
    const last = pullMap[slice.table] ?? "1970-01-01T00:00:00Z";
    const rows: { id: string; data: Item; deleted: boolean; updated_at: string }[] = [];
    let missing = false;
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from(slice.table)
        .select("id,data,deleted,updated_at")
        .gte("updated_at", last)
        .order("updated_at", { ascending: true })
        .range(from, from + 999);
      if (error) {
        if (isMissingTable(error)) {
          missing = true;
          break;
        }
        throw error;
      }
      rows.push(...(data as any));
      if (!data || data.length < 1000) break;
    }
    if (missing || !rows.length) continue;

    const local = new Map(slice.get().map((i) => [i.id, i]));
    const tableSnap = (snap[slice.table] ??= {});
    const ups: Item[] = [];
    const rm: string[] = [];

    for (const r of rows) {
      const mine = local.get(r.id);
      const known = tableSnap[r.id];
      // تغيير محلي لم يُرفع بعد يتغلّب على السحابة:
      //  - عنصر معدَّل: يختلف عن آخر نسخة مرفوعة
      //  - عنصر محذوف محليًا: كان مرفوعًا سابقًا (له لقطة) وغاب الآن
      //    (بدون هذا الشرط يعود العنصر المحذوف من السحابة)
      let dirty = mine ? stable(mine) !== known : known !== undefined;
      // الإعدادات في جهاز جديد: القيم الافتراضية المحلية ليست «تعديلًا»، فنأخذ ما في السحابة
      if (slice.singleton && known === undefined) dirty = false;
      if (dirty) continue;
      if (r.deleted) {
        if (mine) rm.push(r.id);
        delete tableSnap[r.id];
      } else {
        const item = { ...r.data, id: r.id };
        if (!mine || stable(mine) !== stable(item)) ups.push(item);
        tableSnap[r.id] = stable(item);
      }
    }
    if (ups.length || rm.length) slice.merge(ups, rm);
    pullMap[slice.table] = rows[rows.length - 1].updated_at;
  }

  await AsyncStorage.setItem(K.pull(userId), JSON.stringify(pullMap));
}

async function push(userId: string, snap: Snap) {
  for (const slice of SLICES) {
    const tableSnap = (snap[slice.table] ??= {});
    const current = new Map(slice.get().map((i) => [i.id, i]));
    const rows: { user_id: string; id: string; data: Item; deleted: boolean }[] = [];
    const newSnap: Record<string, string> = {};

    for (const [id, item] of current) {
      const s = stable(item);
      newSnap[id] = s;
      if (tableSnap[id] !== s) rows.push({ user_id: userId, id, data: item, deleted: false });
    }
    for (const id of Object.keys(tableSnap)) {
      if (!current.has(id)) rows.push({ user_id: userId, id, data: {} as Item, deleted: true });
    }
    if (!rows.length) continue;

    let failed = false;
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await supabase
        .from(slice.table)
        .upsert(rows.slice(i, i + 200), { onConflict: "user_id,id" });
      if (error) {
        if (isMissingTable(error)) {
          failed = true;
          break;
        }
        throw error;
      }
    }
    if (failed) continue;
    snap[slice.table] = newSnap;
  }
}

let running = false;
let again = false;

/** سحب ثم رفع. آمنة للاستدعاء المتكرر. */
export async function syncAll(userId: string): Promise<void> {
  if (running) {
    again = true;
    return;
  }
  running = true;
  try {
    do {
      again = false;
      const snap = await readJSON<Snap>(K.snap(userId), {});
      try {
        await pull(userId, snap);
        await push(userId, snap);
      } finally {
        // نحفظ ما أُنجز حتى لو فشلت مرحلة لاحقة
        await AsyncStorage.setItem(K.snap(userId), JSON.stringify(snap));
      }
    } while (again);
  } finally {
    running = false;
  }
}
