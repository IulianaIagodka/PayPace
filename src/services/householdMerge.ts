import type { Bill, DailyExpense, Household, PayCycle, SharedHouseholdPayload, CustomCategory } from '../models/types';

function byId<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function newerIso(a?: string, b?: string): string {
  if (!a) return b ?? new Date().toISOString();
  if (!b) return a;
  return a > b ? a : b;
}

function mergeById<T extends { id: string; updatedAt?: string }>(local: T[], remote: T[]): T[] {
  const map = byId(local);
  for (const item of remote) {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
      continue;
    }
    const localTs = existing.updatedAt ?? '';
    const remoteTs = item.updatedAt ?? '';
    map.set(item.id, remoteTs >= localTs ? item : existing);
  }
  return Array.from(map.values());
}

export function mergeHouseholdMembers(local: Household, remote: Household): Household['members'] {
  const map = new Map(local.members.map((m) => [m.id, m]));
  for (const member of remote.members) {
    if (!map.has(member.id)) map.set(member.id, member);
    else {
      // Prefer non-empty display name updates from either side by join time
      const existing = map.get(member.id)!;
      if (member.joinedAt >= existing.joinedAt) map.set(member.id, member);
    }
  }
  // Also merge by deviceId to avoid duplicates if same device re-joined
  const byDevice = new Map<string, (typeof local.members)[0]>();
  for (const member of map.values()) {
    const prev = byDevice.get(member.deviceId);
    if (!prev || member.joinedAt >= prev.joinedAt) byDevice.set(member.deviceId, member);
  }
  return Array.from(byDevice.values()).sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
}

export function mergePayCycles(localCycles: PayCycle[], remoteCycles: PayCycle[]): PayCycle[] {
  const map = byId(localCycles);
  for (const remote of remoteCycles) {
    const local = map.get(remote.id);
    if (!local) {
      map.set(remote.id, remote);
      continue;
    }
    const localTs = local.updatedAt ?? local.createdAt;
    const remoteTs = remote.updatedAt ?? remote.createdAt;
    const preferRemoteMeta = remoteTs >= localTs;
    const base = preferRemoteMeta ? remote : local;
    const other = preferRemoteMeta ? local : remote;
    const todayKey = new Date().toISOString().slice(0, 10);
    const dayPaceLock =
      base.dayPaceLock?.date === todayKey
        ? base.dayPaceLock
        : other.dayPaceLock?.date === todayKey
          ? other.dayPaceLock
          : (base.dayPaceLock ?? other.dayPaceLock);
    map.set(remote.id, {
      ...other,
      ...base,
      dayPaceLock,
      bills: mergeById(local.bills, remote.bills) as Bill[],
      expenses: mergeById(local.expenses, remote.expenses)
        .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)) as DailyExpense[],
      isActive: local.isActive || remote.isActive,
      updatedAt: newerIso(local.updatedAt, remote.updatedAt),
    });
  }
  // Ensure only one active cycle preference: keep local active if set
  const cycles = Array.from(map.values());
  const active = cycles.find((c) => c.isActive);
  if (active) {
    return cycles.map((c) => ({ ...c, isActive: c.id === active.id }));
  }
  return cycles;
}

/** Merge local + remote shared payloads. Higher revision wins for household meta; ledger merges by id. */
export function mergeSharedPayloads(
  local: SharedHouseholdPayload,
  remote: SharedHouseholdPayload,
): SharedHouseholdPayload {
  const preferRemoteMeta = remote.revision > local.revision
    || (remote.revision === local.revision && remote.updatedAt >= local.updatedAt);

  const householdBase = preferRemoteMeta ? remote.household : local.household;
  const householdOther = preferRemoteMeta ? local.household : remote.household;

  const members = mergeHouseholdMembers(local.household, remote.household);
  const revision = Math.max(local.revision, remote.revision);
  const updatedAt = newerIso(local.updatedAt, remote.updatedAt);

  return {
    household: {
      ...householdOther,
      ...householdBase,
      members,
      revision,
      updatedAt,
      inviteCode: householdBase.inviteCode || householdOther.inviteCode,
    },
    settings: {
      currencyCode: preferRemoteMeta
        ? remote.settings.currencyCode
        : local.settings.currencyCode,
      customCategories: mergeCustomCategories(
        local.settings.customCategories,
        remote.settings.customCategories,
      ),
    },
    cycles: mergePayCycles(local.cycles, remote.cycles),
    revision,
    updatedAt,
  };
}

function mergeCustomCategories(
  local: CustomCategory[] | undefined,
  remote: CustomCategory[] | undefined,
): CustomCategory[] {
  const map = new Map<string, CustomCategory>();
  for (const item of local ?? []) map.set(item.id, item);
  for (const item of remote ?? []) {
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return Array.from(map.values());
}

export function toSharedPayload(input: {
  household: Household;
  currencyCode: string;
  cycles: PayCycle[];
  customCategories?: CustomCategory[];
}): SharedHouseholdPayload {
  const updatedAt = new Date().toISOString();
  return {
    household: { ...input.household, updatedAt, revision: input.household.revision },
    settings: {
      currencyCode: input.currencyCode,
      customCategories: input.customCategories ?? [],
    },
    cycles: input.cycles.map((c) => ({ ...c, updatedAt: c.updatedAt ?? updatedAt })),
    revision: input.household.revision,
    updatedAt,
  };
}
