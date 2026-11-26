-- مُعاد بناؤه من قاعدة البيانات الحيّة (مشروع DoctorPlanner) لأن ملفي 0001/0002 الأصليين لم يكونا في المستودع.
-- يحوي: الدوال، المشغّل on_auth_user_created، جدول profiles، جداول المخطّط الأربعة، وجداول العيادة الأربعة الأساسية.
-- آمن للتشغيل أكثر من مرة (idempotent). الجداول اللاحقة في 0003 فما بعد.

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path to '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path to '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before insert or update on public.profiles for each row execute function public.set_updated_at();
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path to '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table if not exists public.planner_events (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists planner_events_user_updated_idx on public.planner_events (user_id, updated_at);
alter table public.planner_events enable row level security;
drop trigger if exists planner_events_set_updated_at on public.planner_events;
create trigger planner_events_set_updated_at before insert or update on public.planner_events for each row execute function public.set_updated_at();
drop policy if exists planner_events_select_own on public.planner_events;
drop policy if exists planner_events_insert_own on public.planner_events;
drop policy if exists planner_events_update_own on public.planner_events;
drop policy if exists planner_events_delete_own on public.planner_events;
create policy planner_events_select_own on public.planner_events for select to authenticated using (user_id = (select auth.uid()));
create policy planner_events_insert_own on public.planner_events for insert to authenticated with check (user_id = (select auth.uid()));
create policy planner_events_update_own on public.planner_events for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy planner_events_delete_own on public.planner_events for delete to authenticated using (user_id = (select auth.uid()));

