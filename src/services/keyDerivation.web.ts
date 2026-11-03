export async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  if (!globalThis.crypto?.subtle) throw new Error('Open Rositrus at localhost or HTTPS to use secure browser login.');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array(salt).buffer, iterations }, key, 256));
}
