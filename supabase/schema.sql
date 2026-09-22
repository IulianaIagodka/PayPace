-- PayPace shared household sync (Supabase)
-- Run in Supabase SQL editor once per project.

create table if not exists public.households (
  id uuid primary key,
  invite_code text not null unique,
  payload jsonb not null,
  revision integer not null default 1,
  updated_at timestamptz not null default now()
);

create index if not exists households_invite_code_idx on public.households (invite_code);

-- Live partner sync. Idempotent if the table is already in the publication.
do $$
begin
  alter publication supabase_realtime add table public.households;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

alter table public.households enable row level security;

-- Invite-code apps use the anon key without user auth for MVP couple sync.
-- Restrict to insert/select/update only (no delete from clients).
drop policy if exists "households_select" on public.households;
drop policy if exists "households_insert" on public.households;
drop policy if exists "households_update" on public.households;

create policy "households_select" on public.households
  for select to anon, authenticated using (true);

create policy "households_insert" on public.households
  for insert to anon, authenticated with check (true);

create policy "households_update" on public.households
  for update to anon, authenticated using (true) with check (true);
