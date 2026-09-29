import type { ExpenseCategory } from '../models/types';

export type StatementGroupItem = {
  id: string;
  name: string;
  amount: number;
  date?: string;
  category: ExpenseCategory;
};

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type CategoryBucket = {
  category: ExpenseCategory;
  count: number;
  total: number;
};

export type DateBucket<T extends StatementGroupItem> = {
  date: string;
  total: number;
  items: T[];
};

/** Newest date first; stable within a day. */
export function sortStatementItems<T extends StatementGroupItem>(
  items: T[],
  now = new Date(),
): T[] {
  const fallback = toDateKey(now);
  return [...items].sort((a, b) => {
    const da = a.date ?? fallback;
    const db = b.date ?? fallback;
    if (da !== db) return db.localeCompare(da);
    return a.name.localeCompare(b.name);
  });
}

export function summarizeByCategory<T extends StatementGroupItem>(items: T[]): CategoryBucket[] {
  const map = new Map<ExpenseCategory, CategoryBucket>();
  for (const item of items) {
    const prev = map.get(item.category) ?? {
      category: item.category,
      count: 0,
      total: 0,
    };
    prev.count += 1;
    prev.total += item.amount;
    map.set(item.category, prev);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));
}

/** Group sorted items under their date key (newest groups first). */
export function groupByDate<T extends StatementGroupItem>(
  items: T[],
  now = new Date(),
): DateBucket<T>[] {
  const fallback = toDateKey(now);
  const sorted = sortStatementItems(items, now);
  const order: string[] = [];
  const map = new Map<string, DateBucket<T>>();
  for (const item of sorted) {
    const date = item.date ?? fallback;
    let bucket = map.get(date);
    if (!bucket) {
      bucket = { date, total: 0, items: [] };
      map.set(date, bucket);
      order.push(date);
    }
    bucket.items.push(item);
    bucket.total += item.amount;
  }
  return order.map((d) => map.get(d)!);
}

/** True when any item date falls outside the inclusive window. */
export function hasItemsOutsideWindow<T extends StatementGroupItem>(
  items: T[],
  startKey: string,
  endKey: string,
  now = new Date(),
): boolean {
  const fallback = toDateKey(now);
  return items.some((item) => {
    const d = item.date ?? fallback;
    return d < startKey || d > endKey;
  });
}
