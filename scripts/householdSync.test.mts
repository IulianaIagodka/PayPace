/**
 * Shared-household sync policy tests.
 * Run: npm run test:sync
 */

import {
  HOUSEHOLD_POLL_MS,
  shouldSkipStaleUpsert,
} from '../src/services/householdSyncPolicy.ts';

let passed = 0;

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  passed += 1;
}

function assertEq<T>(actual: T, expected: T, msg: string) {
  if (actual !== expected) {
    throw new Error(
      `FAIL: ${msg} (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`,
    );
  }
  passed += 1;
}

assertEq(HOUSEHOLD_POLL_MS, 20 * 60 * 1000, 'poll is 20 minutes');
assert(!shouldSkipStaleUpsert(5, null), 'no remote → write');
assert(!shouldSkipStaleUpsert(5, undefined), 'undefined remote → write');
assert(!shouldSkipStaleUpsert(5, 5), 'equal revision → write');
assert(!shouldSkipStaleUpsert(6, 5), 'local ahead → write');
assert(shouldSkipStaleUpsert(4, 5), 'local behind → skip');
assert(shouldSkipStaleUpsert(0, 1), 'zero behind → skip');

console.log(`Household sync tests: ${passed} assertions passed`);
console.log('E2E household sync: PASS');
