import type { DailyExpense, ExpenseScope, Household } from '../models/types';

export type PersonFilter = 'all' | 'mine' | 'partner';
export type ScopeFilter = 'all' | 'shared' | 'personal';

/** Missing scope = shared (older data / imports). */
export function expenseScopeOf(expense: Pick<DailyExpense, 'scope'>): ExpenseScope {
  return expense.scope === 'personal' ? 'personal' : 'shared';
}

/** Personal expenses are logged but do not draw from the shared pool. */
export function countsTowardSharedPool(expense: Pick<DailyExpense, 'scope'>): boolean {
  return expenseScopeOf(expense) === 'shared';
}

export function partnerMemberId(
  household: Household | null | undefined,
  localMemberId: string | null | undefined,
): string | null {
  if (!household || !localMemberId) return null;
  return household.members.find((m) => m.id !== localMemberId)?.id ?? null;
}

export function filterExpenses(
  expenses: DailyExpense[],
  opts: {
    viewerMemberId?: string | null;
    partnerMemberId?: string | null;
    person?: PersonFilter;
    scope?: ScopeFilter;
  },
): DailyExpense[] {
  const person = opts.person ?? 'all';
  const scope = opts.scope ?? 'all';
  return expenses.filter((expense) => {
    if (scope !== 'all' && expenseScopeOf(expense) !== scope) return false;
    if (person === 'all') return true;
    if (person === 'mine') {
      if (!opts.viewerMemberId) return true;
      return expense.memberId === opts.viewerMemberId;
    }
    if (!opts.partnerMemberId) return false;
    return expense.memberId === opts.partnerMemberId;
  });
}
