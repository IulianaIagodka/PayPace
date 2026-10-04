import type { HouseholdMember } from '../models/types';

/**
 * Find an existing household seat for this phone.
 * Prefer stable deviceId; if the install was wiped (new device id), reclaim by
 * the same display name so a lost phone can rejoin a full 2-person household.
 */
export function findExistingHouseholdMember(
  members: HouseholdMember[],
  deviceId: string,
  displayName: string,
): HouseholdMember | undefined {
  const byDevice = members.find((m) => m.deviceId === deviceId);
  if (byDevice) return byDevice;
  const needle = displayName.trim().toLowerCase();
  if (!needle) return undefined;
  return members.find((m) => m.displayName.trim().toLowerCase() === needle);
}

export const HOUSEHOLD_FULL_RECLAIM_HINT =
  'This shared budget already has two people. If you were one of them, join with the SAME name you used before to reclaim your seat.';