create table if not exists public.planner_tasks (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists planner_tasks_user_updated_idx on public.planner_tasks (user_id, updated_at);
alter table public.planner_tasks enable row level security;
drop trigger if exists planner_tasks_set_updated_at on public.planner_tasks;
create trigger planner_tasks_set_updated_at before insert or update on public.planner_tasks for each row execute function public.set_updated_at();
drop policy if exists planner_tasks_select_own on public.planner_tasks;
drop policy if exists planner_tasks_insert_own on public.planner_tasks;
drop policy if exists planner_tasks_update_own on public.planner_tasks;
drop policy if exists planner_tasks_delete_own on public.planner_tasks;
create policy planner_tasks_select_own on public.planner_tasks for select to authenticated using (user_id = (select auth.uid()));
create policy planner_tasks_insert_own on public.planner_tasks for insert to authenticated with check (user_id = (select auth.uid()));
create policy planner_tasks_update_own on public.planner_tasks for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy planner_tasks_delete_own on public.planner_tasks for delete to authenticated using (user_id = (select auth.uid()));

create table if not exists public.planner_notes (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists planner_notes_user_updated_idx on public.planner_notes (user_id, updated_at);
alter table public.planner_notes enable row level security;
drop trigger if exists planner_notes_set_updated_at on public.planner_notes;
create trigger planner_notes_set_updated_at before insert or update on public.planner_notes for each row execute function public.set_updated_at();
drop policy if exists planner_notes_select_own on public.planner_notes;
drop policy if exists planner_notes_insert_own on public.planner_notes;
drop policy if exists planner_notes_update_own on public.planner_notes;
drop policy if exists planner_notes_delete_own on public.planner_notes;
create policy planner_notes_select_own on public.planner_notes for select to authenticated using (user_id = (select auth.uid()));
create policy planner_notes_insert_own on public.planner_notes for insert to authenticated with check (user_id = (select auth.uid()));
create policy planner_notes_update_own on public.planner_notes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy planner_notes_delete_own on public.planner_notes for delete to authenticated using (user_id = (select auth.uid()));

create table if not exists public.planner_alarms (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists planner_alarms_user_updated_idx on public.planner_alarms (user_id, updated_at);
alter table public.planner_alarms enable row level security;
drop trigger if exists planner_alarms_set_updated_at on public.planner_alarms;
create trigger planner_alarms_set_updated_at before insert or update on public.planner_alarms for each row execute function public.set_updated_at();
drop policy if exists planner_alarms_select_own on public.planner_alarms;
drop policy if exists planner_alarms_insert_own on public.planner_alarms;
drop policy if exists planner_alarms_update_own on public.planner_alarms;
drop policy if exists planner_alarms_delete_own on public.planner_alarms;
create policy planner_alarms_select_own on public.planner_alarms for select to authenticated using (user_id = (select auth.uid()));
create policy planner_alarms_insert_own on public.planner_alarms for insert to authenticated with check (user_id = (select auth.uid()));
create policy planner_alarms_update_own on public.planner_alarms for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy planner_alarms_delete_own on public.planner_alarms for delete to authenticated using (user_id = (select auth.uid()));

create table if not exists public.clinic_patients (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists clinic_patients_user_updated_idx on public.clinic_patients (user_id, updated_at);
alter table public.clinic_patients enable row level security;
drop trigger if exists clinic_patients_touch on public.clinic_patients;
create trigger clinic_patients_touch before insert or update on public.clinic_patients for each row execute function public.touch_updated_at();
drop policy if exists clinic_patients_select_own on public.clinic_patients;
drop policy if exists clinic_patients_insert_own on public.clinic_patients;
drop policy if exists clinic_patients_update_own on public.clinic_patients;
drop policy if exists clinic_patients_delete_own on public.clinic_patients;
create policy clinic_patients_select_own on public.clinic_patients for select to authenticated using (user_id = (select auth.uid()));
create policy clinic_patients_insert_own on public.clinic_patients for insert to authenticated with check (user_id = (select auth.uid()));
create policy clinic_patients_update_own on public.clinic_patients for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy clinic_patients_delete_own on public.clinic_patients for delete to authenticated using (user_id = (select auth.uid()));

create table if not exists public.clinic_appointments (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists clinic_appointments_user_updated_idx on public.clinic_appointments (user_id, updated_at);
alter table public.clinic_appointments enable row level security;
drop trigger if exists clinic_appointments_touch on public.clinic_appointments;
create trigger clinic_appointments_touch before insert or update on public.clinic_appointments for each row execute function public.touch_updated_at();
drop policy if exists clinic_appointments_select_own on public.clinic_appointments;
drop policy if exists clinic_appointments_insert_own on public.clinic_appointments;
drop policy if exists clinic_appointments_update_own on public.clinic_appointments;
drop policy if exists clinic_appointments_delete_own on public.clinic_appointments;
create policy clinic_appointments_select_own on public.clinic_appointments for select to authenticated using (user_id = (select auth.uid()));
create policy clinic_appointments_insert_own on public.clinic_appointments for insert to authenticated with check (user_id = (select auth.uid()));
create policy clinic_appointments_update_own on public.clinic_appointments for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy clinic_appointments_delete_own on public.clinic_appointments for delete to authenticated using (user_id = (select auth.uid()));

create table if not exists public.clinic_sessions (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists clinic_sessions_user_updated_idx on public.clinic_sessions (user_id, updated_at);
alter table public.clinic_sessions enable row level security;
drop trigger if exists clinic_sessions_touch on public.clinic_sessions;
create trigger clinic_sessions_touch before insert or update on public.clinic_sessions for each row execute function public.touch_updated_at();
drop policy if exists clinic_sessions_select_own on public.clinic_sessions;
drop policy if exists clinic_sessions_insert_own on public.clinic_sessions;
drop policy if exists clinic_sessions_update_own on public.clinic_sessions;
drop policy if exists clinic_sessions_delete_own on public.clinic_sessions;
create policy clinic_sessions_select_own on public.clinic_sessions for select to authenticated using (user_id = (select auth.uid()));
create policy clinic_sessions_insert_own on public.clinic_sessions for insert to authenticated with check (user_id = (select auth.uid()));
create policy clinic_sessions_update_own on public.clinic_sessions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy clinic_sessions_delete_own on public.clinic_sessions for delete to authenticated using (user_id = (select auth.uid()));

create table if not exists public.clinic_payments (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists clinic_payments_user_updated_idx on public.clinic_payments (user_id, updated_at);
alter table public.clinic_payments enable row level security;
drop trigger if exists clinic_payments_touch on public.clinic_payments;
create trigger clinic_payments_touch before insert or update on public.clinic_payments for each row execute function public.touch_updated_at();
drop policy if exists clinic_payments_select_own on public.clinic_payments;
drop policy if exists clinic_payments_insert_own on public.clinic_payments;
drop policy if exists clinic_payments_update_own on public.clinic_payments;
drop policy if exists clinic_payments_delete_own on public.clinic_payments;
create policy clinic_payments_select_own on public.clinic_payments for select to authenticated using (user_id = (select auth.uid()));
create policy clinic_payments_insert_own on public.clinic_payments for insert to authenticated with check (user_id = (select auth.uid()));
create policy clinic_payments_update_own on public.clinic_payments for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy clinic_payments_delete_own on public.clinic_payments for delete to authenticated using (user_id = (select auth.uid()));

revoke all on table public.profiles, public.planner_events, public.planner_tasks, public.planner_notes, public.planner_alarms from anon;
