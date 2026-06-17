import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const storageKeys = {
  accessToken: 'tag.accessToken',
  refreshToken: 'tag.refreshToken',
  selectedVehicle: 'tag.selectedVehicle',
  tripDrafts: 'tag.offline.tripDrafts',
  user: 'tag.user'
} as const;

export type StorageKey = (typeof storageKeys)[keyof typeof storageKeys];

export async function getStoredString(key: StorageKey) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

export async function setStoredString(key: StorageKey, value: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export async function removeStoredValue(key: StorageKey) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export async function getStoredJson<TValue>(key: StorageKey) {
  const value = await getStoredString(key);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as TValue;
  } catch {
    await removeStoredValue(key);
    return null;
  }
}

export async function setStoredJson<TValue>(key: StorageKey, value: TValue) {
  await setStoredString(key, JSON.stringify(value));
}

export async function clearStoredValues(keys: StorageKey[]) {
  await Promise.all(keys.map((key) => removeStoredValue(key)));
}
