/**
 * Shared-budget expense filters + pool scope.
 * Run: npm run test:expense-filters
 */
import assert from 'node:assert/strict';
import type { DailyExpense, Household } from '../src/models/types.ts';
import {
  countsTowardSharedPool,
  expenseScopeOf,
  filterExpenses,
  partnerMemberId,
} from '../src/services/expenseFilters.ts';

function expense(partial: Partial<DailyExpense> & Pick<DailyExpense, 'id' | 'name'>): DailyExpense {
  return {
    amount: 10,
    date: '2026-09-20',
    ...partial,
  };
}

const household: Household = {
  id: 'hh',
  name: 'Ours',
  inviteCode: 'ABC123',
  members: [
    {
      id: 'mem-ira',
      displayName: 'Ira',
      deviceId: 'd1',
      role: 'owner',
      joinedAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'mem-sasha',
      displayName: 'Sasha',
      deviceId: 'd2',
      role: 'partner',
      joinedAt: '2026-09-02T00:00:00.000Z',
    },
  ],
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
  revision: 2,
};

const list: DailyExpense[] = [
  expense({ id: '1', name: 'Milk', memberId: 'mem-ira', scope: 'shared', amount: 40 }),
  expense({ id: '2', name: 'Gift', memberId: 'mem-ira', scope: 'personal', amount: 100 }),
  expense({ id: '3', name: 'Uber', memberId: 'mem-sasha', scope: 'shared', amount: 120 }),
  expense({ id: '4', name: 'Legacy', memberId: 'mem-sasha', amount: 15 }),
];

assert.equal(expenseScopeOf(list[1]!), 'personal');
assert.equal(expenseScopeOf(list[3]!), 'shared');
assert.equal(countsTowardSharedPool(list[1]!), false);
assert.equal(countsTowardSharedPool(list[3]!), true);

assert.equal(partnerMemberId(household, 'mem-ira'), 'mem-sasha');
assert.equal(partnerMemberId(household, 'mem-sasha'), 'mem-ira');
assert.equal(partnerMemberId(null, 'mem-ira'), null);

assert.deepEqual(
  filterExpenses(list, { person: 'mine', viewerMemberId: 'mem-ira' }).map((e) => e.id),
  ['1', '2'],
);
assert.deepEqual(
  filterExpenses(list, {
    person: 'partner',
    viewerMemberId: 'mem-ira',
    partnerMemberId: 'mem-sasha',
  }).map((e) => e.id),
  ['3', '4'],
);
assert.deepEqual(
  filterExpenses(list, { scope: 'personal' }).map((e) => e.id),
  ['2'],
);
assert.deepEqual(
  filterExpenses(list, {
    person: 'mine',
    viewerMemberId: 'mem-ira',
    scope: 'shared',
  }).map((e) => e.id),
  ['1'],
);

console.log('expenseFilters: PASS');
