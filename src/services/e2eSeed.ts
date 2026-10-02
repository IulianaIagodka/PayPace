/**
 * Deterministic local store for debug / Maestro E2E.
 * Balance 3000 · 15 days to payday · no bills/reserves → safe today ≈ 200.
 */
import { addDays, startOfDay } from 'date-fns';
import { newId } from './id';
import { defaultEnvelopes } from './envelopes';
import { toDateKey } from './formatting';
import { E2E_SEED } from './e2eSeedConstants';
import {
  defaultSettings,
  type AppStoreData,
  type PayCycle,
} from '../models/types';

export { E2E_SEED } from './e2eSeedConstants';

export function buildE2eDemoCycle(now = new Date()): PayCycle {
  const today = startOfDay(now);
  const nextPayday = startOfDay(addDays(today, E2E_SEED.daysUntilPayday));
  const balance = E2E_SEED.balance;
  const stamp = now.toISOString();
  return {
    id: newId(),
    schedule: 'monthly',
    startDate: toDateKey(today),
    nextPayday: toDateKey(nextPayday),
    currentBalance: balance,
    expectedPaycheck: 0,
    savingsGoal: 0,
    emergencyBuffer: 0,
    spendingBuffer: 0,
    bills: [],
    expenses: [],
    envelopes: defaultEnvelopes(balance),
    isActive: true,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

export function buildE2eDemoStore(now = new Date()): AppStoreData {
  const cycle = buildE2eDemoCycle(now);
  return {
    settings: {
      ...defaultSettings,
      hasCompletedOnboarding: true,
      currencyCode: E2E_SEED.currencyCode,
      isPremium: false,
      displayName: E2E_SEED.displayName,
    },
    cycles: [cycle],
    household: null,
    localMemberId: null,
    periodReports: [],
  };
}
