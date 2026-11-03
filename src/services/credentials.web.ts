import { getSetting, putSetting, serialized } from '../database/db';
// Browser profile storage contains a salted verifier, never a plaintext password.
const KEY = 'browser-account-v1';
export const readCredentials = async () => (await getSetting(KEY)) ?? null;
export const writeCredentials = (value: string) => serialized(async () => { await putSetting(KEY, value); });
