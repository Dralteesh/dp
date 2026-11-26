# ARCHITECTURE — دليل الكود الشامل (للذكاء الاصطناعي وللمطوّرين)

> **اقرأ هذا الملف أولًا** إن كنت أداة ذكاء اصطناعي أو مطوّرًا جديدًا. يشرح ماهية المشروع وهيكله وبياناته وقواعده.
> تفاصيل قسم العيادة في **`ARCHITECTURE-CLINIC.md`**. التعليمات التشغيلية في `AGENTS.md` / `CLAUDE.md`.
> حدّث هذا الملف عند أي تغيير في الهيكل أو المخازن أو الجداول.

## 0) كيف تستعمل هذا الملف مع أداة ذكاء اصطناعي
**ترتيب القراءة المقترح:** هذا الملف ← `ARCHITECTURE-CLINIC.md` (إن كانت المهمة في العيادة) ← `src/types/index.ts` (نموذج البيانات) ← المخزن والشاشة المعنيّان.
**قالب طلب جاهز:**
```
أرفقت مشروع Expo/React Native (DoctorPlanner). اقرأ ARCHITECTURE.md وAGENTS.md أولًا.
المطلوب: <وصف المهمة>. لا تغيّر شكل البيانات المخزَّنة ولا مفاتيح التخزين دون ترحيل.
أعد الملفات المعدّلة كاملة (لا مقاطع)، وحدّث ARCHITECTURE*.md إن تغيّر الهيكل.
```

## 1) ما هذا المشروع
**Dentist Planner / DoctorPlanner** (`app.json`: name «Dentist Planner»، slug `doctor-planner`، حزمة `com.doctorplanner.app`، scheme `doctorplanner`): تطبيق أندرويد شخصي لطبيب أسنان (عربي RTL بالكامل) يجمع في تطبيق واحد:
1. **المخطِّط:** مناوبات وأماكن عمل (مستشفى/فكّ وجه/خاص/شخصي + حتى 8 مخصّصة)، تقويم، مهام، ملاحظات.
2. **العيادة الخاصة:** مرضى، مواعيد، مخطط أسنان، خطط علاج، جلسات، دفعات، مخبر، تقويم، زرع، وصفات، مخزون، تقارير... (انظر ملف العيادة).
3. **العبادة:** مواقيت الصلاة، قبلة، مصحف، أذكار، مسجدي.
4. **الحياة:** منبّه إجباري بمهام (تحدّيات)، نوم، طقس متقدّم، لحظاتي (عدّادات)، مستندات وقارئ PDF، معرفة (ZIM/Kiwix) بلا إنترنت، أماكني، مساعد ذكي بالعربية.
5. **ودجتات أندرويد** وإشعارات ومزامنة سحابية اختيارية ونسخ احتياطي مشفّر.
المستخدم واحد (شخصي)؛ لا حسابات متعددة. كل شيء يعمل **بلا إنترنت** ما عدا الطقس والمزامنة.

## 2) التقنيات والأوامر
- **Expo SDK 54**, React Native 0.81, React 19, **expo-router 6** (ملفات `src/app`), **NativeWind 4** (Tailwind 3), TypeScript, **zustand 5** (مخازن + persist).
- مكتبات أصلية مهمة: `react-native-alarmageddon` (المنبّه الإجباري)، `react-native-android-widget` (الودجتات)، `expo-notifications`, `expo-camera` (تحدّيات المنبّه)، `expo-speech-recognition` (الإملاء)، `expo-secure-store` + `expo-crypto` (التشفير)، `expo-local-authentication` (القفل)، `react-native-webview` (PDF/خرائط/ZIM)، `adhan` (المواقيت)، `pdfjs-dist`، `xlsx`، `mammoth`، `@supabase/supabase-js`.
- الأوامر: `npm start`, `npm run typecheck` (`tsc --noEmit`), `npx expo export --platform android` (فحص الحزمة). `postinstall` يولّد `src/lib/pdfjsInline.ts` (`scripts/gen-pdfjs.js`) وبيانات المصحف `src/data/quran-*.json` (`scripts/gen-quran.js`).
- **CI:** `.github/workflows/build-android.yml` — عند الدفع إلى `main`: يحذف ملفات ميتة قديمة، يثبّت، يتحقق من بيانات المصحف (604 صفحة)، يفحص `expo export`، ثم يبني APK وينشره. لذا **يجب أن يمر `expo export`**.
- لا اختبارات آلية في المستودع؛ الدوال النقية في `src/lib` مصمَّمة لتكون قابلة للاختبار (لا تستورد React ولا المخازن).

