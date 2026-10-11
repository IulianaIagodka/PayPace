-- PayPace: staged security migration. DO NOT run until mobile clients use Supabase Auth.
-- Existing anonymous clients will lose cloud access when this migration is applied.
begin;

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'partner')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index if not exists household_members_user_idx on public.household_members(user_id);
alter table public.household_members enable row level security;

-- SECURITY DEFINER membership check avoids recursive RLS evaluation.
create or replace function public.is_household_member(p_household_id uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = p_household_id and m.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_household_member(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated;

drop policy if exists "household_members_read" on public.household_members;
create policy "household_members_read" on public.household_members
  for select to authenticated using (public.is_household_member(household_id));

-- No direct membership writes. Server-side RPCs must enforce invite and seat limits.
revoke insert, update, delete on public.household_members from anon, authenticated;

drop policy if exists "households_select" on public.households;
drop policy if exists "households_insert" on public.households;
drop policy if exists "households_update" on public.households;
drop policy if exists "households_member_read" on public.households;
drop policy if exists "households_member_update" on public.households;

create policy "households_member_read" on public.households
  for select to authenticated using (public.is_household_member(id));
create policy "households_member_update" on public.households
  for update to authenticated
  using (public.is_household_member(id))
  with check (public.is_household_member(id));

-- Clients must create households through an authenticated RPC (not direct INSERT).
-- Do not grant direct inserts: membership must be established atomically.
revoke all on public.households from anon;
revoke insert, delete on public.households from authenticated;

commit;
