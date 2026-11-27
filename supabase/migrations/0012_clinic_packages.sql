-- حزم العلاج (سعر واحد لعدة إجراءات). نفس نمط جداول العيادة. إن لم يُنفَّذ هذا الملف يتخطى التطبيق الجدول دون أن تتعطل المزامنة.

create table if not exists public.clinic_packages (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists clinic_packages_user_updated_idx on public.clinic_packages (user_id, updated_at);
alter table public.clinic_packages enable row level security;
drop trigger if exists clinic_packages_touch on public.clinic_packages;
create trigger clinic_packages_touch before insert or update on public.clinic_packages
  for each row execute function public.touch_updated_at();
drop policy if exists clinic_packages_select_own on public.clinic_packages;
drop policy if exists clinic_packages_insert_own on public.clinic_packages;
drop policy if exists clinic_packages_update_own on public.clinic_packages;
drop policy if exists clinic_packages_delete_own on public.clinic_packages;
create policy clinic_packages_select_own on public.clinic_packages for select to authenticated using (user_id = (select auth.uid()));
create policy clinic_packages_insert_own on public.clinic_packages for insert to authenticated with check (user_id = (select auth.uid()));
create policy clinic_packages_update_own on public.clinic_packages for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy clinic_packages_delete_own on public.clinic_packages for delete to authenticated using (user_id = (select auth.uid()));
revoke all on table public.clinic_packages from anon;

