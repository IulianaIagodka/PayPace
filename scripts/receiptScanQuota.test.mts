import assert from 'node:assert/strict';
import {
  FREE_RECEIPT_SCAN_LIMIT,
  canScanReceipt,
  freeReceiptScansRemaining,
  freeReceiptScansUsed,
} from '../src/services/receiptScanQuota.ts';

function assertEq<T>(actual: T, expected: T, msg: string) {
  assert.equal(actual, expected, msg);
}

assertEq(FREE_RECEIPT_SCAN_LIMIT, 3, 'free limit is 3');
assertEq(freeReceiptScansUsed({}), 0, 'missing count → 0');
assertEq(freeReceiptScansUsed({ freeReceiptScansUsed: 2.9 }), 2, 'floors count');
assertEq(freeReceiptScansUsed({ freeReceiptScansUsed: -1 }), 0, 'clamps negative');

assertEq(canScanReceipt({ isPremium: true, freeReceiptScansUsed: 99 }), true, 'Plus unlimited');
assertEq(canScanReceipt({ isPremium: false, freeReceiptScansUsed: 0 }), true, 'free 0/3 ok');
assertEq(canScanReceipt({ isPremium: false, freeReceiptScansUsed: 2 }), true, 'free 2/3 ok');
assertEq(canScanReceipt({ isPremium: false, freeReceiptScansUsed: 3 }), false, 'free 3/3 blocked');

assertEq(freeReceiptScansRemaining({ isPremium: true, freeReceiptScansUsed: 0 }), null, 'Plus null');
assertEq(freeReceiptScansRemaining({ isPremium: false, freeReceiptScansUsed: 1 }), 2, '2 left');
assertEq(freeReceiptScansRemaining({ isPremium: false, freeReceiptScansUsed: 3 }), 0, '0 left');

console.log('receiptScanQuota.test.mts: ok');
