/**
 * Money status chip tests.
 * Run via: node --experimental-strip-types scripts/moneyStatus.test.mts
 */

import {
  moneyStatusFromSnapshot,
  moneyStatusFromTrajectory,
  moneyStatusLabel,
  type MoneyStatusInput,
} from '../src/services/moneyStatus.ts';

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

function snap(partial: Partial<MoneyStatusInput> = {}): MoneyStatusInput {
  return {
    remainingUntilPayday: 2000,
    isAtRisk: false,
    trajectory: 'ON TARGET',
    resourcesRemainingRatio: 0.7,
    ...partial,
  };
}

assertEq(moneyStatusLabel('ok'), 'OK', 'ok label');
assertEq(moneyStatusLabel('tense'), 'TENSE', 'tense label');
assertEq(moneyStatusLabel('critical'), 'CRITICAL', 'critical label');

assertEq(moneyStatusFromSnapshot(snap()), 'ok', 'healthy → ok');
assertEq(
  moneyStatusFromSnapshot(snap({ trajectory: 'WITH RESERVE', resourcesRemainingRatio: 0.9 })),
  'ok',
  'with reserve → ok',
);
assertEq(
  moneyStatusFromSnapshot(snap({ trajectory: 'LOW RESERVE' })),
  'tense',
  'low reserve → tense',
);
assertEq(
  moneyStatusFromSnapshot(snap({ isAtRisk: true, trajectory: 'ON TARGET' })),
  'tense',
  'at risk → tense',
);
assertEq(
  moneyStatusFromSnapshot(snap({ resourcesRemainingRatio: 0.35 })),
  'tense',
  'under 40% → tense',
);
assertEq(
  moneyStatusFromSnapshot(snap({ remainingUntilPayday: -10, trajectory: 'DEFICIT' })),
  'critical',
  'deficit → critical',
);
assertEq(
  moneyStatusFromSnapshot(snap({ remainingUntilPayday: -1, trajectory: 'ON TARGET' })),
  'critical',
  'negative remaining → critical',
);

assertEq(moneyStatusFromTrajectory('DEFICIT'), 'critical', 'traj deficit');
assertEq(moneyStatusFromTrajectory('LOW RESERVE'), 'tense', 'traj low');
assertEq(moneyStatusFromTrajectory('ON TARGET'), 'ok', 'traj on target');
assertEq(moneyStatusFromTrajectory('WITH RESERVE'), 'ok', 'traj with reserve');

assert(moneyStatusLabel(moneyStatusFromSnapshot(snap())) !== 'ONLINE', 'not online chip');

console.log(`Money status tests: ${passed} assertions passed`);
console.log('E2E money status: PASS');
