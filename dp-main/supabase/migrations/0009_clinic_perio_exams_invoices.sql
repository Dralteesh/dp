-- مخطط اللثة، الفحوصات التشخيصية، الفواتير (دفعة العيادة 6). نفس نمط جداول العيادة.

create table if not exists public.clinic_perio_charts (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists clinic_perio_charts_user_updated_idx on public.clinic_perio_charts (user_id, updated_at);
alter table public.clinic_perio_charts enable row level security;
drop trigger if exists clinic_perio_charts_touch on public.clinic_perio_charts;
create trigger clinic_perio_charts_touch before insert or update on public.clinic_perio_charts
  for each row execute function public.touch_updated_at();
drop policy if exists clinic_perio_charts_select_own on public.clinic_perio_charts;
drop policy if exists clinic_perio_charts_insert_own on public.clinic_perio_charts;
drop policy if exists clinic_perio_charts_update_own on public.clinic_perio_charts;
drop policy if exists clinic_perio_charts_delete_own on public.clinic_perio_charts;
create policy clinic_perio_charts_select_own on public.clinic_perio_charts for select to authenticated using (user_id = (select auth.uid()));
create policy clinic_perio_charts_insert_own on public.clinic_perio_charts for insert to authenticated with check (user_id = (select auth.uid()));
create policy clinic_perio_charts_update_own on public.clinic_perio_charts for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy clinic_perio_charts_delete_own on public.clinic_perio_charts for delete to authenticated using (user_id = (select auth.uid()));
revoke all on table public.clinic_perio_charts from anon;

create table if not exists public.clinic_dental_exams (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists clinic_dental_exams_user_updated_idx on public.clinic_dental_exams (user_id, updated_at);
alter table public.clinic_dental_exams enable row level security;
drop trigger if exists clinic_dental_exams_touch on public.clinic_dental_exams;
create trigger clinic_dental_exams_touch before insert or update on public.clinic_dental_exams
  for each row execute function public.touch_updated_at();
drop policy if exists clinic_dental_exams_select_own on public.clinic_dental_exams;
drop policy if exists clinic_dental_exams_insert_own on public.clinic_dental_exams;
drop policy if exists clinic_dental_exams_update_own on public.clinic_dental_exams;
drop policy if exists clinic_dental_exams_delete_own on public.clinic_dental_exams;
create policy clinic_dental_exams_select_own on public.clinic_dental_exams for select to authenticated using (user_id = (select auth.uid()));
create policy clinic_dental_exams_insert_own on public.clinic_dental_exams for insert to authenticated with check (user_id = (select auth.uid()));
create policy clinic_dental_exams_update_own on public.clinic_dental_exams for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy clinic_dental_exams_delete_own on public.clinic_dental_exams for delete to authenticated using (user_id = (select auth.uid()));
revoke all on table public.clinic_dental_exams from anon;

create table if not exists public.clinic_invoices (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists clinic_invoices_user_updated_idx on public.clinic_invoices (user_id, updated_at);
alter table public.clinic_invoices enable row level security;
drop trigger if exists clinic_invoices_touch on public.clinic_invoices;
create trigger clinic_invoices_touch before insert or update on public.clinic_invoices
  for each row execute function public.touch_updated_at();
drop policy if exists clinic_invoices_select_own on public.clinic_invoices;
drop policy if exists clinic_invoices_insert_own on public.clinic_invoices;
drop policy if exists clinic_invoices_update_own on public.clinic_invoices;
drop policy if exists clinic_invoices_delete_own on public.clinic_invoices;
create policy clinic_invoices_select_own on public.clinic_invoices for select to authenticated using (user_id = (select auth.uid()));
create policy clinic_invoices_insert_own on public.clinic_invoices for insert to authenticated with check (user_id = (select auth.uid()));
create policy clinic_invoices_update_own on public.clinic_invoices for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy clinic_invoices_delete_own on public.clinic_invoices for delete to authenticated using (user_id = (select auth.uid()));
revoke all on table public.clinic_invoices from anon;
