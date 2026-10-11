import type { SharedHouseholdPayload, HouseholdMember } from '../models/types';
import { getAuthenticatedSupabaseClient, requireHouseholdUserId } from './householdAuthClient';

/**
 * Member-scoped cloud transport. Never falls back to the anonymous client.
 * The SQL migration must be applied in staging before enabling this transport.
 */
export async function secureFetchHousehold(id: string): Promise<SharedHouseholdPayload | null> {
  await requireHouseholdUserId();
  const { data, error } = await getAuthenticatedSupabaseClient()
    .from('households')
    .select('payload')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.payload as SharedHouseholdPayload | undefined) ?? null;
}

export async function secureCreateHousehold(payload: SharedHouseholdPayload): Promise<SharedHouseholdPayload> {
  await requireHouseholdUserId();
  const { data, error } = await getAuthenticatedSupabaseClient().rpc('create_household_secure', {
    p_payload: payload,
  });
  if (error) throw new Error(error.message);
  return data as SharedHouseholdPayload;
}

export async function secureJoinHousehold(code: string, member: HouseholdMember): Promise<SharedHouseholdPayload> {
  await requireHouseholdUserId();
  const { data, error } = await getAuthenticatedSupabaseClient().rpc('join_household_secure', {
    p_invite_code: code,
    p_member: member,
  });
  if (error) throw new Error(error.message);
  return data as SharedHouseholdPayload;
}

/** Compare-and-swap prevents a stale phone from overwriting newer cloud data. */
export async function secureUpdateHousehold(
  payload: SharedHouseholdPayload,
  expectedRevision: number,
): Promise<SharedHouseholdPayload> {
  await requireHouseholdUserId();
  const { data, error } = await getAuthenticatedSupabaseClient().rpc('update_household_secure', {
    p_household_id: payload.household.id,
    p_payload: payload,
    p_expected_revision: expectedRevision,
  });
  if (error) throw new Error(error.message);
  return data as SharedHouseholdPayload;
}
