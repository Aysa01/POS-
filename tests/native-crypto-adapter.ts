import { pbkdf2Sync } from 'node:crypto';
export function requireNativeModule(_name: string) {
  return { pbkdf2: async (password: string, saltHex: string, iterations: number) => pbkdf2Sync(password, Buffer.from(saltHex, 'hex'), iterations, 32, 'sha256').toString('hex') };
}
