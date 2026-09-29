/**
 * Cycle timeline / days-until save behavior.
 * Run: npm run test:cycle
 *
 * Pure modules only (Node ESM + strip-types cannot resolve extensionless
 * app imports like calculator → formatting).
 */

import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns';
import { resolveCycleDatesOnSave } from '../src/services/cycleDates.ts';

let passed = 0;

function assertEq(actual: unknown, expected: unknown, msg: string) {
  if (actual !== expected) {
    throw new Error(`FAIL: ${msg} (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`);
  }
  passed += 1;
}

function toDateKey(date: Date): string {
  const d = startOfDay(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromDateKey(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return startOfDay(new Date(y, m - 1, d));
}

/** Mirror cycleMetrics day math used by CYCLE TIMELINE. */
function dayMetrics(startDate: string, nextPayday: string, now: Date) {
  const today = startOfDay(now);
  const start = fromDateKey(startDate);
  const payday = fromDateKey(nextPayday);
  const daysUntilPayday = Math.max(differenceInCalendarDays(payday, today), 0);
  const totalDaysInCycle = Math.max(differenceInCalendarDays(payday, start), 1);
  const daysElapsed = Math.min(Math.max(differenceInCalendarDays(today, start), 0), totalDaysInCycle);
  return { daysUntilPayday, totalDaysInCycle, daysElapsed };
}

// Mid-cycle: start Sep 1, payday Sep 27 (26-day window), today Sep 10 → Day 10 of 26, 17 left.
{
  const now = startOfDay(new Date(2026, 8, 10));
  const m = dayMetrics('2026-09-01', '2026-09-27', now);
  assertEq(m.daysElapsed, 9, 'daysElapsed from start');
  assertEq(m.totalDaysInCycle, 26, 'totalDaysInCycle start→payday');
  assertEq(m.daysUntilPayday, 17, 'daysUntilPayday today→payday');
  assertEq(m.daysElapsed + 1, 10, '1-based Day label');
}

// Saving balance without changing days-until must keep the original startDate.
{
  const now = startOfDay(new Date(2026, 8, 10));
  const existingStart = '2026-09-01';
  const existingPayday = '2026-09-27';
  const currentLeft = differenceInCalendarDays(fromDateKey(existingPayday), now);
  const dates = resolveCycleDatesOnSave({
    existingStartDate: existingStart,
    existingNextPayday: existingPayday,
    daysUntilInput: currentLeft,
    now,
  });
  assertEq(dates.startDate, existingStart, 'preserve startDate when days unchanged');
  assertEq(dates.nextPayday, existingPayday, 'preserve nextPayday when days unchanged');
  assertEq(dates.resetDayLock, false, 'do not clear day lock when days unchanged');

  const after = dayMetrics(dates.startDate, dates.nextPayday, now);
  assertEq(after.daysElapsed + 1, 10, 'timeline still Day 10 after balance-only save');
  assertEq(after.totalDaysInCycle, 26, 'total days unchanged after balance-only save');
}

// Changing days-until still resets the window to today → payday (Day 1 of N).
{
  const now = startOfDay(new Date(2026, 8, 10));
  const dates = resolveCycleDatesOnSave({
    existingStartDate: '2026-09-01',
    existingNextPayday: '2026-09-27',
    daysUntilInput: 30,
    now,
  });
  assertEq(dates.startDate, toDateKey(now), 'reset start to today when days change');
  assertEq(dates.nextPayday, toDateKey(addDays(now, 30)), 'payday = today + new days');
  assertEq(dates.resetDayLock, true, 'clear day lock when days change');

  const after = dayMetrics(dates.startDate, dates.nextPayday, now);
  assertEq(after.daysElapsed, 0, 'Day 1 after days-until rewrite');
  assertEq(after.totalDaysInCycle, 30, 'total matches new days-until');
  assertEq(after.daysUntilPayday, 30, 'days left matches new days-until');
}

// Regression: repeating Edit Cycle save must not pin the timeline at Day 1.
{
  const start = startOfDay(new Date(2026, 8, 1));
  let startDate = toDateKey(start);
  let nextPayday = toDateKey(addDays(start, 26));

  for (let offset = 0; offset <= 5; offset++) {
    const now = addDays(start, offset);
    const left = Math.max(differenceInCalendarDays(fromDateKey(nextPayday), now), 0);
    const dates = resolveCycleDatesOnSave({
      existingStartDate: startDate,
      existingNextPayday: nextPayday,
      daysUntilInput: left || 1,
      now,
    });
    startDate = dates.startDate;
    nextPayday = dates.nextPayday;
    const m = dayMetrics(startDate, nextPayday, now);
    assertEq(m.daysElapsed, offset, `elapsed after ${offset} day(s) + save`);
    assertEq(m.daysElapsed + 1, offset + 1, `Day ${offset + 1} after save`);
  }
}

console.log(`OK: cycleTimeline ${passed} assertions`);
