export const records = new Map<string, string>();
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = "mock-native-storage";
export async function getItemAsync(key: string) {
  return records.get(key) ?? null;
}
export async function setItemAsync(
  key: string,
  value: string,
  _options?: unknown,
) {
  records.set(key, value);
}
