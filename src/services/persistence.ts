import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultSettings, emptyStore, type AppStoreData, type PayCycle } from '../models/types';
import { defaultEnvelopes, ensureEnvelopes } from './envelopes';
import { asMoney } from './formatting';
import { detectDefaultCurrency, isSupportedCurrency } from './currencies';

const KEY = 'paypace.app.store.v1';

function migrateCycle(cycle: PayCycle): PayCycle {
  const withEnv = {
    ...cycle,
    envelopes: cycle.envelopes?.length
      ? cycle.envelopes
      : ensureEnvelopes({ ...cycle, envelopes: [] }),
  };
  if (!withEnv.envelopes.length) {
    const pool =
      asMoney(cycle.currentBalance) -
      cycle.bills.filter((b) => !b.isPaid).reduce((s, b) => s + asMoney(b.amount), 0) -
      asMoney(cycle.savingsGoal) -
      asMoney(cycle.emergencyBuffer) -
      asMoney(cycle.spendingBuffer);
    withEnv.envelopes = defaultEnvelopes(Math.max(pool, 0));
  }
  return withEnv;
}

function migrate(raw: unknown): AppStoreData {
  const data = (raw ?? {}) as Partial<AppStoreData>;
  const settings = { ...defaultSettings, ...(data.settings ?? {}) };
  if (!isSupportedCurrency(settings.currencyCode)) {
    settings.currencyCode = detectDefaultCurrency();
  }
  return {
    settings,
    cycles: Array.isArray(data.cycles) ? data.cycles.map((c) => migrateCycle(c as PayCycle)) : [],
    household: data.household ?? null,
    localMemberId: data.localMemberId ?? null,
  };
}

function freshStore(): AppStoreData {
  return {
    ...emptyStore,
    settings: {
      ...defaultSettings,
      currencyCode: detectDefaultCurrency(),
    },
  };
}

export async function loadStore(): Promise<AppStoreData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return freshStore();
    return migrate(JSON.parse(raw));
  } catch {
    return freshStore();
  }
}

export async function saveStore(data: AppStoreData): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}
