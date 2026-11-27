# ARCHITECTURE-CLINIC — دليل قسم العيادة (للذكاء الاصطناعي وللمطوّرين)

> للصورة العامة للمشروع اقرأ `ARCHITECTURE.md` أولًا، ثم هذا الملف قبل أي تعديل في العيادة. حدّثه مع كل تغيير يمس الأقسام أو نموذج البيانات.

## 1) ما هذا المشروع
- تطبيق **DoctorPlanner (dp)**: Expo / React Native + NativeWind + expo-router، واجهة عربية RTL.
- يجمع **مخطِّط الطبيب** (مناوبات، صلاة، منبّهات، طقس...) و**قسم العيادة** (`/clinic/*` وتبويب `(tabs)/clinic`).
- الحالة في مخازن **zustand** مع persist: بيانات المرضى (العيادة والإضافات والمخطّط) عبر `secureStorage` المشفّر بمفتاح في Keystore (`lib/secureStore.ts`, `lib/vault.ts`)، والباقي AsyncStorage (مفاتيح في `src/lib/storage.ts`). أي بيانات مرضى جديدة يجب أن تمر عبر `secureStorage` لا `AsyncStorage` مباشرة. لا خادم إلزامي؛ المزامنة السحابية اختيارية (`lib/cloudSync.ts`, Supabase).
- هذا الملف يخص **العيادة** فقط.

## 2) الفكرة المركزية: كل شيء مترابط
```
المريض ──< بنود خطة العلاج (PlanItem: سنّ واحد + سعر + dueOn + flow)
   │              ▲                │ عند الإنجاز
   │              │ planItemIds    ▼
   ├──< الموعد (Appointment: teeth, planItemIds, extra) ──► الجلسة (ClinicSession) ──► الرصيد (جلسات − دفعات)
   │                                   │ إنهاء الزيارة (completeVisit)
   │                                   ├──► الدفعة (Payment)
   │                                   ├──► زيارة تقويم (OrthoCase.visits)
   │                                   └──► بند المرحلة التالية (dueOn) ──► «يحتاجون موعدًا»
   └──< قواعد المتابعة الدورية (Patient.followUps) ──► «المتابعة الدورية»
```
القاعدة: **الموعد هو مركز العمل**. تحديد الأسنان في نموذج الموعد يبني بنود الخطة، وإنهاء الزيارة ينجزها ويحاسب ويقترح التالي.

## 3) نموذج البيانات (`src/types/index.ts`, `src/types/extras.ts`)
| النوع | أهم الحقول |
|---|---|
| `Patient` | `id, name, phone, birthYear, status, teeth (حالة كل سن FDI), toothMarks, bridges, dentition, types (يدويًا), alerts, followUps?: FollowUpRule[]` |
| `Appointment` | `patientId, date (YYYY-MM-DD), startTime, durationMin, procedure, status, notes, **planItemIds?**, **teeth?**, **extra?: ApptExtra**, **visitDone?**` |
| `TreatmentPlan` | `patientId, title, items: PlanItem[]` |
| `PlanItem` | `procedure, tooth? (قديم، نص), **teeth?: string[]**, cost, **discount?, discountNote?**, done, sessionId?, **dueOn?**, **flow?: {id, step}**` |
| `Expense` / `InstallPlan` | `Expense.planId?` (مصروف على خطة)، `InstallPlan.treatmentPlanId?` (تقسيط خطة علاج) |
| `ClinicSession` | `patientId, date, procedure, tooth?, cost, notes` — تُنشأ عند إنجاز بند أو إضافة يدوية |
| `Payment` | `patientId, date, amount, foreign? (دولار), note, planId? (الخطة المدفوع لها)` |
| `FollowUpRule` | `id, label, everyDays, matchSource? (regex نصًا), anchor, active` |
| `ApptExtra` | `ortho{work,wire,elastics,nextWeeks}, implant{stage,system,size}, endo{stage,canals}, crowns{stage}, pedo{work}` |
| `extras.ts` | `LabOrder`, `OrthoCase{visits[]}`, `WaitEntry`, `PriceItem` (قائمة الأسعار) وغيرها |

الحقول **الجديدة** (بخط عريض) كلها اختيارية → البيانات القديمة تعمل كما هي. أسنان البند الجديد: **سنّ واحد لكل بند** (لحساب سعره وإنجازه منفردًا). الأسنان بترقيم **FDI** نصًا (`"16"`).

