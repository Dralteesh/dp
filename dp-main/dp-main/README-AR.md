# Dentist Planner — دليل التشغيل

تطبيق أندرويد: React Native + Expo (Expo Router داخل `src/app`) + TypeScript + NativeWind، عربي RTL بالكامل.
التخزين: AsyncStorage (Supabase لاحقًا، الخطوة 8).

## 1) إنشاء المشروع ونسخ الملفات

```bash
npx create-expo-app@latest DoctorPlanner --template blank-typescript
cd DoctorPlanner
```

ثم انسخ من هذه الحزمة فوق المشروع (استبدل عند السؤال):
`app.json` · `babel.config.js` · `metro.config.js` · `tailwind.config.js` · `global.css` · `nativewind-env.d.ts` · `tsconfig.json` · `index.ts` · مجلد `src/`

احذف ملفي القالب `App.tsx` و`index.ts` القديم (استبدله بالجديد) إن وُجدا.

## 2) تعديل package.json

غيّر حقل الدخول إلى:

```json
"main": "index.ts"
```

## 3) تثبيت المكتبات

استعمل `npx expo install` ليختار الإصدار المتوافق مع نسخة Expo لديك:

```bash
# التنقّل والواجهة
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar expo-splash-screen
npx expo install react-native-reanimated react-native-worklets react-native-gesture-handler
npx expo install @expo/vector-icons expo-font @expo-google-fonts/cairo

# NativeWind (الإصدار 4 مع Tailwind 3)
npm install nativewind@^4 tailwindcss@^3.4 --save

# التخزين والحالة
npx expo install @react-native-async-storage/async-storage
npm install zustand

# الصلاة والإشعارات
npm install adhan
npx expo install expo-notifications

# المنبّه الإجباري والودجت (وحدات أصلية)
npm install react-native-alarmageddon react-native-android-widget
```

> إن اشتكى `expo-router` من حقل `main`، فتأكد من الخطوة 2.
> إن لم تجد `react-native-worklets` في نسختك فتجاهله (يلزم مع Reanimated 4 فقط).

## 4) التشغيل

الأقسام التالية تعمل في **Expo Go**: الهيكل، التقويم، المهام والملاحظات، الصلاة (مع الإشعارات المحلية)، العيادة الخاصة، الإعدادات.

```bash
npx expo start
```

أما **المنبّه الإجباري** و**الأدوات المصغرة** فهما وحدتان أصليتان وتحتاجان Development Build:

```bash
npx expo prebuild --platform android
npx expo run:android        # هاتف موصول بـ USB، أو مشغّل Android Emulator
```

أو بناء سحابي (APK):

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --profile development --platform android
```

بعدها شغّل `npx expo start --dev-client`.

## 5) صلاحيات أندرويد

معرّفة في `app.json` تحت `android.permissions`:

| الصلاحية | الاستعمال |
|---|---|
| `POST_NOTIFICATIONS` | إشعارات الصلاة والمواعيد (أندرويد 13+، تُطلب وقت التشغيل) |
| `SCHEDULE_EXACT_ALARM` | جدولة تنبيهات بدقة الدقيقة (أندرويد 12+، قد تحتاج تفعيلًا من إعدادات «المنبّهات والتذكيرات») |
| `USE_EXACT_ALARM` | بديل مخصص لتطبيقات المنبّه/التقويم. **تنبيه:** على Google Play يُقيَّد استعماله، ولا يؤثر على التثبيت المباشر |
| `USE_FULL_SCREEN_INTENT` | إظهار المنبّه فوق شاشة القفل |
| `RECEIVE_BOOT_COMPLETED` | إعادة جدولة المنبّهات بعد إعادة تشغيل الهاتف |
| `VIBRATE` | اهتزاز التنبيهات |
| `WAKE_LOCK` | إيقاظ الشاشة عند رنين المنبّه |

لا يستخدم التطبيق الموقع (حماه ثابتة في الإعدادات)، ولا الإنترنت في هذه المرحلة.

## 6) خطوات ضرورية على Xiaomi / HyperOS

وإلا قد تُقتل التنبيهات في الخلفية:
1. الإعدادات ← التطبيقات ← Dentist Planner ← **التشغيل التلقائي**: مفعّل.
2. توفير البطارية: **بدون قيود**.
3. الإشعارات: فعّل القنوات الثلاث، وسمح بالظهور على شاشة القفل.
4. «المنبّهات والتذكيرات»: السماح.

## 7) الساعة (Xiaomi Watch)

لا كود خاص: إشعارات التطبيق تُنقل للساعة من تطبيق الساعة على الهاتف (Mi Fitness أو Xiaomi Wear حسب طراز الساعة): افتح إعدادات الإشعارات فيه وفعّل DoctorPlanner. التطبيق يرسل عبر قنوات بأولوية عالية. جرّب من: المزيد ← الأدوات المصغرة والساعة ← «إشعار تجريبي».

## 8) هيكل المشروع

```
index.ts                      ملف الدخول (يسجّل معالج الودجت ثم expo-router)
app.json  babel.config.js  metro.config.js  tailwind.config.js  global.css  tsconfig.json
src/
  app/                        الشاشات (Expo Router)
    _layout.tsx               الجذر: RTL، الخط، التحميل، المزامنة، شاشة الرنين
    (tabs)/                   المنبّه • العيادة • الرئيسية • الصلاة • التركيز
    event/[id].tsx            نموذج الدوام/المناوبة/النشاط
    alarms.tsx  ringing.tsx   المنبّه الإجباري وشاشة الرنين
    connect.tsx               الودجت وإشعارات الساعة
    settings.tsx              الإعدادات
    clinic/                   العيادة الخاصة (index, patient/[id], patient-form, appointment-form)
  components/                 المكوّنات (ui/ للأساسيات)
  constants/                  ألوان الأنواع، العربية، كتالوج العيادة
  hooks/  lib/  store/  types/  widgets/
```

## 9) ألوان الأنواع

| النوع | اللون |
|---|---|
| عيادة المشفى | أزرق |
| مناوبة جراحة الوجه والفكين | أصفر |
| العيادة الخاصة | أخضر |
| الأنشطة الشخصية | بنفسجي |

مصدرها الوحيد `src/constants/shiftTypes.ts` و`tailwind.config.js`.

## 10) ملاحظات صادقة

- لم أستطع تشغيل التطبيق أو بناءه في بيئة الكتابة (لا إنترنت لتثبيت الحزم). فحصتُ منطق التواريخ والتقويم بالتشغيل ومراجعة الصياغة، أما الواجهات والوحدات الأصلية فلم تُجرَّب على جهاز. توقّع بعض الأخطاء الصغيرة عند أول تشغيل وأرسلها لي لأصلحها.
- طريقة حساب الصلاة الافتراضية «رابطة العالم الإسلامي». قارن مع تقويم الأوقاف في حماه، واضبط الطريقة أو الدقائق من الإعدادات.
- مكتبة `react-native-alarmageddon` صغيرة وقد تحتاج تعديلًا لتوافق أحدث إصدار من Expo/React Native. إن فشل البناء بسببها أرسل لي رسالة الخطأ.
- إعدادات RTL: على هاتف غير عربي يُطبَّق الاتجاه بعد أول إغلاق وفتح للتطبيق.
- لم تُضف بعد: Supabase وتسجيل الدخول والمستخدمون وتخصيص الألوان/الشعارات (الخطوة 8)، ولا بقية وحدات نظام العيادة القديم (فواتير مفصّلة، مخزون، وصفات، مختبر، تقويم تقويم الأسنان، مساعد ذكي).
