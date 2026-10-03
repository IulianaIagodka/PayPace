/**
 * Week / pay-cycle date windows for filters (statement import, etc.).
 * Pure date-fns helpers — safe for Node strip-types tests.
 */

import {
  addDays,
  endOfWeek,
  startOfDay,
  startOfWeek,
} from 'date-fns';

export type HorizonWeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;

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
 * WEEK = configured calendar week.
 * MONTH = pay-cycle window (cycle start → payday), not calendar month.
 * Pass `cycleStartKey` so UNTIL PAYDAY / PAY CYCLE is the full active cycle —
 * not “today → payday”, which hid earlier cycle days on statement import.
 */
export function horizonWindow(
  horizon: 'week' | 'month',
  weekStartsOn: HorizonWeekStartsOn = 1,
  now = new Date(),
  paydayKey?: string | null,
  cycleStartKey?: string | null,
): { start: Date; end: Date; startKey: string; endKey: string } {
  const today = startOfDay(now);
  if (horizon === 'month') {
    const payday = paydayKey ? fromDateKey(paydayKey) : addDays(today, 30);
    const rawStart =
      cycleStartKey && /^\d{4}-\d{2}-\d{2}$/.test(cycleStartKey.slice(0, 10))
        ? fromDateKey(cycleStartKey.slice(0, 10))
        : today;
    // Never start after today (future startDate is meaningless for import).
    const start = rawStart > today ? today : rawStart;
    // Inclusive through payday date for import filters.
    const end = payday < start ? start : payday;
    return { start, end, startKey: toDateKey(start), endKey: toDateKey(end) };
  }
  const start = startOfWeek(today, { weekStartsOn });
  const end = endOfWeek(today, { weekStartsOn });
  return { start, end, startKey: toDateKey(start), endKey: toDateKey(end) };
}
