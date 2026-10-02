/**
 * Guarantees Maestro / debug seed numbers stay aligned.
 * Run: npm run test:e2e-seed
 *
 * Imports constants only (Node strip-types cannot load Metro extensionless graphs).
 */
import { E2E_SEED } from '../src/services/e2eSeedConstants.ts';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`E2E SEED FAIL: ${msg}`);
}

assert(E2E_SEED.balance === 3000, `balance ${E2E_SEED.balance}`);
assert(E2E_SEED.daysUntilPayday === 15, `days ${E2E_SEED.daysUntilPayday}`);
assert(
  E2E_SEED.balance / E2E_SEED.daysUntilPayday === E2E_SEED.expectedSafeToday,
  `safeToday ${E2E_SEED.expectedSafeToday}`,
);
assert(E2E_SEED.currencyCode === 'USD', 'currency');

console.log('e2eSeed.test.mts OK');
