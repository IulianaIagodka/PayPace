/**
 * Day pacing tests — predictable today, adaptive future.
 * Run: npm run test:pace
 */

import {
  adaptiveFutureDaily,
  lockDailyAllowance,
  remainingForFutureDays,
  resolveDayPaceLock,
  spentBeforeDate,
  spentOnDate,
  todayBudgetRemaining,
  weekBudgetRemaining,
} from '../src/services/dayPace.ts';

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

function assertClose(actual: number, expected: number, msg: string, eps = 1e-9) {
  if (Math.abs(actual - expected) > eps) {
    throw new Error(`FAIL: ${msg} (got ${actual}, expected ${expected})`);
  }
  passed += 1;
}

const expenses = [
  { date: '2026-09-20', amount: 100 },
  { date: '2026-09-22', amount: 40 },
  { date: '2026-09-22', amount: 10 },
  { date: '2026-09-21', amount: 25 },
];

assertEq(spentOnDate(expenses, '2026-09-22'), 50, 'spent today sums same-day expenses');
assertEq(spentBeforeDate(expenses, '2026-09-22'), 125, 'spent before today');

assertEq(lockDailyAllowance(1000, 10), 100, 'morning lock = pool / days');
assertEq(lockDailyAllowance(0, 10), 0, 'empty pool locks 0');
assertEq(lockDailyAllowance(-50, 10), 0, 'negative pool locks 0');

assertEq(todayBudgetRemaining(100, 30), 70, 'today shrinks with spend');
assertEq(todayBudgetRemaining(100, 130), -30, 'overspend goes negative');

// Underspend: future pool stays at R0 - T
assertEq(remainingForFutureDays(970, 70), 900, 'underspend keeps future at R0-T');
// Overspend: future absorbs the hit
assertEq(remainingForFutureDays(850, -50), 850, 'overspend future = full remaining');

assertEq(adaptiveFutureDaily(900, 9), 100, 'future daily adaptive');
assertEq(adaptiveFutureDaily(900, 0), 0, 'no future days');

assertEq(weekBudgetRemaining(70, 100, 5), 70 + 400, 'week = today left + future days');

const locked = resolveDayPaceLock({ date: '2026-09-22', allowance: 100 }, '2026-09-22', 9999, 5);
assertEq(locked.allowance, 100, 'existing same-day lock is stable');
assertEq(locked.date, '2026-09-22', 'lock date preserved');

const zeroRefresh = resolveDayPaceLock({ date: '2026-09-22', allowance: 0 }, '2026-09-22', 2000, 4);
assertEq(zeroRefresh.allowance, 500, 'zero lock refreshes once pool is positive');

const zeroStays = resolveDayPaceLock({ date: '2026-09-22', allowance: 0 }, '2026-09-22', 0, 4);
assertEq(zeroStays.allowance, 0, 'zero lock stays when pool still empty');

const rollover = resolveDayPaceLock({ date: '2026-09-21', allowance: 100 }, '2026-09-22', 900, 9);
assertEq(rollover.date, '2026-09-22', 'new day rolls lock');
assertEq(rollover.allowance, 100, 'new day allowance from morning pool');

// Predictable today: spend does not change locked allowance
const allowance = lockDailyAllowance(2000, 20);
assertEq(allowance, 100, 'day start allowance');
const afterCoffee = todayBudgetRemaining(allowance, 15);
assertEq(afterCoffee, 85, 'coffee only burns today');
const afterMore = todayBudgetRemaining(allowance, 15 + 20);
assertEq(afterMore, 65, 'second spend still uses same lock');
assert(
  resolveDayPaceLock({ date: '2026-09-22', allowance }, '2026-09-22', 2000 - 35, 20).allowance ===
    allowance,
  'recompute with lower pool must not change locked allowance',
);

console.log(`\nOK — ${passed} day-pace assertions passed`);
