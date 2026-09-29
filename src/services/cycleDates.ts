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
 * Only redefine start→payday when “days until payday” actually changed.
 * Preserving startDate on balance/buffer saves keeps CYCLE TIMELINE advancing.
 * Changing the days field still resets the window to today → payday (Day 1 of N).
 */
export function resolveCycleDatesOnSave(opts: {
  existingStartDate: string;
  existingNextPayday: string;
  daysUntilInput: number;
  now?: Date;
}): { startDate: string; nextPayday: string; resetDayLock: boolean } {
  const today = startOfDay(opts.now ?? new Date());
  const days = Math.max(Number(opts.daysUntilInput) || 1, 0);
  const currentDaysUntil = Math.max(
    differenceInCalendarDays(fromDateKey(opts.existingNextPayday), today),
    0,
  );
  if (days === currentDaysUntil) {
    return {
      startDate: opts.existingStartDate,
      nextPayday: opts.existingNextPayday,
      resetDayLock: false,
    };
  }
  return {
    startDate: toDateKey(today),
    nextPayday: toDateKey(addDays(today, days)),
    resetDayLock: true,
  };
}
