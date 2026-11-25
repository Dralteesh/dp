-- جداول مزامنة إضافية (النوم، سجل الصلاة، تفضيلات القرآن، مدن الطقس). نفس نمط بقية الجداول.
do $$
declare t text;
begin
  foreach t in array array['user_sleep_logs','user_prayer_days','user_quran','user_weather'] loop
    execute format('create table if not exists public.%I (
      user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
      id text not null,
      data jsonb not null,
      deleted boolean not null default false,
      updated_at timestamptz not null default now(),
      primary key (user_id, id)
    )', t);
    execute format('create index if not exists %I on public.%I (user_id, updated_at)', t || '_user_updated_idx', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop trigger if exists %I on public.%I', t || '_touch', t);
    execute format('create trigger %I before insert or update on public.%I for each row execute function public.touch_updated_at()', t || '_touch', t);
    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))', t || '_select_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t || '_insert_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t || '_update_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t || '_delete_own', t);
    execute format('revoke all on table public.%I from anon', t);
  end loop;
end $$;