## 4) المخازن (`src/store`)
- `useClinic.ts`: المرضى، المواعيد، الخطط، الجلسات، الدفعات. إجراءات مهمة: `addAppointment` (يُرجع id), `updateAppointment`, `setAppointmentStatus`, `addPlanItem`, **`addPlanItems(patientId, items) → ids`** (يضيف لأحدث خطة أو ينشئ «خطة علاج»), **`patchPlanItem`**, `completePlanItem(planId, itemId, date)` (ينشئ جلسة بتكلفة البند)، `addPayment`, `updatePatient`. الدالة `patientBalance(id, sessions, payments)` تحسب الرصيد.
- `useExtras.ts`: المخبر `labOrders/addLab`، التقويم `orthoCases/saveOrtho`، الانتظار `waitlist/setWaitStatus`، `priceList`.
- `useSettings.ts`: العملة `currency`، سعر الدولار `usdRate`، اسم العيادة.
- `useClinicTools.ts`: قائمة أدوات العيادة المعروضة.

## 5) منطق نقي (بلا React، قابل للاختبار) — `src/lib`
| الملف | الدور |
|---|---|
| `patientType.ts` | اكتشاف نوع المريض (`detectTypes/activeTypes`)، تقويم (`orthoNextVisit`)، زرع (`lastImplantSurgery`: الجراحة فقط)، المخبر (`needsFittingBooking`)، `toggleTypePatch` |
| **`clinicLink.ts`** | `itemTeeth`, `openItems`, `scheduledItemIds`, `priceForProcedure`, `itemsForTeeth`, `findOpenFor`, `planSummary`, `isPlanProcedure` (الكشف/المراجعة لا يُنشئ بندًا) |
| **`workflows.ts`** | مسارات العلاج `FLOWS` (زرع، عصب، تاج، تقويم) و`nextStepAfter(item, doneOn)` ← المرحلة التالية وتاريخها |
| **`needs.ts`** | `computeNeeds(...)` ← «يحتاجون موعدًا» (نافذة 7/14/30 يومًا) |
| **`periodic.ts`** | `dueFollowUps(...)` وقوالب القواعد `RULE_TEMPLATES` و`periodLabel` |
| **`visitFlow.ts`** | `completeVisit(apptId, opts)` و`proposalsFor(...)` — يقرأ المخازن عبر `getState()` |
| **`migrateClinic.ts`** | ترحيل لمرة واحدة بنسخة احتياطية قبله |
| `planWizard.ts`, `autoSlot.ts`, `conflicts.ts`, `currency.ts`, `dates.ts` | معالج خطة العصب، إيجاد وقت فارغ، تعارض المواعيد، العملات، التواريخ |

## 6) الشاشات والمكوّنات
**الشاشات (`src/app`)**
- `(tabs)/clinic.tsx`: لوحة العيادة (جدول اليوم، «يحتاجون موعدًا» أعلى 4، المرضى). زر «تم» يفتح `VisitSheet` إن كان للموعد بنود/إعدادات نوع.
- `clinic/today.tsx` **(جديد)**: شاشة اليوم — وصل ← إنهاء ← دفع، مع الأسنان والتنبيهات والرصيد.
- `clinic/appointment-form.tsx`: **نموذج الموعد (قلب الربط)**: المريض ← `PatientStatusHeader` ← `ApptTypeSettings` ← `ApptTeethSection` ← معاينة «سيُضاف للخطة» ← الوقت/الإجراء. عند الحفظ: ينشئ بنود الخطة (سنّ لكل بند، السعر من قائمة الأسعار، دون تكرار بند مفتوح مطابق)، ويربطها بالموعد، ويحذّر من تعارض الوقت وتركيب تاج قبل وصول المخبر. حالة خاصة: إجراء عصب بلا خطة عصب ← يعمل معالج `PlanWizard` ثم يُربط الموعد ببند العصب.
- `clinic/waitlist.tsx`: تبويب «يحتاجون موعدًا» (`useNeeds`) + «منتهية».
- `clinic/followups.tsx`: تبويبات «متابعة دورية» (المستحقة/كل القواعد/اقتراحات)، «تذكير»، «استدعاء».
- `clinic/plan.tsx`: الخطة؛ إضافة بند باختيار الأسنان من المخطط (بند لكل سن)، زر حجز لكل بند.
- `clinic/patient/[id].tsx`: ملف المريض؛ `PatientStatusHeader` وزر «احجز موعدًا لبنود الخطة».
- الباقي: `ortho`, `lab`, `prices`, `invoices`, `installments`, `perio`, `exams`, `consents`, `inventory`, `expenses`, `reports`, `insights`, `sterilization`, `drugs`, `prescription-form`, `patient-form`, `patient-docs`, `procedures`, `import`.

