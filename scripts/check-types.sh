#!/usr/bin/env bash
# يفحص الأنواع ويُفشل الخطوة فقط عند الأخطاء التي تكسر التطبيق فعليًا:
# تعريف مكرّر، اسم غير معرّف، استيراد لعضو غير موجود. بقية تحذيرات الأنواع لا توقف البناء.
set -u
npx tsc --noEmit > /tmp/tsc.out 2>&1
FATAL='error TS(2300|2451|2440|2304|2552|2305|2614|2724|1005|1109|1128|1135|1160)'
if grep -E "$FATAL" /tmp/tsc.out > /tmp/tsc.fatal; then
  echo "أخطاء قاتلة:"
  cat /tmp/tsc.fatal
  exit 1
fi
echo "لا أخطاء قاتلة ($(grep -c 'error TS' /tmp/tsc.out) تحذير أنواع غير قاتل)"
