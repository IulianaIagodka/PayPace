/**
 * End-to-end simulation of shared budget between two devices.
 * Run: npm run test:shared
 * (or: node --experimental-strip-types …)
 *
 * Uses an in-memory cloud stand-in for Supabase so CI/agents can verify
 * create → join → concurrent spends → merge → reject 3rd member.
 */

import type {
  DailyExpense,
  Household,
  HouseholdMember,
  PayCycle,
  SharedHouseholdPayload,
} from '../src/models/types.ts';
import { mergeSharedPayloads, toSharedPayload } from '../src/services/householdMerge.ts';
import { generateInviteCode, normalizeInviteCode } from '../src/services/inviteCode.ts';

type DeviceStore = {
  deviceId: string;
  displayName: string;
  localMemberId: string | null;
  household: Household | null;
  cycle: PayCycle;
};

const cloud = new Map<string, SharedHouseholdPayload>(); // by household id
const cloudByCode = new Map<string, string>(); // invite → household id

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`E2E FAIL: ${msg}`);
}

function nowIso(offsetMs = 0): string {
  return new Date(Date.UTC(2026, 8, 20, 10, 0, 0) + offsetMs).toISOString();
}

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(16).slice(2, 10)}`;
}

function emptyCycle(id: string): PayCycle {
  return {
    id,
    schedule: 'monthly',
    startDate: '2026-09-05',
    nextPayday: '2026-09-30',
    currentBalance: 15000,
    expectedPaycheck: 20000,
    savingsGoal: 500,
    emergencyBuffer: 300,
    spendingBuffer: 200,
    bills: [
      {
        id: 'bill-rent',
        name: 'Rent',
        amount: 8000,
        dueDate: '2026-09-28',
        category: 'home',
        isRecurring: true,
        isPaid: false,
        updatedAt: nowIso(),
      },
    ],
    expenses: [],
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function upsertCloud(payload: SharedHouseholdPayload) {
  cloud.set(payload.household.id, structuredClone(payload));
  cloudByCode.set(payload.household.inviteCode, payload.household.id);
}

function fetchByCode(code: string): SharedHouseholdPayload | null {
  const id = cloudByCode.get(normalizeInviteCode(code));
  if (!id) return null;
  const row = cloud.get(id);
  return row ? structuredClone(row) : null;
}

function fetchById(id: string): SharedHouseholdPayload | null {
  const row = cloud.get(id);
  return row ? structuredClone(row) : null;
}

function createHousehold(device: DeviceStore, name: string): void {
  const memberId = newId('mem');
  const household: Household = {
    id: newId('hh'),
    name: 'Our budget',
    inviteCode: generateInviteCode(),
    members: [
      {
        id: memberId,
        displayName: name,
        deviceId: device.deviceId,
        role: 'owner',
        joinedAt: nowIso(),
      },
    ],
    createdAt: nowIso(),
    updatedAt: nowIso(),
    revision: 1,
  };
  device.displayName = name;
  device.localMemberId = memberId;
  device.household = household;
  upsertCloud(
    toSharedPayload({
      household,
      currencyCode: 'UAH',
      cycles: [device.cycle],
    }),
  );
}

function joinHousehold(device: DeviceStore, inviteCode: string, name: string): void {
  const remote = fetchByCode(inviteCode);
  assert(remote, 'invite code must resolve');
  const existing = remote.household.members.find((m) => m.deviceId === device.deviceId);
  assert(
    existing || remote.household.members.length < 2,
    'third person must be rejected',
  );

  let memberId = existing?.id;
  let members: HouseholdMember[] = [...remote.household.members];
  if (!memberId) {
    memberId = newId('mem');
    members.push({
      id: memberId,
      displayName: name,
      deviceId: device.deviceId,
      role: 'partner',
      joinedAt: nowIso(60_000),
    });
  }

  const household: Household = {
    ...remote.household,
    members,
    revision: remote.revision + 1,
    updatedAt: nowIso(60_000),
  };

  device.displayName = name;
  device.localMemberId = memberId;
  device.household = household;
  device.cycle = remote.cycles.find((c) => c.isActive) ?? remote.cycles[0] ?? device.cycle;

  upsertCloud(
    toSharedPayload({
      household,
      currencyCode: 'UAH',
      cycles: [device.cycle],
    }),
  );
}

function addExpense(device: DeviceStore, name: string, amount: number, atMs: number): void {
  assert(device.household && device.localMemberId, 'must be in household');
  const expense: DailyExpense = {
    id: newId('exp'),
    name,
    amount,
    date: '2026-09-20',
    category: 'other',
    memberId: device.localMemberId,
    memberName: device.displayName,
    updatedAt: nowIso(atMs),
  };
  device.cycle = {
    ...device.cycle,
    expenses: [expense, ...device.cycle.expenses],
    updatedAt: nowIso(atMs),
  };
  device.household = {
    ...device.household,
    revision: device.household.revision + 1,
    updatedAt: nowIso(atMs),
  };
  upsertCloud(
    toSharedPayload({
      household: device.household,
      currencyCode: 'UAH',
      cycles: [device.cycle],
    }),
  );
}

/** Pull remote, merge with local, push result — mirrors BudgetContext.syncHouseholdNow */
function syncDevice(device: DeviceStore): void {
  assert(device.household, 'household required');
  const remote = fetchById(device.household.id);
  assert(remote, 'cloud row exists');
  const localPayload = toSharedPayload({
    household: device.household,
    currencyCode: 'UAH',
    cycles: [device.cycle],
  });
  const merged = mergeSharedPayloads(localPayload, remote);
  device.household = merged.household;
  device.cycle = merged.cycles.find((c) => c.isActive) ?? merged.cycles[0];
  upsertCloud(merged);
}

function spentBy(device: DeviceStore, memberName: string): number {
  return device.cycle.expenses
    .filter((e) => e.memberName === memberName)
    .reduce((s, e) => s + e.amount, 0);
}

function run() {
  const ira: DeviceStore = {
    deviceId: 'device-ira',
    displayName: '',
    localMemberId: null,
    household: null,
    cycle: emptyCycle('cycle-ira'),
  };
  const sasha: DeviceStore = {
    deviceId: 'device-sasha',
    displayName: '',
    localMemberId: null,
    household: null,
    cycle: emptyCycle('cycle-sasha-local'),
  };
  const stranger: DeviceStore = {
    deviceId: 'device-other',
    displayName: '',
    localMemberId: null,
    household: null,
    cycle: emptyCycle('cycle-other'),
  };

  // 1) Ira creates household and gets invite code
  createHousehold(ira, 'Ira');
  assert(ira.household?.inviteCode.length === 6, 'invite code length');
  const code = ira.household!.inviteCode;
  console.log('✓ Ira created household', code);

  // 2) Sasha joins with code — inherits rent bill + balance
  joinHousehold(sasha, code, 'Sasha');
  assert(sasha.household?.id === ira.household?.id, 'same household id');
  assert(sasha.household?.members.length === 2, 'two members');
  assert(sasha.cycle.bills.some((b) => b.name === 'Rent'), 'partner inherited bills');
  assert(sasha.cycle.currentBalance === 15000, 'partner inherited balance');
  console.log('✓ Sasha joined and inherited cycle');

  // 3) Concurrent spends on both phones (offline-ish), then sync both ways
  addExpense(ira, 'Молоко', 42, 120_000);
  addExpense(sasha, 'Uber', 120, 180_000);
  // Each pushed their own revision; last cloud write was Sasha's (no Ira milk).
  // Ira syncs first (merge milk + uber), then Sasha syncs.
  syncDevice(ira);
  syncDevice(sasha);
  syncDevice(ira);

  assert(ira.cycle.expenses.length === 2, `Ira sees 2 expenses, got ${ira.cycle.expenses.length}`);
  assert(sasha.cycle.expenses.length === 2, `Sasha sees 2 expenses, got ${sasha.cycle.expenses.length}`);
  assert(spentBy(ira, 'Ira') === 42, 'Ira total');
  assert(spentBy(ira, 'Sasha') === 120, 'Sasha total on Ira phone');
  assert(spentBy(sasha, 'Ira') === 42, 'Ira total on Sasha phone');
  console.log('✓ Concurrent spends merged on both devices');

  // 4) Third phone rejected
  let rejected = false;
  try {
    joinHousehold(stranger, code, 'Other');
  } catch {
    rejected = true;
  }
  assert(rejected, 'third member rejected');
  console.log('✓ Third member rejected');

  // 5) Re-join same device (Sasha reinstall simulation) keeps 2 members
  const sasha2: DeviceStore = {
    deviceId: 'device-sasha',
    displayName: '',
    localMemberId: null,
    household: null,
    cycle: emptyCycle('fresh'),
  };
  joinHousehold(sasha2, code, 'Sasha');
  assert(sasha2.household?.members.length === 2, 'rejoin does not duplicate member');
  console.log('✓ Same device re-join OK');

  // 6) Invite code normalize
  assert(normalizeInviteCode(' ab-c12 ') === 'ABC12', 'normalize invite');
  console.log('✓ Invite normalize OK');

  console.log('\nE2E shared budget: PASS');
}

run();
