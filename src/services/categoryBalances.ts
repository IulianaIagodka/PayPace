import type { DailyExpense, ExpenseCategory, PayCycle } from '../models/types';
import type { CustomCategory } from '../models/types';
import { asMoney } from './formatting';
import { allCategoryIds, categoryTitle } from './categories';

export type CategoryBalance = {
  category: ExpenseCategory;
  title: string;
  spent: number;
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
    const category = expense.category ?? 'other';
    totals.set(category, (totals.get(category) ?? 0) + Math.max(asMoney(expense.amount), 0));
  }

  const totalSpent = Array.from(totals.values()).reduce((sum, value) => sum + value, 0);
  return ids.map((category) => ({
    category,
    title: categoryTitle(category, { custom }),
    spent: totals.get(category) ?? 0,
    share: totalSpent > 0 ? (totals.get(category) ?? 0) / totalSpent : 0,
  }));
}

/** Show categories with spend; if none yet, show the main shopping set at 0. */
export function categoryBalancesForDisplay(
  cycle: PayCycle | null,
  custom: CustomCategory[] = [],
): CategoryBalance[] {
  const rows = spendingByCategory(cycle, custom);
  const withSpend = rows.filter((r) => r.spent > 0).sort((a, b) => b.spent - a.spent);
  if (withSpend.length) return withSpend;
  const defaults: ExpenseCategory[] = ['groceries', 'food', 'transport', 'subscriptions', 'other'];
  return rows.filter((r) => defaults.includes(r.category));
}

export function groupExpensesByCategory(expenses: DailyExpense[]) {
  const map = new Map<ExpenseCategory, DailyExpense[]>();
  for (const expense of expenses) {
    const category = expense.category ?? 'other';
    const list = map.get(category) ?? [];
    list.push(expense);
    map.set(category, list);
  }
  return map;
}