**المكوّنات (`src/components/clinic`)**: `ApptTeethSection` (مخطط + تحديد متعدد + ربط بنود)، `ApptTypeSettings` (أنواع المريض + إعدادات تقويم/زرع/عصب/تيجان/أطفال)، `VisitSheet` (إنهاء الزيارة)، `PatientStatusHeader` (الحالة الآن)، `NeedsList`, `DaySchedule`, `PatientTypePanel`, `PlanWizard`, `ToothPanel`, `MedicalAlertBar`, `ClinicToolsSheet`...
`src/components/Odontogram.tsx`: مخطط الأسنان؛ الخاصية الجديدة `highlight?: string[]` لتحديد متعدد.
**Hooks**: `usePatientTypes` (أنواع بلا آثار جانبية)، `useNeeds(windowDays)`، `useSmartPatient` (⚠ ينشئ مواعيد تلقائية — لا تستعمله في العرض فقط).

## 7) المسارات الرئيسية (Flows)
1. **حجز موعد** (`appointment-form`): المريض ← ١. المخطط (تحديد الأسنان) ← ٢. نوع الإجراء ← ٣. خطة العلاج والتكلفة (`ApptPlanSection`: تكلفة كل سن تُعدَّل يدويًا وإلا من قائمة الأسعار، اختيار الخطة المستهدفة أو «خطة جديدة»، ربط البنود المفتوحة) ← التاريخ والوقت ← (اختياري) دفعة مقدّمة تُسجَّل بـ`planId` ← حفظ ← تُنشأ البنود وتُربط (`planItemIds`, `teeth`).
2. **إنهاء الزيارة** `completeVisit`: (1) `completePlanItem` لكل بند محدد ← جلسة بتكلفته. (2) زيارة تقويم في `OrthoCase.visits` إن وُجد `extra.ortho.work`. (3) جلسة بتكلفة 0 إن لم تُنجَز بنود وكان هناك `extra` (ليلتقطها كشف الأنواع). (4) دفعة إن أُدخل مبلغ. (5) بنود المرحلة التالية بـ`dueOn` عبر `nextStepAfter`. (6) الموعد `status: "done"` و`visitDone: true`.
3. **يحتاجون موعدًا** `computeNeeds`: بنود مفتوحة (بلا موعد مجدول يغطيها؛ `dueOn` ضمن النافذة أو بلا تاريخ) + تقويم مستحق بلا موعد + مخبر وصل بلا حجز تركيب + إدخالات الانتظار اليدوية. مرتّبة بالأعجل.
4. **المتابعة الدورية**: `Patient.followUps`؛ المستحق = آخر زيارة مطابقة (`matchSource` أو أي زيارة) + `everyDays`. التأجيل يرفع `anchor`.
5. **المراحل**: عند إنجاز بند يطابق مرحلة (بالاسم أو `flow`) يُقترح بند المرحلة التالية بتاريخ مستهدف، ويقبله المستخدم في `VisitSheet`.

## 8) قواعد العمل المهمة
- الرصيد = مجموع كلف الجلسات − الدفعات. لا يُحتسب بند خطة قبل إنجازه.
- بند لكل سن؛ لا تكرّر بندًا مفتوحًا لنفس (الإجراء، السن).
- `isPlanProcedure`: «كشف/استشارة/مراجعة/متابعة/فحص/تنظيف» لا تُنشئ بند خطة.
- `lastImplantSurgery` يتجاهل مراحل (تركيب/طبعة/اندماج/متابعة/كشف/تاج/دعامة) حتى لا تتكرر المتابعات التلقائية.
- المواعيد التلقائية (زرع/تقويم) تأتي من `useSmartPatient` + `patientType.ts` (وسم `[auto:...]` في الملاحظات).
- ألا تُغيَّر مفاتيح التخزين أو شكل البيانات القديمة دون ترحيل ونسخة احتياطية.

