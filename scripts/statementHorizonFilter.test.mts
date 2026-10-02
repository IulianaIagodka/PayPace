/**
 * Statement import must keep the selected period filter on by default
 * so multi-day bank exports do not import every row.
 * Run: npm run test:statement-horizon
 */
import { filterItemsToWindow } from '../src/services/statementGrouping.ts';

let passed = 0;

function assertEq(actual: unknown, expected: unknown, msg: string) {
  if (actual !== expected) {
    throw new Error(`FAIL: ${msg} (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`);
  }
  passed += 1;
}

const items = [
  { id: 'old', name: 'Old', amount: 10, date: '2026-09-20', category: 'other' as const },
  { id: 'mon', name: 'Mon', amount: 20, date: '2026-09-28', category: 'food' as const },
  { id: 'wed', name: 'Wed', amount: 30, date: '2026-09-30', category: 'transport' as const },
  { id: 'future', name: 'Future', amount: 40, date: '2026-10-10', category: 'fun' as const },
];

// Current week Mon–Sun for 2026-09-30.
const filtered = filterItemsToWindow(items, {
  filterToWindow: true,
  startKey: '2026-09-28',
  endKey: '2026-10-04',
});
assertEq(filtered.length, 2, 'week filter keeps only current week rows');
assertEq(filtered.map((i) => i.id).join(','), 'mon,wed', 'week row ids');

const all = filterItemsToWindow(items, {
  filterToWindow: false,
  startKey: '2026-09-28',
  endKey: '2026-10-04',
});
assertEq(all.length, 4, 'filter off keeps entire statement');

const paydayFiltered = filterItemsToWindow(items, {
  filterToWindow: true,
  startKey: '2026-09-30',
  endKey: '2026-10-05',
});
assertEq(paydayFiltered.length, 1, 'payday window: today through payday');
assertEq(paydayFiltered[0]!.id, 'wed', 'only today is inside payday window for this sample');

console.log(`statementHorizonFilter.test.mts: ok (${passed} asserts)`);
