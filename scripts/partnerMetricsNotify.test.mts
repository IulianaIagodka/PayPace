/**
 * Partner metric notification helpers.
 * Run: npm run test:notify
 */

import {
  diffPaceMetrics,
  metricsEqual,
  partnerMetricsNotice,
  type PaceMetrics,
} from '../src/services/partnerMetricsNotify.ts';

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

function m(partial: Partial<PaceMetrics> = {}): PaceMetrics {
  return {
    remainingUntilPayday: 2000,
    safeToSpendToday: 100,
    spentThisCycle: 400,
    unpaidBillsTotal: 0,
    currentBalance: 3000,
    ...partial,
  };
}

assert(metricsEqual(m(), m()), 'identical metrics equal');
assert(!metricsEqual(m(), m({ safeToSpendToday: 90 })), 'safe today change detected');

const changes = diffPaceMetrics(m(), m({ safeToSpendToday: 80, spentThisCycle: 420 }));
assertEq(changes.length, 2, 'two metric changes');
assertEq(changes[0]?.key, 'safeToSpendToday', 'safe today first');
assertEq(changes[1]?.key, 'spentThisCycle', 'spent second');

const notice = partnerMetricsNotice(changes, (n) => `₴${n}`);
assert(notice != null, 'notice present');
assertEq(notice!.title, 'PayPace · numbers updated', 'title');
assert(notice!.body.includes('Safe today ₴100 → ₴80'), 'safe today in body');
assert(notice!.body.includes('Spent ₴400 → ₴420'), 'spent in body');

assertEq(partnerMetricsNotice([], (n) => `${n}`), null, 'no changes → no notice');
assertEq(diffPaceMetrics(m(), m({ safeToSpendToday: 100.001 })).length, 0, 'tiny float noise ignored');

console.log(`\nOK — ${passed} partner-metric notify assertions passed`);
