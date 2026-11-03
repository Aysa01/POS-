import { readCredentials, writeCredentials } from './credentials';
import * as Crypto from "expo-crypto";
import { deriveKey } from "./keyDerivation";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { db, audit, serialized, putSetting, transaction } from "../database/db";
import type { Account } from "../types";

const ITERATIONS = 600_000;
export async function account(): Promise<Account | null> {
  const raw = await readCredentials();
  return raw ? (JSON.parse(raw) as Account) : null;
}
function validate(username: string, password: string) {
  if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username))
    throw new Error(
      "Username must have 3–40 letters, numbers, dots, dashes or underscores.",
    );
  if (password.length < 12 || password.length > 128)
    throw new Error(
      "Use a password of 12–128 characters. A long, unique passphrase works well.",
    );
}
async function hashed(password: string, salt: string, iterations: number) {
  return bytesToHex(
    await deriveKey(password, hexToBytes(salt), iterations),
  );
}
async function matches(record: Account, password: string) {
  const value = await hashed(password, record.salt, record.iterations);
  let mismatch = value.length ^ record.hash.length;
  for (let i = 0; i < value.length; i++)
    mismatch |= value.charCodeAt(i) ^ (record.hash.charCodeAt(i) || 0);
  return mismatch === 0;
}
export async function setup(username: string, password: string) {
  username = username.trim();
  validate(username, password);
  if (await account())
    throw new Error("This device already has an account. Sign in instead.");
  const salt = bytesToHex(await Crypto.getRandomBytesAsync(32));
  const record: Account = {
    username,
    salt,
    hash: await hashed(password, salt, ITERATIONS),
    iterations: ITERATIONS,
  };
  await writeCredentials(JSON.stringify(record));
  await serialized(() => audit(db(), username, "Account configured"));
}
export async function login(
  username: string,
  password: string,
): Promise<string> {
  const record = await account();
  if (!record) throw new Error("Set up this device first.");
  const lock = await serialized(async () => {
    const raw = await db().getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key=?",
      "login-lock",
    );
    return raw
      ? (JSON.parse(raw.value) as { attempts: number; until: number })
      : { attempts: 0, until: 0 };
  });
  if (lock.until > Date.now())
    throw new Error(
      `Too many attempts. Try again in ${Math.ceil((lock.until - Date.now()) / 1000)} seconds.`,
    );
  const valid = await matches(record, password);
  if (username.trim() !== record.username || !valid) {
    const attempts = lock.until ? 1 : lock.attempts + 1;
    await serialized(async () =>
      transaction(async (tx) => {
        await tx.runAsync(
          "INSERT INTO settings VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
          "login-lock",
          JSON.stringify({
            attempts,
            until: attempts >= 5 ? Date.now() + 60_000 : 0,
          }),
        );
        await audit(
          tx,
          "(unauthenticated)",
          "Login failed",
          "",
          "",
          "",
          "",
          `Attempted username: ${username.trim().slice(0, 40)}`,
        );
      }),
    );
    throw new Error(
      "The username or password is incorrect. Five failed attempts pause sign-in for one minute.",
    );
  }
  await serialized(async () =>
    transaction(async (tx) => {
      await tx.runAsync("DELETE FROM settings WHERE key=?", "login-lock");
      await audit(tx, record.username, "Login succeeded");
    }),
  );
  return record.username;
}
export async function changeAccount(
  current: string,
  username: string,
  password: string,
) {
  const old = await account();
  if (!old) throw new Error("Account is missing.");
  // Reuse rate-limited sign-in verification for sensitive account changes.
  await login(old.username, current);
  validate(username.trim(), password);
  const salt = bytesToHex(await Crypto.getRandomBytesAsync(32));
  const next: Account = {
    username: username.trim(),
    salt,
    hash: await hashed(password, salt, ITERATIONS),
    iterations: ITERATIONS,
  };
  await writeCredentials(JSON.stringify(next));
  await serialized(async () => {
    await putSetting("login-lock", JSON.stringify({ attempts: 0, until: 0 }));
    await audit(
      db(),
      old.username,
      "Account changed",
      "",
      old.username,
      next.username,
    );
  });
  return next.username;
}
