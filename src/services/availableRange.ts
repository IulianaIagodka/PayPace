/**
 * Available-card range: day / week / until payday.
 * Pure helpers so Home can switch horizons without burying math in JSX.
 */

import type { PaceHorizon } from '../models/calculator';
import type { SafeSpendSnapshot } from '../models/types';

export type AvailableRange = PaceHorizon; // 'day' | 'week' | 'month'

export const AVAILABLE_RANGE_OPTIONS: Array<{ value: AvailableRange; label: string }> = [
  { value: 'day', label: 'DAY' },
  { value: 'week', label: 'WEEK' },
  { value: 'month', label: 'PAYDAY' },
];

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(n, 1));
}

export function availableLabelFor(range: AvailableRange): string {
  if (range === 'day') return 'AVAILABLE TODAY';
  if (range === 'week') return 'AVAILABLE THIS WEEK';
  return 'AVAILABLE UNTIL PAYDAY';
}

export function availableAmountFor(
  range: AvailableRange,
  snapshot: Pick<
    SafeSpendSnapshot,
    'safeToSpendToday' | 'safeToSpendThisWeek' | 'remainingUntilPayday'
  >,
): number {
  if (range === 'day') return Math.max(snapshot.safeToSpendToday, 0);
  if (range === 'week') return Math.max(snapshot.safeToSpendThisWeek, 0);
  return Math.max(snapshot.remainingUntilPayday, 0);
}

/** Progress within the selected window (1 = full remaining for that range). */
export function availableRatioFor(
  range: AvailableRange,
  snapshot: Pick<
    SafeSpendSnapshot,
    | 'safeToSpendToday'
    | 'todayAllowance'
    | 'safeToSpendThisWeek'
    | 'daysLeftInWeek'
    | 'resourcesRemainingRatio'
  >,
): number {
  if (range === 'day') {
    const cap = snapshot.todayAllowance;
    if (!(cap > 0)) return snapshot.safeToSpendToday > 0 ? 1 : 0;
    return clamp01(snapshot.safeToSpendToday / cap);
  }
  if (range === 'week') {
    const cap = Math.max(
      snapshot.todayAllowance * Math.max(snapshot.daysLeftInWeek, 1),
      snapshot.safeToSpendThisWeek,
      0,
    );
    if (!(cap > 0)) return 0;
    return clamp01(snapshot.safeToSpendThisWeek / cap);
  }
  return clamp01(snapshot.resourcesRemainingRatio);
}

export function availableMetaLeftFor(
  range: AvailableRange,
  snapshot: Pick<SafeSpendSnapshot, 'safeToSpendToday' | 'todayAllowance' | 'resourcesRemainingRatio'>,
  pct: number,
): string {
  if (range === 'day') {
    const cap = snapshot.todayAllowance;
    if (!(cap > 0)) return 'NO DAY LOCK';
    const used = Math.round((1 - clamp01(snapshot.safeToSpendToday / cap)) * 100);
    return `${Math.max(0, used)}% USED TODAY`;
  }
  return `${pct}% REMAINING`;
}

export function availableHorizonLabel(range: AvailableRange): string {
  if (range === 'day') return 'DAY';
  if (range === 'week') return 'WEEK';
  return 'CYCLE';
}

export function availablePeriodShare(
  range: AvailableRange,
  snapshot: Pick<SafeSpendSnapshot, 'weekShare' | 'monthShare' | 'daysUntilPayday'>,
): number {
  if (range === 'day') {
    const days = Math.max(snapshot.daysUntilPayday, 1);
    return 1 / days;
  }
  if (range === 'week') return snapshot.weekShare;
  return snapshot.monthShare;
}