## 3) خريطة المجلدات
```
index.ts, app.json, babel.config.js, metro.config.js, tailwind.config.js, global.css   إعدادات
assets/            شعارات، أيقونات التنقل، صور الإجراءات (treatments)، sounds/adhan.mp3
scripts/           gen-pdfjs.js, gen-quran.js
supabase/migrations/   هجرات قاعدة البيانات (انظر §8)
src/
  app/             الشاشات (expo-router): (tabs)/ + شاشات مفردة + clinic/ + planner/ + alarm/ countdowns/ doc/ event/ note/
  components/      مكوّنات حسب الميزة: ui/ clinic/ home/ nav/ alarm/ prayer/ quran/ weather/ sleep/ smart/ countdown/ docs/ calendar/ tasks/ quickadd/ planner/
  store/           مخازن zustand (use*.ts)
  lib/             المنطق (نقي غالبًا) + countdown/ (محرّك العدّادات)
  hooks/           خطّافات React (useNeeds, usePatientTypes, useAgenda, ...)
  types/           index.ts (النموذج الأساسي), extras.ts (إضافات العيادة), countdown.ts
  constants/       ثوابت (أنواع المناوبات/الألوان، إجراءات العيادة، أشكال الأسنان، سمات الصلاة...)
  design/          tokens.ts (نظام التصميم), kit.tsx, planner.ts (ألوان الواجهة الجديدة)
  widgets/         ودجتات أندرويد + widgetData.ts (لقطة بيانات) + updateWidgets.ts
  data/            quran-text/tafsir/tajweed.json (مولَّدة)
  _dormant/        كود احتياطي غير مستخدم (سمات، كتالوج ودجتات) — لا يستورده أحد
```

## 4) دورة حياة التطبيق (`src/app/_layout.tsx`)
1. `setupRTL()` يفرض RTL (أول تشغيل على هاتف غير عربي يحتاج إعادة فتح؛ تظهر رسالة).
2. تُحمَّل الخطوط (Cairo، AmiriQuran) وتُنتظر **ترطيب المخازن** `useHydrated([...])` (`lib/hydration.ts`): planner, clinic, settings, alarms, device, prayerLog, extras, countdowns. لا يُعرض شيء قبل `ready`.
3. بعد الجاهزية: إخفاء الـSplash، **ترحيل العيادة** `runClinicLinkMigration()` (مرة واحدة)، فتح الواجهة المناسبة حسب `settings.uiMode` (`"planner"` الجديدة أو `"classic"`؛ القيمة الافتراضية في `useSettings`)، ومعالجة ضغط الإشعارات.
4. الشجرة: `GestureHandlerRootView > ThemeRoot > [AppSync, CloudSync] > Stack(tabs, ringing) + QuickAddSheet + LockGate`.
   - `ThemeRoot`: يحقن ألوان الأنواع كمتغيرات CSS (`bg-hospital`، `bg-private`...).
   - `AppSync` (بلا واجهة): يعيد جدولة **الإشعارات والمنبّه والودجتات** كلما تغيّرت البيانات أو عاد التطبيق للواجهة.
   - `CloudSync`: المزامنة السحابية (§7). `LockGate`: قفل التطبيق ببصمة/رمز الهاتف (لا يحجب شاشة رنين المنبّه).
   - عرض محتوى مركزي بعرض أقصى (880 كلاسيكي / 1280 للواجهة الجديدة) للشاشات العريضة.
5. التبويبات `(tabs)`: بلا شريط سفلي؛ **الرئيسية مدخل كل الأقسام**: index, clinic, alarms, prayer, weather, documents, calendar. (`focus` و`tasks` ملفات إعادة توجيه قديمة.)

