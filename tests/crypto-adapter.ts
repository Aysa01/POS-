import { randomBytes, randomUUID as uuid } from "node:crypto";
export const randomUUID = uuid;
export async function getRandomBytesAsync(length: number) {
  return new Uint8Array(randomBytes(length));
}
