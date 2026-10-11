-- Apply only after the full auth migration and verified ownership backfill.
-- Depends on 20261011_household_members_rls.sql.
-- SECURITY DEFINER functions have a fixed search_path and explicit auth checks.

create or replace function public.create_household_secure(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_code text;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  v_id := (p_payload #>> '{household,id}')::uuid;
  v_code := upper(trim(p_payload #>> '{household,inviteCode}'));
  if v_id is null or length(v_code) < 8 or length(v_code) > 64 then
    raise exception 'Invalid household';
  end if;
  if jsonb_typeof(p_payload #> '{household,members}') is distinct from 'array' then
    raise exception 'Invalid members';
  end if;
  if jsonb_array_length(p_payload #> '{household,members}') <> 1 then
    raise exception 'A new household must have one owner';
  end if;
  if p_payload #>> '{household,members,0,role}' <> 'owner' then
    raise exception 'Invalid owner role';
  end if;
  insert into public.households(id, invite_code, payload, revision, updated_at)
  values (v_id, v_code, p_payload, 1, now());
  insert into public.household_members(household_id, user_id, role)
  values (v_id, v_user, 'owner');
  return p_payload;
end;
$$;

create or replace function public.join_household_secure(p_invite_code text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_row public.households%rowtype;
  v_count integer;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  select * into v_row from public.households
  where invite_code = upper(trim(p_invite_code)) for update;
  if not found then raise exception 'Invalid invite code'; end if;
  if exists (select 1 from public.household_members
             where household_id = v_row.id and user_id = v_user) then
    return v_row.payload;
  end if;
  select count(*) into v_count from public.household_members
  where household_id = v_row.id;
  if v_count >= 2 then raise exception 'Household already has two members'; end if;
  -- Do not return household data until the caller is a member.
  insert into public.household_members(household_id, user_id, role)
  values(v_row.id, v_user, 'partner');
  return v_row.payload;
end;
$$;

revoke all on function public.create_household_secure(jsonb) from public;
revoke all on function public.join_household_secure(text) from public;
grant execute on function public.create_household_secure(jsonb) to authenticated;
grant execute on function public.join_household_secure(text) to authenticated;

-- Secure updates preserve the server-controlled membership list and invite code.
-- Clients cannot change identities/roles via arbitrary JSON updates.
create or replace function public.update_household_secure(
  p_household_id uuid,
  p_payload jsonb,
  p_expected_revision integer
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_row public.households%rowtype;
  v_payload jsonb;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  select * into v_row from public.households where id = p_household_id for update;
  if not found or not public.is_household_member(p_household_id) then
    raise exception 'Household not found or access denied' using errcode = '42501';
  end if;
  if v_row.revision <> p_expected_revision then
    raise exception 'Stale household revision' using errcode = '40001';
  end if;
  if p_payload #>> '{household,id}' is distinct from p_household_id::text then
    raise exception 'Household ID mismatch';
  end if;
  -- Preserve membership and invite data from the server. Never trust client metadata.
  v_payload := jsonb_set(p_payload, '{household,members}', v_row.payload #> '{household,members}');
  v_payload := jsonb_set(v_payload, '{household,inviteCode}', v_row.payload #> '{household,inviteCode}');
  v_payload := jsonb_set(v_payload, '{household,revision}', to_jsonb(v_row.revision + 1));
  v_payload := jsonb_set(v_payload, '{revision}', to_jsonb(v_row.revision + 1));
  update public.households set
    payload = v_payload,
    revision = v_row.revision + 1,
    updated_at = now()
  where id = p_household_id;
  return v_payload;
end;
$$;
revoke all on function public.update_household_secure(uuid,jsonb,integer) from public;
grant execute on function public.update_household_secure(uuid,jsonb,integer) to authenticated;