## 5) الشاشات حسب الميزة
**الرئيسية والتقويم:** `(tabs)/index` (بطاقات قابلة للترتيب `useHomeLayout`، خط زمني أسبوعي `WeekTimeline`، بطاقات الصلاة/الطقس/المنبّه/العيادة/المساعد/لحظاتي/المستندات)، `(tabs)/calendar` (شبكة شهر + أسبوع + مهام)، `event/[id]`, `note/[id]`, `notes`, `shifts-bulk` (إنشاء مناوبات متكررة، `lib/shiftPatterns`), `workplaces` (أماكن العمل والألوان), `search` (بحث شامل بكلمات مرادفة), الإضافة السريعة (`components/QuickAddSheet`, `components/quickadd/QuickAddEditor`, `store/useQuickAdd`).
**الواجهة الجديدة (Alteesh Planner):** `app/planner/*` (home, schedule, patients, treatments, money, tools, settings, welcome, clinic, patient/[id]) بألوان `design/planner.ts` وغلاف `components/planner/kit.tsx`. التبديل `lib/ui.ts: switchUi()`. إن كانت مؤرشفة/غير مفعّلة فتحقق من `uiMode`.
**العيادة:** `(tabs)/clinic` + `app/clinic/*` — انظر `ARCHITECTURE-CLINIC.md`.
**المنبّه:** `(tabs)/alarms`, `alarm/[id]`, `ringing` (شاشة الرنين الكاملة), `components/alarm/*` (منتقيات وقت، تحدّيات `ChallengeView`/`CameraChallenges`/`MissionCards`), `lib/alarm.ts` (alarmageddon + استعادة بعد إعادة التشغيل), `lib/alarmChallenge.ts`. مهام الإيقاف: حساب، مشي (خطوات)، باركود/QR، صورة، موقع. ربط بالطقس (تقديم الرنين).
**النوم:** `sleep`, `sleep-track`, `sleep-report` (PDF أسبوعي), `store/useSleep`.
**الصلاة:** `(tabs)/prayer` (مشهد سماء `PrayerScene/WeatherSky`), `prayer-settings`, `prayer-stats`, `reminders-prayer` (تذكير قبل/عند الأذان/تكرار/صمت), `mosque` (إقامة المسجد), `qibla` (حساب محلي `lib/qibla`), `lib/prayer.ts` (adhan + المدينة الحالية `setCity`), `store/usePrayerLog` (سجل الصلوات), أذكار دورية في `useSettings.dhikr`.
**القرآن:** `quran` (مصحف صفحات `components/quran/PageView`, تفسير وتجويد), بيانات `src/data/*.json` مولَّدة ومخزّنة في الكاش في CI, `lib/quran.ts`, `store/useQuranPrefs`.
**الطقس:** `(tabs)/weather` (مصدر Open-Meteo بلا مفتاح `lib/weather.ts`), `weather-map` (Windy), `weather-compare`, `lib/weatherInsights|weatherAlerts|skyWeather|weatherSvg`, `store/useWeather`.
**لحظاتي (عدّادات):** `countdowns/*`, `lib/countdown/*` (محرّك نقي: engine/format/notify/presets/backup مشفّر), `store/useCountdowns`, `components/countdown/*`. `entitlements.ts`: BILLING_ENABLED=false (كل شيء مفتوح).
**المستندات:** `(tabs)/documents`, `doc/[id]`, `components/docs/PdfReader` (pdf.js داخل WebView، يحفظ آخر صفحة/تكبير), `store/useDocs` (ملفات داخل مجلد التطبيق).
**المعرفة وأماكني:** `knowledge`, `knowledge-read` (مكتبة نصية بحث عربي مطبَّع `lib/knowledge`), `zim`, `zim-read` (قارئ ZIM/Kiwix بجافاسكربت `lib/zim.ts`), `places` (أماكن ومسارات `lib/geo`, `usePlaces`).
**المساعد الذكي:** `smart`, `components/smart/*`, `lib/smart.ts` (اقتراحات من بيانات التطبيق كلها، تتجدد كل دقيقة), `smartParse.ts` (محلّل جمل عربية: «غدًا الساعة 5 موعد مع سارة حشوة»), `smartActions/smartRun`, `useSmart` (ما تجاهله المستخدم).
**النظام:** `settings`, `appearance` (ألوان/شعار), `security` (قفل + تشفير النسخ), `account` و`connect` (Supabase Auth/ربط), `income` (دخل).

