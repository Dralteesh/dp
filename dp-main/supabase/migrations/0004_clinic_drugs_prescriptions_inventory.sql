-- دفعة العيادة 1: دليل الأدوية، الوصفات، المخزون، حركات المخزون.
-- نفس نمط جداول العيادة الحالية: (user_id,id) مفتاح، data jsonb، deleted، updated_at يختمه الخادم.
-- لم تُطبَّق بعد على المشروع (بانتظار موافقة المستخدم).

create table if not exists public.clinic_drugs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists clinic_drugs_user_updated_idx on public.clinic_drugs (user_id, updated_at);
alter table public.clinic_drugs enable row level security;
create trigger clinic_drugs_touch before insert or update on public.clinic_drugs
  for each row execute function public.touch_updated_at();
create policy clinic_drugs_select_own on public.clinic_drugs for select to authenticated using (user_id = (select auth.uid()));
create policy clinic_drugs_insert_own on public.clinic_drugs for insert to authenticated with check (user_id = (select auth.uid()));
create policy clinic_drugs_update_own on public.clinic_drugs for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy clinic_drugs_delete_own on public.clinic_drugs for delete to authenticated using (user_id = (select auth.uid()));
revoke all on table public.clinic_drugs from anon;

create table if not exists public.clinic_prescriptions (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists clinic_prescriptions_user_updated_idx on public.clinic_prescriptions (user_id, updated_at);
alter table public.clinic_prescriptions enable row level security;
create trigger clinic_prescriptions_touch before insert or update on public.clinic_prescriptions
  for each row execute function public.touch_updated_at();
create policy clinic_prescriptions_select_own on public.clinic_prescriptions for select to authenticated using (user_id = (select auth.uid()));
create policy clinic_prescriptions_insert_own on public.clinic_prescriptions for insert to authenticated with check (user_id = (select auth.uid()));
create policy clinic_prescriptions_update_own on public.clinic_prescriptions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy clinic_prescriptions_delete_own on public.clinic_prescriptions for delete to authenticated using (user_id = (select auth.uid()));
revoke all on table public.clinic_prescriptions from anon;

create table if not exists public.clinic_inventory (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists clinic_inventory_user_updated_idx on public.clinic_inventory (user_id, updated_at);
alter table public.clinic_inventory enable row level security;
create trigger clinic_inventory_touch before insert or update on public.clinic_inventory
  for each row execute function public.touch_updated_at();
create policy clinic_inventory_select_own on public.clinic_inventory for select to authenticated using (user_id = (select auth.uid()));
create policy clinic_inventory_insert_own on public.clinic_inventory for insert to authenticated with check (user_id = (select auth.uid()));
create policy clinic_inventory_update_own on public.clinic_inventory for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy clinic_inventory_delete_own on public.clinic_inventory for delete to authenticated using (user_id = (select auth.uid()));
revoke all on table public.clinic_inventory from anon;

create table if not exists public.clinic_stock_moves (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists clinic_stock_moves_user_updated_idx on public.clinic_stock_moves (user_id, updated_at);
alter table public.clinic_stock_moves enable row level security;
create trigger clinic_stock_moves_touch before insert or update on public.clinic_stock_moves
  for each row execute function public.touch_updated_at();
create policy clinic_stock_moves_select_own on public.clinic_stock_moves for select to authenticated using (user_id = (select auth.uid()));
create policy clinic_stock_moves_insert_own on public.clinic_stock_moves for insert to authenticated with check (user_id = (select auth.uid()));
create policy clinic_stock_moves_update_own on public.clinic_stock_moves for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy clinic_stock_moves_delete_own on public.clinic_stock_moves for delete to authenticated using (user_id = (select auth.uid()));
revoke all on table public.clinic_stock_moves from anon;

