/**
 * Unit tests for Spend-tab day / category grouping.
 * Run: npm run test:spend-group
 */

import type { DailyExpense } from '../src/models/types.ts';
import {
  expenseCategoryKey,
  expenseMatchesSpendFilter,
  filterExpensesForSpend,
  groupExpenses,
  groupExpensesByCategory,
  groupExpensesByDay,
} from '../src/services/spendGrouping.ts';

let passed = 0;

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  passed += 1;
}

function assertEq<T>(actual: T, expected: T, msg: string) {
  if (actual !== expected) {
    throw new Error(
      `FAIL: ${msg} (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`,
    );
  }
  passed += 1;
}

function expense(partial: Partial<DailyExpense> & Pick<DailyExpense, 'id' | 'name' | 'amount' | 'date'>): DailyExpense {
  return {
    category: 'other',
    ...partial,
  };
}

const sample: DailyExpense[] = [
  expense({ id: '1', name: 'Milk', amount: 5, date: '2026-10-03', category: 'groceries' }),
  expense({
    id: '2',
    name: 'Bus',
    amount: 3,
    date: '2026-10-04',
    category: 'transport',
    envelopeKey: 'transport',
  }),
  expense({
    id: '3',
    name: 'Bread',
    amount: 4,
    date: '2026-10-04',
    category: 'groceries',
    envelopeKey: 'groceries',
    updatedAt: '2026-10-04T12:00:00.000Z',
  }),
  expense({
    id: '4',
    name: 'Coffee',
    amount: 6,
    date: '2026-10-02',
    category: 'food',
  }),
];

console.log('\n▸ group by day');
const byDay = groupExpensesByDay(sample);
assertEq(byDay.length, 3, 'three day buckets');
assertEq(byDay[0]!.key, '2026-10-04', 'newest day first');
assertEq(byDay[0]!.items.length, 2, 'two entries on newest day');
assertEq(byDay[0]!.items[0]!.id, '3', 'newer update first within day');
assertEq(byDay[0]!.total, 7, 'day total');
assertEq(groupExpenses(sample, 'day')[0]!.key, '2026-10-04', 'groupExpenses day mode');

console.log('\n▸ group by category');
const byCat = groupExpensesByCategory(sample);
assertEq(byCat.length, 3, 'three category buckets');
assertEq(byCat[0]!.key, 'groceries', 'highest spend category first');
assertEq(byCat[0]!.total, 9, 'groceries total');
assertEq(byCat[1]!.key, 'food', 'food second');
assertEq(byCat[2]!.key, 'transport', 'transport third');
assertEq(groupExpenses(sample, 'category')[0]!.key, 'groceries', 'groupExpenses category mode');

console.log('\n▸ category key + filter');
assertEq(expenseCategoryKey(sample[0]!), 'groceries', 'category fallback key');
assertEq(expenseCategoryKey(sample[1]!), 'transport', 'envelope key preferred');
assert(expenseMatchesSpendFilter(sample[0]!, 'groceries'), 'match by category');
assert(expenseMatchesSpendFilter(sample[2]!, 'groceries'), 'match by envelope');
assert(!expenseMatchesSpendFilter(sample[1]!, 'groceries'), 'reject other category');

const filtered = filterExpensesForSpend(sample, 'groceries');
assertEq(filtered.length, 2, 'filter keeps groceries only');
assert(
  filtered.every((e) => expenseMatchesSpendFilter(e, 'groceries')),
  'all filtered match',
);
assertEq(filterExpensesForSpend(sample, null).length, 4, 'null filter keeps all');

console.log(`\nSpend grouping tests: ${passed} assertions passed`);
console.log('E2E spend grouping: PASS');
