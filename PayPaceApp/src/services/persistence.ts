import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyStore, type AppStoreData } from '../models/types';

const KEY = 'paypace.app.store.v1';

export async function loadStore(): Promise<AppStoreData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyStore;
    return { ...emptyStore, ...JSON.parse(raw) } as AppStoreData;
  } catch {
    return emptyStore;
  }
}

export async function saveStore(data: AppStoreData): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}
