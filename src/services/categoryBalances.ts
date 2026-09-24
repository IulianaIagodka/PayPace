import type { DailyExpense, ExpenseCategory, PayCycle } from '../models/types';
import type { CustomCategory } from '../models/types';
import { asMoney } from './formatting';
import { allCategoryIds, categoryTitle, normalizeCategory, shouldShowCategory } from './categories';
import { ensureEnvelopes } from './envelopes';

export type CategoryBalance = {
  category: ExpenseCategory;
  title: string;
  spent: number;
  allocated: number;
  share: number; // 0..1 of total categorized spend
};

export function spendingByCategory(
  cycle: PayCycle | null,
  custom: CustomCategory[] = [],
): CategoryBalance[] {
  if (!cycle) return [];
  const ids = allCategoryIds(custom);
  const totals = new Map<ExpenseCategory, number>();
  for (const id of ids) totals.set(id, 0);

  for (const expense of cycle.expenses) {
    const category = normalizeCategory(expense.category);
    totals.set(category, (totals.get(category) ?? 0) + Math.max(asMoney(expense.amount), 0));
  }

  const allocatedByCategory = new Map<ExpenseCategory, number>();
  for (const envelope of ensureEnvelopes(cycle)) {
    const category = normalizeCategory(envelope.category);
    allocatedByCategory.set(
      category,
      (allocatedByCategory.get(category) ?? 0) + asMoney(envelope.allocated),
    );
  }

  const totalSpent = Array.from(totals.values()).reduce((sum, value) => sum + value, 0);
  return ids.map((category) => ({
    category,
    title: categoryTitle(category, { custom }),
    spent: totals.get(category) ?? 0,
    allocated: allocatedByCategory.get(category) ?? 0,
    share: totalSpent > 0 ? (totals.get(category) ?? 0) / totalSpent : 0,
  }));
}

/** Only categories with spend or a user allocation — nothing empty by default. */
export function categoryBalancesForDisplay(
  cycle: PayCycle | null,
  custom: CustomCategory[] = [],
): CategoryBalance[] {
  return spendingByCategory(cycle, custom)
    .filter((r) => shouldShowCategory(r.spent, r.allocated))
    .sort((a, b) => b.spent - a.spent || b.allocated - a.allocated);
}

export function groupExpensesByCategory(expenses: DailyExpense[]) {
  const map = new Map<ExpenseCategory, DailyExpense[]>();
  for (const expense of expenses) {
    const category = normalizeCategory(expense.category);
    const list = map.get(category) ?? [];
    list.push(expense);
    map.set(category, list);
  }
  return map;
}
