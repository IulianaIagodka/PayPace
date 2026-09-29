/**
 * Period report tests — weekly/monthly category spend + slip detection.
 * Run: npm run test:reports
 */

import {
  buildPeriodReport,
  collectNewPeriodReports,
  isCategorySlipping,
  markReportViewed,
  mergePeriodReports,
  previousMonthWindow,
  previousWeekWindow,
  reportPeriodKey,
  SLIP_SHARE_THRESHOLD,
} from '../src/services/periodReports.ts';
import { format, startOfDay } from 'date-fns';
import type { PayCycle, PeriodReport } from '../src/models/types.ts';

function toDateKey(date: Date): string {
  return format(startOfDay(date), 'yyyy-MM-dd');
}

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

assert(isCategorySlipping({ spent: 120, allocated: 100, share: 0.1 }), 'over allocation slips');
assert(!isCategorySlipping({ spent: 80, allocated: 100, share: 0.1 }), 'under allocation ok');
assert(
  isCategorySlipping({ spent: 200, allocated: 0, share: SLIP_SHARE_THRESHOLD }),
  'high share slips without allocation',
);
assert(!isCategorySlipping({ spent: 0, allocated: 0, share: 1 }), 'zero spend never slips');

const weekStartsOn = 1 as const;
// Monday 2026-09-28 → previous week Mon 21 – Sun 27
const now = new Date(2026, 8, 28, 10, 0, 0);
const week = previousWeekWindow(now, weekStartsOn);
assertEq(toDateKey(week.start), '2026-09-21', 'prev week starts Monday');
assertEq(toDateKey(week.end), '2026-09-27', 'prev week ends Sunday');

const month = previousMonthWindow(new Date(2026, 9, 1, 12, 0, 0));
assertEq(toDateKey(month.start), '2026-09-01', 'prev month start');
assertEq(toDateKey(month.end), '2026-09-30', 'prev month end');

const cycle: PayCycle = {
  id: 'c1',
  schedule: 'monthly',
  startDate: '2026-09-01',
  nextPayday: '2026-10-01',
  currentBalance: 2000,
  expectedPaycheck: 2000,
  savingsGoal: 0,
  emergencyBuffer: 0,
  spendingBuffer: 0,
  bills: [],
  expenses: [
    { id: 'e1', name: 'Cafe', amount: 40, date: '2026-09-22', category: 'food' },
    { id: 'e2', name: 'Market', amount: 60, date: '2026-09-23', category: 'groceries' },
    { id: 'e3', name: 'Uber', amount: 20, date: '2026-09-24', category: 'transport' },
    { id: 'e4', name: 'Outside week', amount: 500, date: '2026-09-10', category: 'shopping' },
  ],
  envelopes: [
    {
      id: 'env1',
      key: 'food',
      title: 'Eating out',
      category: 'food',
      allocated: 30,
    },
    {
      id: 'env2',
      key: 'groceries',
      title: 'Groceries',
      category: 'groceries',
      allocated: 100,
    },
  ],
  isActive: true,
  createdAt: '2026-09-01T00:00:00.000Z',
};

const report = buildPeriodReport({
  kind: 'week',
  periodStart: '2026-09-21',
  periodEnd: '2026-09-27',
  cycles: [cycle],
  createdAt: '2026-09-28T10:00:00.000Z',
});

assert(report, 'report built when spend exists');
assertEq(report!.id, reportPeriodKey('week', '2026-09-21'), 'deterministic id');
assertClose(report!.totalSpent, 120, 'week total ignores outside expenses');
assert(
  report!.categories.some((c) => c.category === 'food' && c.slipping),
  'food over allocation marked slipping',
);
assert(
  !report!.categories.some((c) => c.category === 'shopping'),
  'outside-period shopping excluded',
);

const empty = buildPeriodReport({
  kind: 'week',
  periodStart: '2026-09-01',
  periodEnd: '2026-09-07',
  cycles: [cycle],
});
assertEq(empty, null, 'no spend → no report');

const created = collectNewPeriodReports({
  cycles: [cycle],
  existing: [],
  weekStartsOn,
  now,
  createdAt: '2026-09-28T10:00:00.000Z',
});
assert(created.some((r) => r.kind === 'week'), 'due week report collected');
assertEq(
  created.filter((r) => r.kind === 'month').length,
  0,
  'August month skipped when no spend',
);
const again = collectNewPeriodReports({
  cycles: [cycle],
  existing: created,
  weekStartsOn,
  now,
});
assertEq(again.length, 0, 'idempotent — no duplicate reports');

const cycleWithAugust: PayCycle = {
  ...cycle,
  expenses: [
    ...cycle.expenses,
    { id: 'e5', name: 'August fun', amount: 90, date: '2026-08-15', category: 'fun' },
  ],
};
const withMonth = collectNewPeriodReports({
  cycles: [cycleWithAugust],
  existing: [],
  weekStartsOn,
  now: new Date(2026, 8, 28, 10, 0, 0),
  createdAt: '2026-09-28T10:00:00.000Z',
});
assert(withMonth.some((r) => r.kind === 'month' && r.periodStart === '2026-08-01'), 'August report when spend');

const merged = mergePeriodReports([], withMonth);
assertEq(merged.length, withMonth.length, 'merge keeps all new');

const viewed = markReportViewed(merged, merged[0]!.id, '2026-09-28T12:00:00.000Z');
assert(viewed[0]!.viewedAt === '2026-09-28T12:00:00.000Z', 'mark viewed sets timestamp');
const viewedAgain = markReportViewed(viewed, merged[0]!.id, '2026-09-29T12:00:00.000Z');
assertEq(viewedAgain[0]!.viewedAt, '2026-09-28T12:00:00.000Z', 'viewedAt sticky first time');

// Preserve typed use so PeriodReport import stays useful for TS strip
const sample: PeriodReport = viewed[0]!;
assert(sample.summary.length > 0, 'summary present');

console.log(`OK periodReports (${passed} assertions)`);
