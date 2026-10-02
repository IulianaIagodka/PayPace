/**
 * Cycle timeline / days-until save behavior.
 * Run: npm run test:cycle
 *
 * Pure modules only (Node ESM + strip-types cannot resolve extensionless
 * app imports like calculator → formatting).
 */

import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns';
import {
  effectiveCycleStartDate,
  resolveCycleDatesOnSave,
} from '../src/services/cycleDates.ts';

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

// Changing days-until moves payday but keeps historical start (no jump to Day 1).
{
  const now = startOfDay(new Date(2026, 8, 10));
  const dates = resolveCycleDatesOnSave({
    existingStartDate: '2026-09-01',
    existingNextPayday: '2026-09-27',
    daysUntilInput: 30,
    now,
  });
  assertEq(dates.startDate, '2026-09-01', 'keep start when days-until changes');
  assertEq(dates.nextPayday, toDateKey(addDays(now, 30)), 'payday = today + new days');
  assertEq(dates.resetDayLock, true, 'refresh day lock when payday moves');

  const after = dayMetrics(dates.startDate, dates.nextPayday, now);
  assertEq(after.daysElapsed + 1, 10, 'still Day 10 after days-until rewrite');
  assertEq(after.daysUntilPayday, 30, 'days left matches new days-until');
}

// Bad reset: startDate = today but expenses from last week → heal to earliest spend.
{
  const now = startOfDay(new Date(2026, 8, 29)); // Sep 29
  const healed = effectiveCycleStartDate(
    {
      startDate: '2026-09-29',
      createdAt: '2026-09-21T10:00:00.000Z',
      expenses: [
        { date: '2026-09-25' },
        { date: '2026-09-21' },
        { date: '2026-09-27' },
      ],
    },
    now,
  );
  assertEq(healed, '2026-09-21', 'pull start back to earliest activity');

  const payday = toDateKey(addDays(now, 26));
  const m = dayMetrics(healed, payday, now);
  assertEq(m.daysElapsed + 1, 9, 'Day 9 of cycle after heal (Sep 21→29)');
  assertEq(m.daysUntilPayday, 26, '26 left to payday unchanged');
}

// Statement import must not stretch a historical start to older bank rows.
{
  const now = startOfDay(new Date(2026, 9, 2)); // Oct 2
  const healed = effectiveCycleStartDate(
    {
      startDate: '2026-09-10',
      nextPayday: '2026-10-10',
      createdAt: '2026-09-10T10:00:00.000Z',
      expenses: [
        { date: '2026-08-15' },
        { date: '2026-08-20' },
        { date: '2026-09-12' },
      ],
    },
    now,
  );
  assertEq(healed, '2026-09-10', 'keep historical start after multi-day statement');
  const m = dayMetrics(healed, '2026-10-10', now);
  assertEq(m.totalDaysInCycle, 30, 'total days stay start→payday (not earliest import)');
  assertEq(m.daysElapsed + 1, 23, 'Day 23 — not Day 30+ from August rows');
  assertEq(m.daysUntilPayday, 8, '8 left to payday');
}

// Past bad heal (start pulled to August) clamps to payday − max timeline days.
{
  const now = startOfDay(new Date(2026, 9, 2));
  const healed = effectiveCycleStartDate(
    {
      startDate: '2026-08-10',
      nextPayday: '2026-10-25',
      expenses: [{ date: '2026-08-10' }, { date: '2026-09-01' }],
    },
    now,
  );
  assertEq(healed, '2026-09-15', 'clamp bloated start to payday − 40 days');
  const m = dayMetrics(healed, '2026-10-25', now);
  assertEq(m.totalDaysInCycle, 40, 'timeline max 40 days after clamp');
}

// resolveCycleDatesOnSave also heals via earliestActivityDate.
{
  const now = startOfDay(new Date(2026, 8, 29));
  const dates = resolveCycleDatesOnSave({
    existingStartDate: '2026-09-29',
    existingNextPayday: toDateKey(addDays(now, 26)),
    daysUntilInput: 26,
    earliestActivityDate: '2026-09-21',
    now,
  });
  assertEq(dates.startDate, '2026-09-21', 'save heals start from earliest activity');
  assertEq(dates.resetDayLock, false, 'days-until unchanged → no lock reset');
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
      daysUntilInput: left || 0,
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
