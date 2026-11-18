-- قائمة الأسعار وقائمة الانتظار وسجل التعقيم (دفعة العيادة 4). نفس نمط جداول العيادة.
create table if not exists public.clinic_price_list (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists clinic_price_list_user_updated_idx on public.clinic_price_list (user_id, updated_at);
alter table public.clinic_price_list enable row level security;
create trigger clinic_price_list_touch before insert or update on public.clinic_price_list
  for each row execute function public.touch_updated_at();
create policy clinic_price_list_select_own on public.clinic_price_list for select to authenticated using (user_id = (select auth.uid()));
create policy clinic_price_list_insert_own on public.clinic_price_list for insert to authenticated with check (user_id = (select auth.uid()));
create policy clinic_price_list_update_own on public.clinic_price_list for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy clinic_price_list_delete_own on public.clinic_price_list for delete to authenticated using (user_id = (select auth.uid()));
revoke all on table public.clinic_price_list from anon;

create table if not exists public.clinic_waitlist (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists clinic_waitlist_user_updated_idx on public.clinic_waitlist (user_id, updated_at);
alter table public.clinic_waitlist enable row level security;
create trigger clinic_waitlist_touch before insert or update on public.clinic_waitlist
  for each row execute function public.touch_updated_at();
create policy clinic_waitlist_select_own on public.clinic_waitlist for select to authenticated using (user_id = (select auth.uid()));
create policy clinic_waitlist_insert_own on public.clinic_waitlist for insert to authenticated with check (user_id = (select auth.uid()));
create policy clinic_waitlist_update_own on public.clinic_waitlist for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy clinic_waitlist_delete_own on public.clinic_waitlist for delete to authenticated using (user_id = (select auth.uid()));
revoke all on table public.clinic_waitlist from anon;

create table if not exists public.clinic_sterilization (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists clinic_sterilization_user_updated_idx on public.clinic_sterilization (user_id, updated_at);
alter table public.clinic_sterilization enable row level security;
create trigger clinic_sterilization_touch before insert or update on public.clinic_sterilization
  for each row execute function public.touch_updated_at();
create policy clinic_sterilization_select_own on public.clinic_sterilization for select to authenticated using (user_id = (select auth.uid()));
create policy clinic_sterilization_insert_own on public.clinic_sterilization for insert to authenticated with check (user_id = (select auth.uid()));
create policy clinic_sterilization_update_own on public.clinic_sterilization for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy clinic_sterilization_delete_own on public.clinic_sterilization for delete to authenticated using (user_id = (select auth.uid()));
revoke all on table public.clinic_sterilization from anon;
