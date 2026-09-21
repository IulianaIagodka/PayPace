import { addDays, endOfWeek, isWithinInterval, startOfDay, startOfWeek } from 'date-fns';
import type { PayCycle } from '../models/types';
import type { WeekStartsOn } from '../models/calculator';
import { fromDateKey, toDateKey } from './formatting';

/** Cycle owns [startDate, nextPayday). */
export function cycleContainsDate(cycle: PayCycle, dateKey: string): boolean {
  const day = fromDateKey(dateKey);
  const start = fromDateKey(cycle.startDate);
  const end = fromDateKey(cycle.nextPayday);
  if (day < start) return false;
  if (day >= end) return false;
  return true;
}

export function findCycleForDate(
  cycles: PayCycle[],
  dateKey: string,
  fallback: PayCycle | null,
): PayCycle | null {
  const hit = cycles.find((c) => cycleContainsDate(c, dateKey));
  if (hit) return hit;
  return fallback;
}

/**
 * WEEK = configured calendar week.
 * MONTH = remaining pay window (today → payday), not calendar month.
 */
export function horizonWindow(
  horizon: 'week' | 'month',
  weekStartsOn: WeekStartsOn = 1,
  now = new Date(),
  paydayKey?: string | null,
): { start: Date; end: Date; startKey: string; endKey: string } {
  const today = startOfDay(now);
  if (horizon === 'month') {
    const payday = paydayKey ? fromDateKey(paydayKey) : addDays(today, 30);
    // Inclusive window through the day before payday when payday is exclusive in cycles,
    // but for import filters include up to payday date itself if same day.
    const end = payday < today ? today : payday;
    return { start: today, end, startKey: toDateKey(today), endKey: toDateKey(end) };
  }
  const start = startOfWeek(today, { weekStartsOn });
  const end = endOfWeek(today, { weekStartsOn });
  return { start, end, startKey: toDateKey(start), endKey: toDateKey(end) };
}

export function dateInHorizon(
  dateKey: string,
  horizon: 'week' | 'month',
  weekStartsOn: WeekStartsOn = 1,
  now = new Date(),
  paydayKey?: string | null,
): boolean {
  const { start, end } = horizonWindow(horizon, weekStartsOn, now, paydayKey);
  const day = fromDateKey(dateKey);
  return isWithinInterval(day, { start, end });
}
