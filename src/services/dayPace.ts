/**
 * PayPace day pacing — today's budget is predictable, the future is adaptive.
 *
 * At day open the daily allowance is locked from the morning pool.
 * Today's spend only burns that allowance. Future days re-pace from whatever
 * remains after today's leftover is still reserved for today.
 */

export type DayPaceLock = {
  /** Local calendar date YYYY-MM-DD */
  date: string;
  /** Locked daily allowance for that date (not reduced by spend). */
  allowance: number;
  /** Morning spend pool used to compute allowance (excludes today's spend). */
  poolAtDayStart?: number;
  /** Days-until-payday used to compute allowance. */
  daysToCover?: number;
};

export function sumAmounts(amounts: number[]): number {
  return amounts.reduce((s, n) => s + (Number.isFinite(n) && n > 0 ? n : 0), 0);
}

export function spentOnDate(
  expenses: Array<{ date: string; amount: number }>,
  dateKey: string,
): number {
  return sumAmounts(
    expenses.filter((e) => e.date.slice(0, 10) === dateKey).map((e) => e.amount),
  );
}

export function spentBeforeDate(
  expenses: Array<{ date: string; amount: number }>,
  dateKey: string,
): number {
  return sumAmounts(
    expenses.filter((e) => e.date.slice(0, 10) < dateKey).map((e) => e.amount),
  );
}

/** Morning pool ÷ days left until payday. */
export function lockDailyAllowance(poolAtDayStart: number, daysToCover: number): number {
  const days = Math.max(daysToCover, 1);
  if (!(poolAtDayStart > 0)) return 0;
  return poolAtDayStart / days;
}

/** Remaining of today's locked allowance after today's spend (may be negative). */
export function todayBudgetRemaining(allowance: number, spentToday: number): number {
  return allowance - Math.max(spentToday, 0);
}

/**
 * Money still available for days after today.
 * Underspend keeps leftover reserved for today (future unchanged).
 * Overspend eats into the future immediately.
 */
export function remainingForFutureDays(
  remainingUntilPayday: number,
  todayLeft: number,
): number {
  const reservedForToday = Math.max(todayLeft, 0);
  return remainingUntilPayday - reservedForToday;
}

export function adaptiveFutureDaily(
  remainingForFuture: number,
  daysAfterToday: number,
): number {
  if (daysAfterToday <= 0) return 0;
  if (!(remainingForFuture > 0)) return 0;
  return remainingForFuture / daysAfterToday;
}

/** Today leftover + adaptive rate × remaining week days after today. */
export function weekBudgetRemaining(
  todayLeft: number,
  futureDaily: number,
  daysLeftInWeek: number,
): number {
  const todayPart = Math.max(todayLeft, 0);
  const futureDays = Math.max(daysLeftInWeek - 1, 0);
  return todayPart + futureDaily * futureDays;
}

export function resolveDayPaceLock(
  existing: DayPaceLock | null | undefined,
  todayKey: string,
  poolAtDayStart: number,
  daysToCover: number,
): DayPaceLock {
  const days = Math.max(daysToCover, 1);
  const next: DayPaceLock = {
    date: todayKey,
    allowance: lockDailyAllowance(poolAtDayStart, days),
    poolAtDayStart,
    daysToCover: days,
  };

  if (!(existing && existing.date === todayKey)) {
    return next;
  }

  // Stuck 0-lock while pool is now positive → re-lock once.
  if (!(existing.allowance > 0) && poolAtDayStart > 0) {
    return next;
  }

  const priorDays = existing.daysToCover;
  const priorPool = existing.poolAtDayStart;

  // Structural edits (bills, balance, payday length) change the basis → re-lock.
  // Today's spend does not: poolAtDayStart excludes today's expenses.
  if (priorDays != null && priorPool != null && existing.allowance > 0) {
    const sameDays = priorDays === days;
    const samePool = Math.abs(priorPool - poolAtDayStart) < 0.005;
    if (sameDays && samePool) {
      return {
        ...existing,
        poolAtDayStart: priorPool,
        daysToCover: priorDays,
      };
    }
  }

  // No basis yet (legacy) or basis changed → lock from current morning inputs.
  return next;
}
