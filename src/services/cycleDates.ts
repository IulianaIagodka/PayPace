/**
 * Edit-cycle date window: when to preserve vs reset start→payday.
 * Kept free of local app imports so Node strip-types tests can load it.
 */

import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns';

function toDateKey(date: Date): string {
  const d = startOfDay(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromDateKey(value: string): Date {
  const key = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (match) {
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    return startOfDay(new Date(y, m - 1, d));
  }
  return startOfDay(new Date(value));
}

/**
 * Anchor used for CYCLE TIMELINE day count.
 * If Edit Budget (or sync) pushed startDate forward to “today” while older
 * expenses remain, pull the start back to the earliest spend/created day so
 * Day N keeps advancing.
 */
export function effectiveCycleStartDate(
  cycle: { startDate: string; createdAt?: string; expenses?: Array<{ date?: string }> },
  now = new Date(),
): string {
  const todayKey = toDateKey(startOfDay(now));
  let start = (cycle.startDate || todayKey).slice(0, 10);

  const consider = (raw?: string) => {
    const key = (raw ?? '').slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(key) && key < start) start = key;
  };

  consider(cycle.createdAt);
  for (const expense of cycle.expenses ?? []) {
    consider(expense.date);
  }

  if (start > todayKey) start = todayKey;
  return start;
}

/**
 * Update the payday window from “days until payday”.
 * Always keep the historical startDate when possible so the timeline does not
 * jump back to Day 1 after a routine Edit Budget save. Only the payday moves
 * when the days field changes.
 */
export function resolveCycleDatesOnSave(opts: {
  existingStartDate: string;
  existingNextPayday: string;
  daysUntilInput: number;
  /** Optional: earliest expense / createdAt — keeps Day N after a bad reset. */
  earliestActivityDate?: string;
  now?: Date;
}): { startDate: string; nextPayday: string; resetDayLock: boolean } {
  const today = startOfDay(opts.now ?? new Date());
  const todayKey = toDateKey(today);
  const days = Math.max(Number(opts.daysUntilInput) || 0, 0);
  const currentDaysUntil = Math.max(
    differenceInCalendarDays(fromDateKey(opts.existingNextPayday), today),
    0,
  );

  let startKey = (opts.existingStartDate || todayKey).slice(0, 10);
  const activity = (opts.earliestActivityDate ?? '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(activity) && activity < startKey) {
    startKey = activity;
  }
  if (startKey > todayKey) startKey = todayKey;

  if (days === currentDaysUntil) {
    return {
      startDate: startKey,
      nextPayday: opts.existingNextPayday,
      resetDayLock: false,
    };
  }

  const nextPayday = toDateKey(addDays(today, Math.max(days, 1)));
  // Degenerate: start after new payday → fall back to today.
  if (differenceInCalendarDays(fromDateKey(nextPayday), fromDateKey(startKey)) < 1) {
    startKey = todayKey;
  }

  return {
    startDate: startKey,
    nextPayday,
    resetDayLock: true,
  };
}
