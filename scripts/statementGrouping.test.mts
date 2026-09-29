/**
 * Statement import grouping by date / category.
 * Run: npm run test:statement-group
 */
import { guessCategory } from '../src/services/categories.ts';
import {
  groupByDate,
  hasItemsOutsideWindow,
  sortStatementItems,
  summarizeByCategory,
} from '../src/services/statementGrouping.ts';

let passed = 0;

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  passed += 1;
}

function assertEq(actual: unknown, expected: unknown, msg: string) {
  if (actual !== expected) {
    throw new Error(`FAIL: ${msg} (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`);
  }
  passed += 1;
}

assertEq(guessCategory('SHELL 18'), 'transport', 'shell → transport');
assertEq(guessCategory('EUROSPAR'), 'groceries', 'eurospar → groceries');
assertEq(guessCategory('MCDONALDS 56'), 'food', 'mcdonalds → food');
assertEq(guessCategory('LASERVILLE 01'), 'health', 'laserville → health');
assertEq(guessCategory('AIRO PARK ROZRYWKI'), 'fun', 'airo → fun');
assertEq(guessCategory('HM PL0155'), 'shopping', 'hm → shopping');
assertEq(guessCategory('TK Maxx'), 'shopping', 'tk maxx → shopping');
assertEq(guessCategory('UBR* PENDING.UBER.C'), 'transport', 'uber → transport');
assertEq(guessCategory('APPLE.COM'), 'subscriptions', 'apple.com → subscriptions');
assertEq(guessCategory('CLOUDFLARE'), 'subscriptions', 'cloudflare → subscriptions');

const items = [
  { id: '1', name: 'A', amount: 10, date: '2026-09-25', category: 'food' as const },
  { id: '2', name: 'B', amount: 20, date: '2026-09-26', category: 'transport' as const },
  { id: '3', name: 'C', amount: 5, date: '2026-09-25', category: 'food' as const },
];

const sorted = sortStatementItems(items);
assertEq(sorted[0]!.date, '2026-09-26', 'newest day first');

const cats = summarizeByCategory(items);
assertEq(cats[0]!.category, 'transport', 'highest category total first');
assertEq(cats[0]!.total, 20, 'transport total');
assertEq(cats[1]!.category, 'food', 'food second');
assertEq(cats[1]!.total, 15, 'food total');
assertEq(cats[1]!.count, 2, 'food count');

const days = groupByDate(items);
assertEq(days.length, 2, 'two days');
assertEq(days[0]!.date, '2026-09-26', 'day group newest first');
assertEq(days[0]!.items.length, 1, 'one on 26th');
assertEq(days[1]!.items.length, 2, 'two on 25th');
assertEq(days[1]!.total, 15, '25th total');

assert(
  hasItemsOutsideWindow(items, '2026-09-28', '2026-10-04'),
  'detects rows outside week window',
);
assert(
  !hasItemsOutsideWindow(items, '2026-09-25', '2026-09-26'),
  'inside window ok',
);

console.log(`statementGrouping.test.mts: ok (${passed} asserts)`);
