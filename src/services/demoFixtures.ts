/**
 * Offline demo payloads for __DEV__ / Maestro.
 * Pure Node-importable graph (categories + receiptCategory + date-fns only).
 */
import { subDays } from 'date-fns';
import type { ExpenseCategory } from '../models/types';
import { guessCategory } from './categories';
import { dominantReceiptCategory, withReceiptCategory } from './receiptCategory';

export type DemoReceiptLine = {
  id: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
};

export type DemoReceiptResult = {
  merchant?: string;
  total?: number;
  items: DemoReceiptLine[];
  source: 'demo';
};

export type DemoStatementLine = {
  id: string;
  name: string;
  amount: number;
  date?: string;
  category: ExpenseCategory;
};

export type DemoStatementResult = {
  sourceName: string;
  items: DemoStatementLine[];
  source: 'demo';
};

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function buildDemoReceiptResult(): DemoReceiptResult {
  const samples = [
    { name: 'Milk 2.5%', amount: 42 },
    { name: 'White bread', amount: 28 },
    { name: 'Hard cheese', amount: 96 },
    { name: 'Americano', amount: 65 },
    { name: 'Uber Trip', amount: 120 },
    { name: 'Bananas 1kg', amount: 55 },
    { name: 'Yogurt', amount: 31 },
  ];
  const items = samples.map((s, index) => ({
    id: `demo-${index}`,
    name: s.name,
    amount: s.amount,
    category: guessCategory(s.name),
  }));
  const withMerchant = {
    merchant: 'Demo Market',
    total: items.reduce((sum, item) => sum + item.amount, 0),
    items,
    source: 'demo' as const,
  };
  let category = dominantReceiptCategory(withMerchant.items);
  if (category === 'other' && withMerchant.merchant) {
    category = guessCategory(withMerchant.merchant);
  }
  return withReceiptCategory(withMerchant, category);
}

export function buildDemoStatementResult(fileName = 'demo-statement.csv'): DemoStatementResult {
  const today = new Date();
  const samples = [
    { name: 'Biedronka', amount: 86.4, daysAgo: 1 },
    { name: 'Żabka', amount: 24.9, daysAgo: 3 },
    { name: 'Uber Trip', amount: 31.5, daysAgo: 5 },
    { name: 'Netflix', amount: 43, daysAgo: 12 },
    { name: 'Orlen Fuel', amount: 210, daysAgo: 18 },
    { name: 'McDonalds', amount: 38.2, daysAgo: 25 },
  ];
  return {
    sourceName: fileName || 'statement.csv',
    source: 'demo',
    items: samples.map((s, index) => ({
      id: `demo-stmt-${index}`,
      name: s.name,
      amount: s.amount,
      date: dateKey(subDays(today, s.daysAgo)),
      category: guessCategory(s.name),
    })),
  };
}
