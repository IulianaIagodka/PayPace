/**
 * Budget persistence integrity guards.
 * Run: npm run test:persistence
 */
import assert from 'node:assert/strict';
import {
  isMeaningfulStore,
  pickLoadSource,
  shouldRefuseEmptySave,
} from '../src/services/storeIntegrity.ts';
import type { AppStoreData } from '../src/models/types.ts';

function shell(partial: Partial<AppStoreData> & { onboard?: boolean; cycles?: number }): AppStoreData {
  return {
    settings: {
      hasCompletedOnboarding: partial.onboard ?? false,
      currencyCode: 'PLN',
      notificationsEnabled: false,
      morningReminderEnabled: true,
      billRemindersEnabled: true,
      paceWarningsEnabled: true,
      isPremium: false,
      displayName: '',
      weekStartsOn: 1,
      paceHorizon: 'week',
      customCategories: [],
      freeReceiptScansUsed: 0,
      ...(partial.settings ?? {}),
    },
    cycles: (partial.cycles ?? 0) > 0
      ? [
          {
            id: 'c1',
            schedule: 'monthly',
            startDate: '2026-09-01',
            nextPayday: '2026-10-01',
            currentBalance: 1000,
            expectedPaycheck: 0,
            savingsGoal: 0,
            emergencyBuffer: 0,
            spendingBuffer: 0,
            bills: [],
            expenses: [],
            envelopes: [],
            isActive: true,
            createdAt: '2026-09-01T00:00:00.000Z',
          },
        ]
      : [],
    household: partial.household ?? null,
    localMemberId: null,
    periodReports: [],
  };
}

assert.equal(isMeaningfulStore(shell({ onboard: true })), true, 'onboarded');
assert.equal(isMeaningfulStore(shell({ cycles: 1 })), true, 'has cycle');
assert.equal(isMeaningfulStore(shell({})), false, 'blank');

assert.equal(pickLoadSource({ primaryMeaningful: true, backupMeaningful: true }), 'primary');
assert.equal(pickLoadSource({ primaryMeaningful: false, backupMeaningful: true }), 'backup');
assert.equal(pickLoadSource({ primaryMeaningful: false, backupMeaningful: false }), 'fresh');

assert.equal(
  shouldRefuseEmptySave({
    nextMeaningful: false,
    existingMeaningful: true,
    backupMeaningful: false,
  }),
  true,
  'refuse empty over primary',
);
assert.equal(
  shouldRefuseEmptySave({
    nextMeaningful: false,
    existingMeaningful: false,
    backupMeaningful: true,
  }),
  true,
  'refuse empty when backup exists',
);
assert.equal(
  shouldRefuseEmptySave({
    allowEmpty: true,
    nextMeaningful: false,
    existingMeaningful: true,
    backupMeaningful: true,
  }),
  false,
  'allow explicit reset',
);
assert.equal(
  shouldRefuseEmptySave({
    nextMeaningful: true,
    existingMeaningful: true,
    backupMeaningful: true,
  }),
  false,
  'allow real saves',
);

console.log('persistence.test.mts: ok');
