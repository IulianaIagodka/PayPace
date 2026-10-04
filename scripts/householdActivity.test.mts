/**
 * Shared household activity merge / trim.
 * Run: npm run test:activity
 */
import assert from 'node:assert/strict';
import { buildActivityEvent } from '../src/services/householdActivity.ts';
import {
  ACTIVITY_EVENT_LIMIT,
  mergeActivityEvents,
  mergeSharedPayloads,
  toSharedPayload,
  trimActivityEvents,
} from '../src/services/householdMerge.ts';
import type { Household, PayCycle, SharedHouseholdPayload } from '../src/models/types.ts';

const household: Household = {
  id: 'hh',
  name: 'Ours',
  inviteCode: 'ABC123',
  members: [
    {
      id: 'a',
      displayName: 'Ira',
      deviceId: 'd1',
      role: 'owner',
      joinedAt: '2026-09-01T00:00:00.000Z',
    },
  ],
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  revision: 1,
};

const cycle: PayCycle = {
  id: 'c1',
  schedule: 'monthly',
  startDate: '2026-09-01',
  nextPayday: '2026-09-30',
  currentBalance: 1000,
  expectedPaycheck: 0,
  savingsGoal: 0,
  emergencyBuffer: 0,
  spendingBuffer: 0,
  bills: [],
  expenses: [],
  envelopes: [],
  isActive: true,
  createdAt: '2026-09-01T00:00:00.000Z',
};

const e1 = buildActivityEvent({
  id: 'ev1',
  kind: 'expense_added',
  at: '2026-09-20T10:00:00.000Z',
  memberName: 'Ira',
  summary: 'Ira logged Milk',
});
const e2 = buildActivityEvent({
  id: 'ev2',
  kind: 'balance_changed',
  at: '2026-09-20T11:00:00.000Z',
  memberName: 'Sasha',
  summary: 'Sasha set balance',
});
const e1b = buildActivityEvent({
  id: 'ev1',
  kind: 'expense_added',
  at: '2026-09-20T12:00:00.000Z',
  memberName: 'Ira',
  summary: 'Ira logged Milk (edited stamp)',
});

const merged = mergeActivityEvents([e1], [e2, e1b]);
assert.equal(merged.length, 2);
assert.equal(merged[0]!.id, 'ev1');
assert.equal(merged[0]!.summary.includes('edited'), true);
assert.equal(merged[1]!.id, 'ev2');

const many = Array.from({ length: ACTIVITY_EVENT_LIMIT + 20 }, (_, i) =>
  buildActivityEvent({
    id: `x${i}`,
    kind: 'expense_added',
    at: new Date(Date.UTC(2026, 8, 1, 0, 0, i)).toISOString(),
    summary: `n${i}`,
  }),
);
assert.equal(trimActivityEvents(many).length, ACTIVITY_EVENT_LIMIT);

const local: SharedHouseholdPayload = toSharedPayload({
  household: { ...household, revision: 2 },
  currencyCode: 'UAH',
  cycles: [cycle],
  activityEvents: [e1],
});
const remote: SharedHouseholdPayload = toSharedPayload({
  household: { ...household, revision: 3, updatedAt: '2026-09-20T12:00:00.000Z' },
  currencyCode: 'UAH',
  cycles: [
    {
      ...cycle,
      expenses: [
        {
          id: 'exp-personal',
          name: 'Gift',
          amount: 50,
          date: '2026-09-20',
          scope: 'personal',
          memberId: 'a',
          memberName: 'Ira',
          updatedAt: '2026-09-20T11:00:00.000Z',
        },
      ],
      updatedAt: '2026-09-20T11:00:00.000Z',
    },
  ],
  activityEvents: [e2],
});

const payload = mergeSharedPayloads(local, remote);
assert.equal(payload.activityEvents.length, 2);
assert.equal(payload.cycles[0]!.expenses[0]!.scope, 'personal');

console.log('householdActivity: PASS');
