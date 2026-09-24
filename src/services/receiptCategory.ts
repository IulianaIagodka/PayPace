import type { ExpenseCategory } from '../models/types';

type AmountCategory = {
  amount: number;
  category: ExpenseCategory;
};

/**
 * One receipt → one category. Prefer the category with the highest spend.
 */
export function dominantReceiptCategory(items: AmountCategory[]): ExpenseCategory {
  const totals = new Map<ExpenseCategory, number>();
  for (const item of items) {
    totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount);
  }
  let best: ExpenseCategory | null = null;
  let bestTotal = -1;
  for (const [category, total] of totals) {
    if (total > bestTotal) {
      best = category;
      bestTotal = total;
    }
  }
  return best ?? 'other';
}

/** Apply a single category to every line on the receipt. */
export function withReceiptCategory<T extends { items: Array<{ category: ExpenseCategory }> }>(
  result: T,
  category: ExpenseCategory,
): T {
  return {
    ...result,
    items: result.items.map((item) => ({ ...item, category })),
  };
}