## 9) الترحيل والنسخ الاحتياطي
- `migrateClinic.ts` يعمل عند الإقلاع (من `app/_layout.tsx`) مرة واحدة: ينسخ بيانات العيادة إلى المفتاح `dp.clinic.backup.pre-link` **عبر التخزين المشفّر** (`lib/secureStore.ts`) **أولًا** ويتحقق من تطابقها (إن فشلت النسخة لا يرحّل)، ثم يملأ `teeth[]` من `tooth` النصّي. علامة الإنجاز: `dp.clinic.link-migration.v1`.
- النسخ الاحتياطي العام: `lib/backup.ts`, `lib/backupFormat.ts` (الحقول الجديدة داخل المرضى/الخطط/المواعيد فتُحفظ تلقائيًا).

## 10) أوامر وملاحظات
- التحقق: `npx tsc --noEmit` ثم `npx expo export --platform android` (الدفع إلى `main` يبني APK عبر GitHub Actions).
- اختبار المنطق النقي: ملفات `lib/clinicLink|workflows|needs|periodic` لا تستورد React أو المخازن.
- أفكار لاحقة: ربط مواعيد قديمة ببنودها، تكرار متابعة تلقائي بعد الإنهاء، حالة «بدأ» للموعد.

## 11) مالية خطط العلاج (`src/lib/planFinance.ts` — نقي)
- **الصافي** `itemNet = cost − discount`؛ إنجاز البند ينشئ جلسة بالصافي (فيبقى `patientBalance` صحيحًا).
- **توزيع الدفعات** `patientPlanFinance(plans, payments, expenses, patientId)`: دفعات `planId` تخص خطتها؛ الدفعات العامة (بلا خطة) توزَّع على الخطط من الأقدم؛ ثم تُوزَّع دفعة كل خطة على بنودها بالترتيب ← حالة كل بند `paid|partial|unpaid`، المتبقي، مصاريف الخطة والربح (`مدفوع − مصاريف`).
- `distributeDiscount`: خصم نسبة/مبلغ على بنود الخطة غير المنجزة بالتناسب.
- **الواجهة**: `clinic/plan.tsx` (حساب المريض، دفعة/خصم/مصروف/تقسيط/فاتورة لكل خطة، حالة دفع كل بند، تذكير واتساب)، `VisitSheet` (اقتراح كلفة الزيارة/متبقي الخطة وتسجيل الدفعة على الخطة عبر `completeVisit.paymentPlanId`)، `usePlanDebts` (قائمة «خطط العلاج (المتبقي)» في المالية بالواجهتين)، `useDebts` (شارة «عليه X» في بطاقة الخط الزمني)، `PatientStatusHeader` (واتساب)، `installments`/`invoices` تستقبل `planId` من شاشة الخطة، `reports` (متوسط ونسبة كل إجراء).

## 12) أدوات مالية إضافية
- **تعديل الدفعة/الذمة** `EditMoneySheet` (المبلغ، التاريخ، الملاحظة، الخطة، حذف، إيصال PDF) من ملف المريض والخطة والمالية؛ متجر: `updatePayment`/`updateSession`.
- **إيصال** `receiptHtml` + `lib/receipt.ts#shareReceipt`؛ خيار «إرسال إيصال بعد الحفظ» في `MoneyAddSheet`. **كشف الحساب** `statementHtml(..., plans?)` يطبع الخطط والخصومات وحالة الدفع.
- **ربط الدفعات القديمة** `clinic/link-payments` (اقتراح أحدث خطة قبل تاريخ الدفعة). **الإغلاق اليومي** `clinic/daily-close`.
- **تنبيهات الذمم** (`notifications.ts`): نص تذكير الموعد يتضمن الذمة + تنبيه `debt-<apptId>` الساعة 9 صباح اليوم السابق (`AppSync` يعيد الجدولة عند تغيّر الجلسات/الدفعات).
- **الحزم** `TreatmentPackage` في `useExtras.packages` (تُنسخ احتياطيًا): تُنشأ من الأسعار وتُضاف من الخطة؛ الفرق عن مجموع أسعار القائمة يُوزَّع خصمًا بالتناسب (`discountNote = حزمة: ...`).
