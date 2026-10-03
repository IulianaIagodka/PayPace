/**
 * Pay-cycle DATE WINDOW for statement import.
 * Run: node --experimental-strip-types scripts/horizonWindow.test.mts
 */
import { startOfDay } from 'date-fns';
import { horizonWindow } from '../src/services/horizonWindow.ts';

let passed = 0;

function assertEq(actual: unknown, expected: unknown, msg: string) {
  if (actual !== expected) {
    throw new Error(`FAIL: ${msg} (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`);
  }
  passed += 1;
}

const now = startOfDay(new Date(2026, 9, 3)); // Oct 3

{
  const w = horizonWindow('month', 1, now, '2026-10-25', '2026-09-25');
  assertEq(w.startKey, '2026-09-25', 'payday window starts at cycle start, not today');
  assertEq(w.endKey, '2026-10-25', 'payday window ends at payday');
}

{
  const w = horizonWindow('month', 1, now, '2026-10-25');
  assertEq(w.startKey, '2026-10-03', 'without cycle start, fall back to today');
  assertEq(w.endKey, '2026-10-25', 'end still payday');
}

{
  const w = horizonWindow('week', 1, now, '2026-10-25', '2026-09-25');
  assertEq(w.startKey, '2026-09-28', 'week mode ignores cycle start (Mon of week)');
  assertEq(w.endKey, '2026-10-04', 'week ends Sunday');
}

console.log(`horizonWindow.test.mts: ok (${passed} asserts)`);
