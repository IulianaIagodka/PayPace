-- Staging-only migration aid. Never infer identity from displayName/deviceId.
-- Legacy ownership is NOT cryptographically verifiable from existing data.
-- An operator must independently verify ownership before issuing a binding.
-- Run with service_role credentials on staging only, after taking a backup.
create table if not exists public.household_migration_audit (
  household_id uuid not null,
  user_id uuid not null,
  role text not null check (role in ('owner', 'partner')),
  verified_by text not null,
  verified_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
alter table public.household_migration_audit enable row level security;
revoke all on public.household_migration_audit from anon, authenticated;

create or replace function public.bind_verified_legacy_member(
  p_household_id uuid,
  p_user_id uuid,
  p_role text,
  p_verified_by text
) returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  if p_role not in ('owner', 'partner') or nullif(trim(p_verified_by), '') is null then
    raise exception 'Verified operator and valid role required';
  end if;
  perform 1 from public.households where id = p_household_id for update;
  if not found then raise exception 'Household not found'; end if;
  select count(*) into v_count from public.household_members where household_id = p_household_id;
  if v_count >= 2 and not exists (
    select 1 from public.household_members where household_id = p_household_id and user_id = p_user_id
  ) then raise exception 'Household full'; end if;
  if p_role = 'owner' and exists (
    select 1 from public.household_members
    where household_id = p_household_id and role = 'owner' and user_id <> p_user_id
  ) then raise exception 'Owner already bound'; end if;
  insert into public.household_members(household_id, user_id, role)
  values (p_household_id, p_user_id, p_role)
  on conflict (household_id, user_id) do nothing;
  insert into public.household_migration_audit(household_id, user_id, role, verified_by)
  values (p_household_id, p_user_id, p_role, p_verified_by)
  on conflict (household_id, user_id) do nothing;
end;
$$;
revoke all on function public.bind_verified_legacy_member(uuid,uuid,text,text) from public;
grant execute on function public.bind_verified_legacy_member(uuid,uuid,text,text) to service_role;
