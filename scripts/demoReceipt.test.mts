/**
 * Demo receipt / statement fixtures stay one-category and non-empty.
 * Mirrors src/services/demoFixtures.ts sample lists (Node cannot load that file’s
 * extensionless Metro imports).
 * Run: npm run test:demo-receipt
 */
import { guessCategory } from '../src/services/categories.ts';
import {
  dominantReceiptCategory,
  withReceiptCategory,
} from '../src/services/receiptCategory.ts';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`DEMO FIXTURE FAIL: ${msg}`);
}

const receiptSamples = [
  { name: 'Milk 2.5%', amount: 42 },
  { name: 'White bread', amount: 28 },
  { name: 'Hard cheese', amount: 96 },
  { name: 'Americano', amount: 65 },
  { name: 'Uber Trip', amount: 120 },
  { name: 'Bananas 1kg', amount: 55 },
  { name: 'Yogurt', amount: 31 },
];

const items = receiptSamples.map((s, index) => ({
  id: `demo-${index}`,
  name: s.name,
  amount: s.amount,
  category: guessCategory(s.name),
}));
const unified = withReceiptCategory(
  {
    merchant: 'Demo Market',
    total: items.reduce((sum, item) => sum + item.amount, 0),
    items,
    source: 'demo' as const,
  },
  dominantReceiptCategory(items),
);

assert(unified.items.length === receiptSamples.length, 'receipt item count');
assert(new Set(unified.items.map((i) => i.category)).size === 1, 'one category');
assert((unified.total ?? 0) > 0, 'receipt total');

const statementNames = ['Biedronka', 'Żabka', 'Uber Trip', 'Netflix', 'Orlen Fuel', 'McDonalds'];
assert(statementNames.every((n) => guessCategory(n) !== undefined), 'statement categories');
assert(guessCategory('Biedronka') === 'groceries' || guessCategory('Biedronka') === 'food' || guessCategory('Biedronka') === 'shopping' || guessCategory('Biedronka') === 'other', 'biedronka guessed');

console.log('demoReceipt.test.mts OK');
