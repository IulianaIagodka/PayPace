/**
 * Available range (day / week / payday) helpers.
 * Run: npm run test:range
 */

import {
  availableAmountFor,
  availableHorizonLabel,
  availableLabelFor,
  availableMetaLeftFor,
  availablePeriodShare,
  availableRatioFor,
} from '../src/services/availableRange.ts';
import type { SafeSpendSnapshot } from '../src/models/types.ts';

let passed = 0;

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

function snap(partial: Partial<SafeSpendSnapshot> = {}): SafeSpendSnapshot {
  return {
    remainingUntilPayday: 2000,
    safeToSpendToday: 80,
    todayAllowance: 100,
    spentToday: 20,
    spentThisWeek: 20,
    safeToSpendThisWeek: 480,
    safeToSpendThisMonth: 2000,
    daysLeftInWeek: 5,
    daysLeftInMonth: 20,
    weekShare: 0.25,
    monthShare: 1,
    daysUntilPayday: 20,
    totalDaysInCycle: 30,
    daysElapsed: 10,
    cycleProgress: 10 / 30,
    unpaidBillsTotal: 0,
    spentThisCycle: 500,
    reservedTotal: 0,
    isAtRisk: false,
    projectedShortfallDays: null,
    resourcesRemainingRatio: 0.8,
    trajectory: 'ON TARGET',
    projectedEndBalance: 1000,
    ...partial,
  };
}

const s = snap();

assertEq(availableLabelFor('day'), 'AVAILABLE TODAY', 'day label');
assertEq(availableLabelFor('week'), 'AVAILABLE THIS WEEK', 'week label');
assertEq(availableLabelFor('month'), 'AVAILABLE UNTIL PAYDAY', 'payday label');

assertEq(availableAmountFor('day', s), 80, 'day amount');
assertEq(availableAmountFor('week', s), 480, 'week amount');
assertEq(availableAmountFor('month', s), 2000, 'payday amount');

assertClose(availableRatioFor('day', s), 0.8, 'day ratio = left/allowance');
assertClose(availableRatioFor('week', s), 480 / 500, 'week ratio = left/(left+spent)');
assertClose(availableRatioFor('month', s), 0.8, 'payday uses cycle ratio');

// Earlier-week spend must drain the week meter (not stay at 100%).
const weekSpent = snap({ spentThisWeek: 200, safeToSpendThisWeek: 800 });
assertClose(availableRatioFor('week', weekSpent), 800 / 1000, 'week drains after spend');
assertEq(availableMetaLeftFor('week', weekSpent, 80), '80% REMAINING', 'week meta remaining');

assertEq(availableMetaLeftFor('day', s, 80), '80% REMAINING', 'day meta remaining');
assertEq(availableMetaLeftFor('week', s, 96), '96% REMAINING', 'week meta');
assertEq(availableMetaLeftFor('month', s, 80), '80% REMAINING', 'payday meta remaining');

assertEq(availableHorizonLabel('day'), 'DAY', 'horizon day');
assertEq(availableHorizonLabel('month'), 'CYCLE', 'horizon payday');
assertClose(availablePeriodShare('day', s), 1 / 20, 'day share');
assertEq(availablePeriodShare('week', s), 0.25, 'week share');
assertEq(availablePeriodShare('month', s), 1, 'month share');

console.log(`\nOK — ${passed} available-range assertions passed`);
