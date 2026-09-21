import { addDays, addMonths, differenceInCalendarDays, startOfDay } from 'date-fns';
import type { PayCycle, PaySchedule, SafeSpendSnapshot, TrajectoryLabel } from './types';
import { asMoney, fromDateKey } from '../services/formatting';

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

export function calculateSafeSpend(cycle: PayCycle, now = new Date()): SafeSpendSnapshot {
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

  const projectedEndBalance =
    remainingUntilPayday - averageDaily * daysUntilPayday + (spentThisCycle > 0 ? 0 : 0);
  // Simpler projection: remaining - (avg daily * days left)
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
