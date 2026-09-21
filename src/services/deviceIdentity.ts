import AsyncStorage from '@react-native-async-storage/async-storage';
import { newId } from './id';

const DEVICE_KEY = 'paypace.device.id.v1';

/** Stable per-install id used to identify this phone in a household. */
export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const id = newId();
  await AsyncStorage.setItem(DEVICE_KEY, id);
  return id;
}
