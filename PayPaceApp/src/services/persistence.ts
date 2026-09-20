import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultSettings, emptyStore, type AppStoreData } from '../models/types';

const KEY = 'paypace.app.store.v1';

function migrate(raw: unknown): AppStoreData {
  const data = (raw ?? {}) as Partial<AppStoreData>;
  return {
    settings: { ...defaultSettings, ...(data.settings ?? {}) },
    cycles: Array.isArray(data.cycles) ? data.cycles : [],
    household: data.household ?? null,
    localMemberId: data.localMemberId ?? null,
  };
}

export async function loadStore(): Promise<AppStoreData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyStore;
    return migrate(JSON.parse(raw));
  } catch {
    return emptyStore;
  }
}

export async function saveStore(data: AppStoreData): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}
