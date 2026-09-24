import assert from 'node:assert/strict';
import {
  dominantReceiptCategory,
  withReceiptCategory,
} from '../src/services/receiptCategory.ts';

function assertEq<T>(actual: T, expected: T, msg: string) {
  assert.equal(actual, expected, msg);
}

assertEq(
  dominantReceiptCategory([
    { amount: 10, category: 'food' },
    { amount: 40, category: 'groceries' },
    { amount: 5, category: 'food' },
  ]),
  'groceries',
  'picks highest spend category',
);

assertEq(
  dominantReceiptCategory([
    { amount: 10, category: 'other' },
    { amount: 5, category: 'other' },
  ]),
  'other',
  'all-other stays other',
);

const sample = {
  merchant: 'Biedronka',
  total: 50,
  items: [
    { id: '1', name: 'Milk', amount: 20, category: 'groceries' as const },
    { id: '2', name: 'Coffee', amount: 30, category: 'food' as const },
  ],
};

const unified = withReceiptCategory(sample, 'groceries');
assertEq(unified.items.every((i) => i.category === 'groceries'), true, 'all lines share category');
assertEq(unified.items.length, 2, 'keeps line items');

console.log('receiptOneCategory.test.mts: ok');
