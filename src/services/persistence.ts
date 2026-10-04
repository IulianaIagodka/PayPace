import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultSettings, emptyStore, type AppStoreData, type PayCycle } from '../models/types';
import { defaultEnvelopes, ensureEnvelopes } from './envelopes';
import { asMoney } from './formatting';
import { detectDefaultCurrency, isSupportedCurrency } from './currencies';
import {
  isMeaningfulStore,
  pickLoadSource,
  shouldRefuseEmptySave,
} from './storeIntegrity';

export { isMeaningfulStore } from './storeIntegrity';

const KEY = 'paypace.app.store.v1';
const BACKUP_KEY = 'paypace.app.store.v1.bak';
const CORRUPT_KEY = 'paypace.app.store.v1.corrupt';

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
  const settings = {
    ...defaultSettings,
    ...(data.settings ?? {}),
    customCategories: Array.isArray(data.settings?.customCategories)
      ? data.settings!.customCategories
      : [],
    freeReceiptScansUsed: Math.max(
      0,
      Math.floor(Number(data.settings?.freeReceiptScansUsed) || 0),
    ),
  };
  if (!isSupportedCurrency(settings.currencyCode)) {
    settings.currencyCode = detectDefaultCurrency();
  }
  return {
    settings,
    cycles: Array.isArray(data.cycles) ? data.cycles.map((c) => migrateCycle(c as PayCycle)) : [],
    household: data.household ?? null,
    localMemberId: data.localMemberId ?? null,
    periodReports: Array.isArray(data.periodReports) ? data.periodReports : [],
    activityEvents: Array.isArray(data.activityEvents) ? data.activityEvents : [],
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

function parseRaw(raw: string): AppStoreData | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed == null || typeof parsed !== 'object') return null;
    return migrate(parsed);
  } catch {
    return null;
  }
}

async function readSlot(
  key: string,
): Promise<{ raw: string | null; data: AppStoreData | null }> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return { raw: null, data: null };
    return { raw, data: parseRaw(raw) };
  } catch {
    return { raw: null, data: null };
  }
}

/**
 * Load budget from disk.
 * Order: primary → backup → quarantine corrupt → fresh empty shell.
 */
export async function loadStore(): Promise<AppStoreData> {
  const primary = await readSlot(KEY);
  const backup = await readSlot(BACKUP_KEY);
  const source = pickLoadSource({
    primaryMeaningful: !!(primary.data && isMeaningfulStore(primary.data)),
    backupMeaningful: !!(backup.data && isMeaningfulStore(backup.data)),
  });

  if (source === 'primary' && primary.data) {
    if (primary.raw) {
      try {
        await AsyncStorage.setItem(BACKUP_KEY, primary.raw);
      } catch {
        // non-fatal
      }
    }
    return primary.data;
  }

  if (source === 'backup' && backup.data) {
    if (backup.raw) {
      try {
        await AsyncStorage.setItem(KEY, backup.raw);
      } catch {
        // still return recovered data
      }
    }
    return backup.data;
  }

  if (primary.data) return primary.data;

  if (primary.raw && !primary.data) {
    try {
      await AsyncStorage.setItem(CORRUPT_KEY, primary.raw);
    } catch {
      // ignore
    }
  }

  return freshStore();
}

export type SaveStoreOptions = {
  /** Allow writing a blank store (explicit reset only). */
  allowEmpty?: boolean;
};

/**
 * Persist store. Refuses to overwrite a meaningful budget with an empty shell
 * unless `allowEmpty`. Snapshots the previous good value to BACKUP_KEY first.
 * @returns false when the write was refused (caller must not adopt empty state).
 */
export async function saveStore(
  data: AppStoreData,
  opts?: SaveStoreOptions,
): Promise<boolean> {
  const nextRaw = JSON.stringify(data);
  const existing = await readSlot(KEY);
  const backup = await readSlot(BACKUP_KEY);

  if (
    shouldRefuseEmptySave({
      allowEmpty: opts?.allowEmpty,
      nextMeaningful: isMeaningfulStore(data),
      existingMeaningful: !!(existing.data && isMeaningfulStore(existing.data)),
      backupMeaningful: !!(backup.data && isMeaningfulStore(backup.data)),
    })
  ) {
    return false;
  }

  if (existing.raw && existing.data && isMeaningfulStore(existing.data)) {
    try {
      await AsyncStorage.setItem(BACKUP_KEY, existing.raw);
    } catch {
      // still attempt primary write
    }
  }

  await AsyncStorage.setItem(KEY, nextRaw);

  if (isMeaningfulStore(data)) {
    try {
      await AsyncStorage.setItem(BACKUP_KEY, nextRaw);
    } catch {
      // primary already written
    }
  } else if (opts?.allowEmpty) {
    try {
      await AsyncStorage.removeItem(BACKUP_KEY);
    } catch {
      // ignore
    }
  }
  return true;
}
