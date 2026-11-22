-- ملف التقويم، الموافقات، التقسيط، طلبات المخبر. نفس نمط جداول العيادة (دفعة العيادة 5).

create table if not exists public.clinic_ortho_cases (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists clinic_ortho_cases_user_updated_idx on public.clinic_ortho_cases (user_id, updated_at);
alter table public.clinic_ortho_cases enable row level security;
drop trigger if exists clinic_ortho_cases_touch on public.clinic_ortho_cases;
create trigger clinic_ortho_cases_touch before insert or update on public.clinic_ortho_cases
  for each row execute function public.touch_updated_at();
drop policy if exists clinic_ortho_cases_select_own on public.clinic_ortho_cases;
drop policy if exists clinic_ortho_cases_insert_own on public.clinic_ortho_cases;
drop policy if exists clinic_ortho_cases_update_own on public.clinic_ortho_cases;
drop policy if exists clinic_ortho_cases_delete_own on public.clinic_ortho_cases;
create policy clinic_ortho_cases_select_own on public.clinic_ortho_cases for select to authenticated using (user_id = (select auth.uid()));
create policy clinic_ortho_cases_insert_own on public.clinic_ortho_cases for insert to authenticated with check (user_id = (select auth.uid()));
create policy clinic_ortho_cases_update_own on public.clinic_ortho_cases for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy clinic_ortho_cases_delete_own on public.clinic_ortho_cases for delete to authenticated using (user_id = (select auth.uid()));
revoke all on table public.clinic_ortho_cases from anon;

create table if not exists public.clinic_consents (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists clinic_consents_user_updated_idx on public.clinic_consents (user_id, updated_at);
alter table public.clinic_consents enable row level security;
drop trigger if exists clinic_consents_touch on public.clinic_consents;
create trigger clinic_consents_touch before insert or update on public.clinic_consents
  for each row execute function public.touch_updated_at();
drop policy if exists clinic_consents_select_own on public.clinic_consents;
drop policy if exists clinic_consents_insert_own on public.clinic_consents;
drop policy if exists clinic_consents_update_own on public.clinic_consents;
drop policy if exists clinic_consents_delete_own on public.clinic_consents;
create policy clinic_consents_select_own on public.clinic_consents for select to authenticated using (user_id = (select auth.uid()));
create policy clinic_consents_insert_own on public.clinic_consents for insert to authenticated with check (user_id = (select auth.uid()));
create policy clinic_consents_update_own on public.clinic_consents for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy clinic_consents_delete_own on public.clinic_consents for delete to authenticated using (user_id = (select auth.uid()));
revoke all on table public.clinic_consents from anon;

create table if not exists public.clinic_install_plans (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists clinic_install_plans_user_updated_idx on public.clinic_install_plans (user_id, updated_at);
alter table public.clinic_install_plans enable row level security;
drop trigger if exists clinic_install_plans_touch on public.clinic_install_plans;
create trigger clinic_install_plans_touch before insert or update on public.clinic_install_plans
  for each row execute function public.touch_updated_at();
drop policy if exists clinic_install_plans_select_own on public.clinic_install_plans;
drop policy if exists clinic_install_plans_insert_own on public.clinic_install_plans;
drop policy if exists clinic_install_plans_update_own on public.clinic_install_plans;
drop policy if exists clinic_install_plans_delete_own on public.clinic_install_plans;
create policy clinic_install_plans_select_own on public.clinic_install_plans for select to authenticated using (user_id = (select auth.uid()));
create policy clinic_install_plans_insert_own on public.clinic_install_plans for insert to authenticated with check (user_id = (select auth.uid()));
create policy clinic_install_plans_update_own on public.clinic_install_plans for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy clinic_install_plans_delete_own on public.clinic_install_plans for delete to authenticated using (user_id = (select auth.uid()));
revoke all on table public.clinic_install_plans from anon;

create table if not exists public.clinic_lab_orders (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists clinic_lab_orders_user_updated_idx on public.clinic_lab_orders (user_id, updated_at);
alter table public.clinic_lab_orders enable row level security;
drop trigger if exists clinic_lab_orders_touch on public.clinic_lab_orders;
create trigger clinic_lab_orders_touch before insert or update on public.clinic_lab_orders
  for each row execute function public.touch_updated_at();
drop policy if exists clinic_lab_orders_select_own on public.clinic_lab_orders;
drop policy if exists clinic_lab_orders_insert_own on public.clinic_lab_orders;
drop policy if exists clinic_lab_orders_update_own on public.clinic_lab_orders;
drop policy if exists clinic_lab_orders_delete_own on public.clinic_lab_orders;
create policy clinic_lab_orders_select_own on public.clinic_lab_orders for select to authenticated using (user_id = (select auth.uid()));
create policy clinic_lab_orders_insert_own on public.clinic_lab_orders for insert to authenticated with check (user_id = (select auth.uid()));
create policy clinic_lab_orders_update_own on public.clinic_lab_orders for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy clinic_lab_orders_delete_own on public.clinic_lab_orders for delete to authenticated using (user_id = (select auth.uid()));
revoke all on table public.clinic_lab_orders from anon;
