/**
 * Pure Spend-tab grouping: by calendar day or by category / envelope.
 * No cross-service imports so Node unit tests can load this module directly.
 */

import type { DailyExpense, ExpenseCategory } from '../models/types';

export type SpendGroupMode = 'day' | 'category';

export type SpendGroup<T extends DailyExpense = DailyExpense> = {
  key: string;
  items: T[];
  total: number;
};

/** Stable key for category grouping (envelope when present, else category). */
export function expenseCategoryKey(expense: DailyExpense): string {
  if (expense.envelopeKey) return String(expense.envelopeKey);
  return String((expense.category as ExpenseCategory | undefined) ?? 'other');
}

/** Match Home category rail → Spend filter (envelope key or category id). */
export function expenseMatchesSpendFilter(
  expense: DailyExpense,
  filterKey: string,
): boolean {
  const needle = String(filterKey);
  if (!needle) return true;
  if (expense.envelopeKey != null && String(expense.envelopeKey) === needle) return true;
  return String((expense.category as ExpenseCategory | undefined) ?? 'other') === needle;
}

function sortExpensesNewestFirst(expenses: DailyExpense[]): DailyExpense[] {
  return [...expenses].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.updatedAt ?? b.date).localeCompare(a.updatedAt ?? a.date);
  });
}

/** Newest day first; within a day newest update first. */
export function groupExpensesByDay(expenses: DailyExpense[]): SpendGroup[] {
  const list = sortExpensesNewestFirst(expenses);
  const order: string[] = [];
  const map = new Map<string, DailyExpense[]>();
  for (const expense of list) {
    const key = expense.date;
    const bucket = map.get(key);
    if (!bucket) {
      map.set(key, [expense]);
      order.push(key);
    } else {
      bucket.push(expense);
    }
  }
  return order.map((key) => {
    const items = map.get(key)!;
    return {
      key,
      items,
      total: items.reduce((sum, e) => sum + e.amount, 0),
    };
  });
}

/** Highest spend first; ties by key. Within a category, newest first. */
export function groupExpensesByCategory(expenses: DailyExpense[]): SpendGroup[] {
  const list = sortExpensesNewestFirst(expenses);
  const order: string[] = [];
  const map = new Map<string, DailyExpense[]>();
  for (const expense of list) {
    const key = expenseCategoryKey(expense);
    const bucket = map.get(key);
    if (!bucket) {
      map.set(key, [expense]);
      order.push(key);
    } else {
      bucket.push(expense);
    }
  }
  const groups = order.map((key) => {
    const items = map.get(key)!;
    return {
      key,
      items,
      total: items.reduce((sum, e) => sum + e.amount, 0),
    };
  });
  groups.sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
  return groups;
}

export function groupExpenses(
  expenses: DailyExpense[],
  mode: SpendGroupMode,
): SpendGroup[] {
  return mode === 'category' ? groupExpensesByCategory(expenses) : groupExpensesByDay(expenses);
}

export function filterExpensesForSpend(
  expenses: DailyExpense[],
  categoryFilter?: string | null,
): DailyExpense[] {
  if (!categoryFilter) return expenses;
  return expenses.filter((e) => expenseMatchesSpendFilter(e, categoryFilter));
}
