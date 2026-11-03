import { requireNativeModule } from 'expo';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

type NativeCrypto = { pbkdf2(password: string, saltHex: string, iterations: number): Promise<string> };
let verified: Promise<NativeCrypto> | undefined;
async function nativeCrypto(): Promise<NativeCrypto> {
  if (!verified) verified = (async () => {
    const native = requireNativeModule<NativeCrypto>('PourCrypto');
    // Known PBKDF2-HMAC-SHA256 vector, checked on the real device once per run.
    const vector = await native.pbkdf2('password', '73616c74', 1);
    if (vector !== '120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b') throw new Error('The device cryptographic self-check failed.');
    return native;
  })();
  return verified;
}
export async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const native = await nativeCrypto();
  return hexToBytes(await native.pbkdf2(password, bytesToHex(salt), iterations));
}
