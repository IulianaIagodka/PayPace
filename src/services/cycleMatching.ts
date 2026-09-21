import { endOfMonth, endOfWeek, isWithinInterval, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
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

export function horizonWindow(
  horizon: 'week' | 'month',
  weekStartsOn: WeekStartsOn = 1,
  now = new Date(),
): { start: Date; end: Date; startKey: string; endKey: string } {
  const today = startOfDay(now);
  if (horizon === 'month') {
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    return { start, end, startKey: toDateKey(start), endKey: toDateKey(end) };
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
): boolean {
  const { start, end } = horizonWindow(horizon, weekStartsOn, now);
  const day = fromDateKey(dateKey);
  return isWithinInterval(day, { start, end });
}
