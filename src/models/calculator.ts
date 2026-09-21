import { addDays, addMonths, differenceInCalendarDays, endOfMonth, endOfWeek, startOfDay } from 'date-fns';
import type { PayCycle, PaySchedule, SafeSpendSnapshot, TrajectoryLabel } from './types';
import { asMoney, fromDateKey } from '../services/formatting';

export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type PaceHorizon = 'week' | 'month';

export const WEEK_START_OPTIONS: Array<{ value: WeekStartsOn; label: string; short: string }> = [
  { value: 1, label: 'Monday', short: 'MON' },
  { value: 2, label: 'Tuesday', short: 'TUE' },
  { value: 3, label: 'Wednesday', short: 'WED' },
  { value: 4, label: 'Thursday', short: 'THU' },
  { value: 5, label: 'Friday', short: 'FRI' },
  { value: 6, label: 'Saturday', short: 'SAT' },
  { value: 0, label: 'Sunday', short: 'SUN' },
];

export const scheduleOptions: { id: PaySchedule; title: string; subtitle: string }[] = [
  { id: 'monthly', title: 'Monthly', subtitle: 'Once a month' },
  { id: 'twiceMonthly', title: 'Twice monthly', subtitle: 'Two paydays each month' },
  { id: 'everyTwoWeeks', title: 'Every 2 weeks', subtitle: 'Every 14 days' },
  { id: 'weekly', title: 'Weekly', subtitle: 'Every 7 days' },
  { id: 'custom', title: 'Custom / irregular', subtitle: 'You set each payday' },
];

export function nextPaydayAfter(schedule: PaySchedule, from: Date): Date {
  const start = startOfDay(from);
  switch (schedule) {
    case 'weekly':
      return addDays(start, 7);
    case 'everyTwoWeeks':
      return addDays(start, 14);
    case 'twiceMonthly': {
      const day = start.getDate();
      if (day < 15) {
        const mid = new Date(start);
        mid.setDate(15);
        return startOfDay(mid);
      }
      const next = addMonths(start, 1);
      next.setDate(1);
      return startOfDay(next);
    }
    case 'monthly':
      return addMonths(start, 1);
    case 'custom':
    default:
      return addDays(start, 30);
  }
}

export function cycleMetrics(cycle: PayCycle, now = new Date()) {
  const today = startOfDay(now);
  const start = fromDateKey(cycle.startDate);
  const payday = fromDateKey(cycle.nextPayday);
  const daysUntilPayday = Math.max(differenceInCalendarDays(payday, today), 0);
  const totalDaysInCycle = Math.max(differenceInCalendarDays(payday, start), 1);
  const daysElapsed = Math.min(Math.max(differenceInCalendarDays(today, start), 0), totalDaysInCycle);
  const unpaidBillsTotal = cycle.bills
    .filter((b) => !b.isPaid)
    .reduce((s, b) => s + asMoney(b.amount), 0);
  const spentThisCycle = cycle.expenses.reduce((s, e) => s + Math.max(asMoney(e.amount), 0), 0);
  return {
    daysUntilPayday,
    totalDaysInCycle,
    daysElapsed,
    unpaidBillsTotal,
    spentThisCycle,
    balance: asMoney(cycle.currentBalance),
    reservedTotal:
      asMoney(cycle.savingsGoal) + asMoney(cycle.emergencyBuffer) + asMoney(cycle.spendingBuffer),
  };
}

/** Inclusive days from today through end of the configured calendar week. */
export function daysRemainingInWeek(now = new Date(), weekStartsOn: WeekStartsOn = 1): number {
  const today = startOfDay(now);
  const weekEnd = startOfDay(endOfWeek(today, { weekStartsOn }));
  return Math.max(differenceInCalendarDays(weekEnd, today) + 1, 1);
}

/** Inclusive days from today through end of the calendar month. */
export function daysRemainingInMonth(now = new Date()): number {
  const today = startOfDay(now);
  const monthEnd = startOfDay(endOfMonth(today));
  return Math.max(differenceInCalendarDays(monthEnd, today) + 1, 1);
}

export function calculateSafeSpend(
  cycle: PayCycle,
  now = new Date(),
  weekStartsOn: WeekStartsOn = 1,
): SafeSpendSnapshot {
  const {
    daysUntilPayday,
    totalDaysInCycle,
    daysElapsed,
    unpaidBillsTotal,
    spentThisCycle,
    balance,
    reservedTotal,
  } = cycleMetrics(cycle, now);

  const spendPool = balance - unpaidBillsTotal - reservedTotal;
  const remainingUntilPayday = spendPool - spentThisCycle;
  const daysToCover = Math.max(daysUntilPayday, 1);
  const safeToSpendToday = remainingUntilPayday > 0 ? remainingUntilPayday / daysToCover : 0;

  const daysLeftInWeek = Math.min(daysRemainingInWeek(now, weekStartsOn), daysToCover);
  const daysLeftInMonth = Math.min(daysRemainingInMonth(now), daysToCover);
  const weekShare = daysLeftInWeek / daysToCover;
  const monthShare = daysLeftInMonth / daysToCover;

  const safeToSpendThisWeek =
    remainingUntilPayday > 0
      ? Math.min(safeToSpendToday * daysLeftInWeek, remainingUntilPayday)
      : 0;
  const safeToSpendThisMonth =
    remainingUntilPayday > 0
      ? Math.min(safeToSpendToday * daysLeftInMonth, remainingUntilPayday)
      : 0;

  let projectedShortfallDays: number | null = null;
  const averageDaily = spentThisCycle / Math.max(daysElapsed, 1);
  if (remainingUntilPayday < 0) {
    projectedShortfallDays = daysUntilPayday;
  } else if (spentThisCycle > 0 && daysUntilPayday > 0 && averageDaily > 0) {
    const daysAffordable = remainingUntilPayday / averageDaily;
    if (daysAffordable < daysUntilPayday) {
      projectedShortfallDays = Math.max(daysUntilPayday - Math.floor(daysAffordable), 1);
    }
  }

  const projected = remainingUntilPayday - averageDaily * Math.max(daysUntilPayday, 0);

  let trajectory: TrajectoryLabel = 'ON TARGET';
  if (projected < 0 || remainingUntilPayday < 0) trajectory = 'DEFICIT';
  else if (projectedShortfallDays != null) trajectory = 'LOW RESERVE';
  else if (projected > safeToSpendToday * 2) trajectory = 'WITH RESERVE';
  else trajectory = 'ON TARGET';

  const capacity = Math.max(spendPool, 1);
  const resourcesRemainingRatio = Math.max(Math.min(remainingUntilPayday / capacity, 1), 0);

  return {
    remainingUntilPayday,
    safeToSpendToday,
    safeToSpendThisWeek,
    safeToSpendThisMonth,
    daysLeftInWeek,
    daysLeftInMonth,
    weekShare,
    monthShare,
    daysUntilPayday,
    totalDaysInCycle,
    daysElapsed,
    cycleProgress: Math.min(Math.max(daysElapsed / totalDaysInCycle, 0), 1),
    unpaidBillsTotal,
    spentThisCycle,
    reservedTotal,
    isAtRisk: remainingUntilPayday < 0 || projectedShortfallDays != null,
    projectedShortfallDays,
    resourcesRemainingRatio,
    trajectory,
    projectedEndBalance: projected,
  };
}
