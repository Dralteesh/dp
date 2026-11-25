-- العدّادات (لحظاتي). نفس نمط بقية الجداول: data jsonb + deleted + updated_at يضبطه الخادم.
create table if not exists public.countdowns (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists countdowns_user_updated_idx on public.countdowns (user_id, updated_at);
alter table public.countdowns enable row level security;
create trigger countdowns_touch before insert or update on public.countdowns
  for each row execute function public.touch_updated_at();
create policy countdowns_select_own on public.countdowns for select to authenticated using (user_id = (select auth.uid()));
create policy countdowns_insert_own on public.countdowns for insert to authenticated with check (user_id = (select auth.uid()));
create policy countdowns_update_own on public.countdowns for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy countdowns_delete_own on public.countdowns for delete to authenticated using (user_id = (select auth.uid()));
revoke all on table public.countdowns from anon;
