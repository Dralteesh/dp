-- خطط العلاج (دفعة العيادة 2). نفس نمط جداول العيادة.
create table if not exists public.clinic_treatment_plans (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists clinic_treatment_plans_user_updated_idx on public.clinic_treatment_plans (user_id, updated_at);
alter table public.clinic_treatment_plans enable row level security;
create trigger clinic_treatment_plans_touch before insert or update on public.clinic_treatment_plans
  for each row execute function public.touch_updated_at();
create policy clinic_treatment_plans_select_own on public.clinic_treatment_plans for select to authenticated using (user_id = (select auth.uid()));
create policy clinic_treatment_plans_insert_own on public.clinic_treatment_plans for insert to authenticated with check (user_id = (select auth.uid()));
create policy clinic_treatment_plans_update_own on public.clinic_treatment_plans for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy clinic_treatment_plans_delete_own on public.clinic_treatment_plans for delete to authenticated using (user_id = (select auth.uid()));
revoke all on table public.clinic_treatment_plans from anon;

