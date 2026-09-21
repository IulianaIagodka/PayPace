import type { DailyExpense, ExpenseCategory, PayCycle } from '../models/types';
import { asMoney } from './formatting';
import { SPENDING_CATEGORIES, categoryTitle } from './categories';

export type CategoryBalance = {
  category: ExpenseCategory;
  title: string;
  spent: number;
  share: number; // 0..1 of total categorized spend
};

export function spendingByCategory(cycle: PayCycle | null): CategoryBalance[] {
  if (!cycle) return [];
  const totals: Record<ExpenseCategory, number> = {
    rent: 0,
    utilities: 0,
    subscriptions: 0,
    loan: 0,
    childcare: 0,
    groceries: 0,
    transport: 0,
    food: 0,
    other: 0,
  };

  for (const expense of cycle.expenses) {
    const category = expense.category ?? 'other';
    totals[category] += Math.max(asMoney(expense.amount), 0);
  }

  const totalSpent = Object.values(totals).reduce((sum, value) => sum + value, 0);
  return SPENDING_CATEGORIES.map((category) => ({
    category,
    title: categoryTitle(category),
    spent: totals[category],
    share: totalSpent > 0 ? totals[category] / totalSpent : 0,
  }));
}

/** Show categories with spend; if none yet, show the main shopping set at 0. */
export function categoryBalancesForDisplay(cycle: PayCycle | null): CategoryBalance[] {
  const rows = spendingByCategory(cycle);
  const withSpend = rows.filter((r) => r.spent > 0).sort((a, b) => b.spent - a.spent);
  if (withSpend.length) return withSpend;
  return rows.filter((r) =>
    (['groceries', 'food', 'transport', 'subscriptions', 'other'] as ExpenseCategory[]).includes(
      r.category,
    ),
  );
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
