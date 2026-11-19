-- سُحبت صلاحيات الدور anon من جداول العيادة (كانت ممنوحة كاملة بترحيل add_clinic_sync_tables).
-- سياسات RLS تحمي الصفوف أصلًا، وهذا تحصين إضافي. طُبِّق على المشروع في 2026-11-16.
revoke all on table public.clinic_patients, public.clinic_appointments,
  public.clinic_sessions, public.clinic_payments from anon;
