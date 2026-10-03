import { isWithinInterval } from 'date-fns';
import type { PayCycle } from '../models/types';
import type { WeekStartsOn } from '../models/calculator';
import { fromDateKey } from './formatting';
import { horizonWindow } from './horizonWindow';

export { horizonWindow } from './horizonWindow';

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

export function dateInHorizon(
  dateKey: string,
  horizon: 'week' | 'month',
  weekStartsOn: WeekStartsOn = 1,
  now = new Date(),
  paydayKey?: string | null,
  cycleStartKey?: string | null,
): boolean {
  const { start, end } = horizonWindow(horizon, weekStartsOn, now, paydayKey, cycleStartKey);
  const day = fromDateKey(dateKey);
  return isWithinInterval(day, { start, end });
}