## 6) المخازن (zustand + persist)
| المخزن | مفتاح التخزين | ما يحفظه | التخزين |
|---|---|---|---|
| `usePlanner` | `dp.planner.v1` | أحداث/مهام/ملاحظات | **مشفّر** |
| `useClinic` | `dp.clinic.v1` | مرضى، مواعيد، خطط، جلسات، دفعات، مصاريف، وصفات... | **مشفّر** |
| `useExtras` | `dp.extras.v1` | قائمة أسعار، انتظار، مخبر، تقويم، تعقيم، موافقات، أقساط، لثة، فحوص، فواتير | **مشفّر** |
| `useSettings` | `dp.settings.v1` | إعدادات: أنواع/أماكن العمل، العملة وسعر الدولار، المدينة، `uiMode`، تذكيرات الصلاة، الأذكار | عادي |
| `useAlarms` | `dp.alarms.v1` | المنبّهات | عادي |
| `useCountdowns` | `dp.countdowns.v1` | العدّادات | عادي |
| `useDevice` | `dp.device.v1` | خاص بالجهاز: القفل وآخر نسخة (لا يُزامَن) | عادي |
| `usePrayerLog` `useQuranPrefs` `useSleep` `useWeather` `useDocs` `usePlaces` `useKnowledge` `useZim` `useSmart` `useHomeLayout` | `dp.prayerlog/quran/sleep/weather/docs/places/knowledge/zim/smart/homelayout.v1` | بيانات كل ميزة | عادي |
| مخازن مؤقتة بلا persist | — | `useQuickAdd`, `useFabRequest`, `useShortcutMenu`, `useClinicTools`, `usePrayerTools`, `useAuth` | ذاكرة |
**قاعدة:** أي بيانات **مرضى أو مواعيد** تمر عبر `secureStorage` (`lib/storage.ts`) لا `AsyncStorage` مباشرة. المفاتيح الخمسة الأساسية معرّفة في `STORAGE_KEYS`.

## 7) الأمان والنسخ والمزامنة
- **تشفير محلي:** `lib/secureStore.ts` (واجهة `secureStateStorage`) + `lib/vault.ts` (seal/open نقي). مفتاح عشوائي 32 بايت في **Android Keystore** (`expo-secure-store`)، القيم تُحفظ `enc1:...`، الكتابات تُجمَّع ~200ms وتُفرَّغ عند الخلفية (`flushSecure`). القيم القديمة غير المشفّرة تُقرأ ثم تُعاد مشفّرة. عند فشل فك التشفير تُحفظ نسخة خام في `<key>.unreadable` ولا يُفقد شيء. `peekSecure` لقراءة بلا آثار (للودجتات).
- **قفل التطبيق:** `components/LockGate` (بصمة/رمز الهاتف).
- **نسخ احتياطي:** `lib/backup.ts` + `lib/backupFormat.ts` (تحقق نقي من الصيغة)؛ تصدير ملف JSON، **مشفّر بكلمة مرور اختيارية** (`lib/cryptoText.ts`: PBKDF2-SHA256 + تشفير موثّق)، ولا يُترك ملف المرضى في الكاش بعد المشاركة. نسخة العدّادات المشفّرة: `lib/countdown/backup.ts`.
- **مزامنة سحابية اختيارية:** `lib/cloudSync.ts` + `components/CloudSync` + `lib/supabase.ts` (مفتاح publishable، الحماية الفعلية بسياسات RLS). كل شريحة (slice) تُرفع صفوفًا `{id, data(jsonb), deleted, updated_at}`؛ عند تعديل محلي وسحابي معًا يُدمج حقلًا بحقل (`lib/syncMerge.ts`). لقطة المزامنة تُقرأ/تُكتب عبر التخزين المشفّر. **حقول جديدة داخل الكائنات تُزامَن تلقائيًا** لأن الصف كائن كامل.
- **استيراد قديم:** `lib/legacyImport.ts` (JSON من برنامج العيادة السابق)، شاشة `clinic/import`.

## 8) قاعدة البيانات (Supabase) — `supabase/migrations`
`0001` (مُعاد بناؤه): `profiles`, `planner_events|tasks|notes|alarms`, `clinic_patients|appointments|sessions|payments`. `0003` سحب صلاحيات anon من جداول العيادة. `0004` أدوية/وصفات/مخزون/حركات. `0005` خطط العلاج. `0006` مصاريف. `0007` قائمة الأسعار/الانتظار/التعقيم. `0008` تقويم/موافقات/أقساط/مخبر. `0009` لثة/فحوص/فواتير. `0010` مزامنة النوم/الصلاة/القرآن/الطقس. `0011` `countdowns`. (لا يوجد `0002` في المجلد.) أي حقل جديد في الكائنات لا يحتاج هجرة لأن البيانات jsonb؛ الهجرة مطلوبة فقط لجدول جديد.

## 9) الودجتات
`src/widgets/*`: Today, Tasks, Clinic, Prayer, Weather, Quran, Alarm, Countdown, CountdownList. سياق الودجت **لا يحمّل متاجر التطبيق**؛ لذلك تُغذّى من لقطة `widgetData.ts` (تقرأ التخزين عبر `peekSecure`) وتُحدَّث بـ`updateWidgets.ts`/`AppSync`. التسجيل في `widget-task-handler.tsx` وإضافة `react-native-android-widget` في `app.json`. إضافة ودجت = مكوّن + تسجيل + لقطة بيانات + إعادة بناء.

