import * as SecureStore from 'expo-secure-store';
const KEY = 'pour.single-account.v1';
export const readCredentials = () => SecureStore.getItemAsync(KEY);
export const writeCredentials = (value: string) => SecureStore.setItemAsync(KEY, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