## 10) التصميم والاصطلاحات
- **RTL دائمًا.** الأرقام تُعرض لاتينية؛ `lib/format.ts` يحوّل الأرقام العربية. التواريخ نصًا محليًا `YYYY-MM-DD` (`lib/dates.ts`)، والأوقات `HH:mm`؛ لا تستعمل `toISOString` للتواريخ المحلية.
- **ألوان الأنواع:** `constants/shiftTypes.ts` (`TYPE_META`, `applyTypeSettings`) تتبع إعدادات أماكن العمل؛ استدعِ `hooks/useTheme` في أي مكوّن يقرأها. أصناف Tailwind المخصّصة: `bg-hospital`, `bg-private`, `text-private-ink`, `bg-private-soft`... (`tailwind.config.js`).
- **الهوية:** كحلي `#0B4F73`، أزرق `#66ABCF/#0E6FA5`، كريمي `#FFF9C9`، خلفية `#F2F8FC`، حدود 2px وزوايا كبيرة.
- **مكوّنات الواجهة:** `components/ui` (Screen, Card, Chip, Button, Field/FieldRow, Sheet, Text `w="bold|semi"`, EmptyState/SectionHeader, Fab، وSegmented داخل Chip.tsx؛ والمنتقيات DateField/TimeField في `components/pickers.tsx`). استعملها بدل بناء عناصر جديدة.
- **منطق نقي أولًا:** ضع الحسابات في `src/lib` بلا React/مخازن، والواجهة تستدعيها (مثال: `needs.ts`, `periodic.ts`, `clinicLink.ts`).
- لا تستعمل `useSmartPatient` للعرض فقط (ينشئ مواعيد تلقائية)؛ استعمل `usePatientTypes`.

## 11) ملفات قديمة/ميتة (لا تحذفها دون سبب)
- `(tabs)/focus.tsx`, `(tabs)/tasks.tsx`, `docs.tsx`: إعادة توجيه لمسارات قديمة (التحديث بالـzip لا يحذف الملفات، لذلك بقيت).
- `src/_dormant/*`: سمات وكتالوج ودجتات احتياطي غير مفعّل (شرح التفعيل في `_dormant/README.md`).
- CI يحذف: `src/components/focus`, `src/components/forest3d`, `useFocus.ts`, `focusStats.ts`, `(tabs)/docs.tsx`, `MERGE-AR.md`.
- `CHANGES-AR.md` سجل تغييرات بالدفعات؛ `README-AR.md` دليل تشغيل أولي؛ `COUNTDOWNS-AR.md` عن لحظاتي.

## 12) قواعد العمل (مختصر `AGENTS.md`)
- المستودع `Dralteesh/dp`، فرع وحيد `main`. المستخدم يعمل من Termux (`~/dp`) وعنده أمر `up` ينزّل أحدث `dp-main*.zip` من `~/storage/downloads` ويفرده فوق المشروع ثم commit/push. عند الخلاف نسخة المستخدم هي المعتمدة. لا تطلب منه أوامر أخرى ولا لصق توكن.
- **التسليم:** zip كامل يبدأ اسمه بـ`dp-main` والملفات في جذره، لا مقاطع كود يدوية.
- لا تغيّر شكل البيانات المخزَّنة أو مفاتيحها دون ترحيل ونسخة احتياطية (انظر `lib/migrateClinic.ts` نموذجًا).

## 13) معجم المصطلحات
| عربي | في الكود |
|---|---|
| مناوبة/دوام | `PlannerEvent` بنوع (`hospital`/`maxillo`/`private`/`personal`/`w1..w8`) |
| مكان عمل | `WorkplaceConfig` |
| لحظاتي | countdowns |
| منبّه إجباري | alarmageddon + تحدّيات (`AlarmChallenge`) |
| خطة علاج / بند | `TreatmentPlan` / `PlanItem` |
| جلسة | `ClinicSession` (إجراء منجَز بتكلفته) |
| ذمّة/رصيد | `patientBalance` = جلسات − دفعات |
| يحتاجون موعدًا | `lib/needs.ts` |
| متابعة دورية | `lib/periodic.ts` |
| مخبر | `LabOrder` |
| قائمة انتظار | `WaitEntry` |
| الواجهة الجديدة/الكلاسيكية | `uiMode: "planner"` / `"classic"` |
