import * as FS from './fileAccess';
import { pickBackup } from './fileAccess';
import * as Crypto from "expo-crypto";
import { gcm } from "@noble/ciphers/aes";
import { deriveKey } from "./keyDerivation";
import { utf8ToBytes, bytesToUtf8 } from "@noble/hashes/utils";
import { base64 } from "@scure/base";
import { z } from "zod";
import { audit, db, serialized, transaction } from "../database/db";
import { imagesDirectory, saveImageData } from "./images";
import {
  payments,
  statuses,
  type Audit,
  type Order,
  type Product,
} from "../types";
import { totalItems } from "../utils/domain";

const integer = z.number().int().nonnegative().max(999999999);
const id = z.string().min(1).max(100);
const timestamp = z.string().datetime();
const itemSchema = z.object({
  productId: id,
  name: z.string().min(1).max(80),
  price: integer,
  quantity: z.number().int().min(1).max(999),
});
const productSchema = z.object({
  id,
  name: z.string().trim().min(1).max(80),
  description: z.string().max(500),
  price: integer,
  available: z.union([z.literal(0), z.literal(1)]),
  image: z.string().max(8_000_000).nullable(),
  deleted: z.union([z.literal(0), z.literal(1)]).default(0),
});
const orderSchema = z.object({
  id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  invoice: z.string(),
  customer: z.string().trim().min(1).max(100),
  staff: z.string().trim().min(1).max(100),
  account: z.string().min(1).max(100),
  payment: z.enum(payments),
  status: z.enum(statuses),
  total: integer,
  paid: z.literal(1),
  createdAt: timestamp,
  completedAt: timestamp.nullable(),
  items: z.array(itemSchema).min(1).max(1000),
});
const auditSchema = z.object({
  id: z.number().int().positive(),
  at: timestamp,
  account: z.string().max(100),
  staff: z.string().max(100),
  action: z.string().max(100),
  related: z.string().max(200),
  previous: z.string().max(20000),
  next: z.string().max(20000),
  description: z.string().max(20000),
});
const backupSchema = z.object({
  version: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  exportedAt: timestamp,
  highWater: z
    .number()
    .int()
    .nonnegative()
    .max(Number.MAX_SAFE_INTEGER - 1),
  products: z.array(productSchema).max(10000),
  orders: z.array(orderSchema).max(100000),
  audits: z.array(auditSchema).max(500000),
});
const envelopeSchema = z.object({
  format: z.literal("pour-encrypted-v1"),
  salt: z.string().max(100),
  nonce: z.string().max(100),
  ciphertext: z.string().max(80_000_000),
});
const KDF_ITERATIONS = 600_000;
async function key(passphrase: string, salt: Uint8Array) {
  if (passphrase.length < 12 || passphrase.length > 128)
    throw new Error("Use a backup passphrase of 12–128 characters.");
  return deriveKey(passphrase, salt, KDF_ITERATIONS);
}
export async function exportBackup(account: string, passphrase: string) {
  const salt = await Crypto.getRandomBytesAsync(32),
    nonce = await Crypto.getRandomBytesAsync(12);
  const derived = await key(passphrase, salt);
  let payload: unknown;
  await serialized(async () => {
    const products = await db().getAllAsync<Product>("SELECT * FROM products");
    let photoBytes = 0;
    const photos = [];
    for (const product of products) {
      let image: string | null = null;
      if (product.image) {
        const info = await FS.getInfoAsync(product.image);
        if (!info.exists)
          throw new Error(
            `Photo for ${product.name} is missing. Replace the image before backing up.`,
          );
        photoBytes += info.size ?? 0;
        if (photoBytes > 35 * 1024 * 1024)
          throw new Error(
            "Photo data exceeds the 35 MB portable backup limit. Use smaller product photos.",
          );
        image = await FS.readAsStringAsync(product.image, {
          encoding: FS.EncodingType.Base64,
        });
      }
      photos.push({ ...product, image });
    }
    const rows = await db().getAllAsync<Order>("SELECT * FROM orders");
    const orders = [];
    for (const row of rows)
      orders.push({
        ...row,
        items: await db().getAllAsync(
          "SELECT productId,name,price,quantity FROM order_items WHERE orderId=?",
          row.id,
        ),
      });
    const seq = await db().getFirstAsync<{ seq: number }>(
      "SELECT seq FROM sqlite_sequence WHERE name=?",
      "invoices",
    );
    payload = {
      version: 4,
      exportedAt: new Date().toISOString(),
      highWater: seq?.seq ?? 0,
      products: photos,
      orders,
      audits: await db().getAllAsync<Audit>("SELECT * FROM audits"),
    };
  });
  const bytes = utf8ToBytes(JSON.stringify(payload));
  if (bytes.length > 50 * 1024 * 1024)
    throw new Error("Backup exceeds the 50 MB portable backup limit.");
  let ciphertext: Uint8Array;
  try {
    ciphertext = gcm(derived, nonce).encrypt(bytes);
  } finally {
    derived.fill(0);
  }
  const encoded = JSON.stringify({
    format: "pour-encrypted-v1",
    salt: base64.encode(salt),
    nonce: base64.encode(nonce),
    ciphertext: base64.encode(ciphertext),
  });
  const permission =
    await FS.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) return false;
  const uri = await FS.StorageAccessFramework.createFileAsync(
    permission.directoryUri,
    `rositrus-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.pour`,
    "application/octet-stream",
  );
  await FS.writeAsStringAsync(uri, encoded);
  await serialized(() =>
    audit(
      db(),
      account,
      "Backup exported",
      "",
      "",
      "",
      "",
      "Passphrase-encrypted manual export. Device credentials excluded.",
    ),
  );
  return true;
}
export async function importBackup(account: string, passphrase: string) {
  const picked = await pickBackup();
  if (picked.canceled) return false;
  const uri = picked.assets[0].uri;
  const info = await FS.getInfoAsync(uri);
  if (!info.exists || (info.size ?? 0) > 75 * 1024 * 1024)
    throw new Error("Backup is missing or exceeds 75 MB.");
  const envelope = envelopeSchema.parse(
    JSON.parse(await FS.readAsStringAsync(uri)),
  );
  const salt = base64.decode(envelope.salt),
    nonce = base64.decode(envelope.nonce);
  if (salt.length !== 32 || nonce.length !== 12)
    throw new Error("Invalid encrypted backup header.");
  const derived = await key(passphrase, salt);
  let plain: Uint8Array;
  try {
    plain = gcm(derived, nonce).decrypt(base64.decode(envelope.ciphertext));
  } catch {
    throw new Error(
      "Incorrect passphrase or damaged backup. No data was changed.",
    );
  } finally {
    derived.fill(0);
  }
  const backup = backupSchema.parse(JSON.parse(bytesToUtf8(plain)));
  const productIds = new Set(backup.products.map((p) => p.id));
  if (productIds.size !== backup.products.length || !productIds.size)
    throw new Error("Backup has duplicate or missing products.");
  if (
    new Set(backup.products.filter(p => !p.deleted).map((p) => p.name.toLowerCase())).size !==
    backup.products.filter(p => !p.deleted).length
  )
    throw new Error("Backup has duplicate drink names.");
  if (new Set(backup.orders.map((o) => o.id)).size !== backup.orders.length)
    throw new Error("Backup has duplicate invoices.");
  for (const o of backup.orders) {
    if (
      o.id > backup.highWater ||
      o.invoice !== `POS-${String(o.id).padStart(6, "0")}` ||
      totalItems(o.items) !== o.total ||
      o.items.some((i) => !productIds.has(i.productId)) ||
      (o.status === "Done") !== (o.completedAt !== null) ||
      (o.completedAt && o.completedAt < o.createdAt)
    )
      throw new Error(
        "Backup failed order-integrity validation. No data was changed.",
      );
  }
  const created: string[] = [];
  try {
    await serialized(async () => {
      const count = await db().getFirstAsync<{ n: number }>(
        "SELECT count(*) AS n FROM orders",
      );
      const current = await db().getAllAsync<Product>("SELECT * FROM products");
      const untouched =
        current.length === 2 &&
        current.every(
          (p) =>
            /^initial-[12]$/.test(p.id) &&
            p.name === `Drink ${p.id.slice(-1)}` &&
            p.price === 0 &&
            p.available === 1 &&
            !p.image &&
            p.description ===
              "Edit this drink to add your description and price.",
        );
      if (count?.n || !untouched)
        throw new Error(
          "Restore is available only on a fresh device before adding orders or editing the menu. Export this device first.",
        );
      await FS.makeDirectoryAsync(imagesDirectory(), { intermediates: true });
      const products: Product[] = [];
      for (const p of backup.products) {
        let image: string | null = null;
        if (p.image) {
          if (base64.decode(p.image).length > 5 * 1024 * 1024)
            throw new Error("A backup photo exceeds 5 MB.");
          image = await saveImageData(p.image);
          created.push(image);
        }
        products.push({ ...p, image });
      }
      await transaction(async (tx) => {
        await tx.runAsync("DELETE FROM products");
        for (const p of products)
          await tx.runAsync(
            "INSERT INTO products (id,name,description,price,available,image,deleted) VALUES (?,?,?,?,?,?,?)",
            p.id,
            p.name,
            p.description,
            p.price,
            p.available,
            p.image,
            p.deleted ?? 0,
          );
        for (const o of backup.orders) {
          await tx.runAsync(
            "INSERT OR IGNORE INTO invoices(id) VALUES (?)",
            o.id,
          );
          await tx.runAsync(
            "INSERT INTO orders VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            o.id,
            o.invoice,
            o.customer,
            o.staff,
            o.account,
            o.payment,
            o.status,
            o.total,
            o.paid,
            o.createdAt,
            o.completedAt,
          );
          for (const i of o.items)
            await tx.runAsync(
              "INSERT INTO order_items VALUES (?,?,?,?,?)",
              o.id,
              i.productId,
              i.name,
              i.price,
              i.quantity,
            );
        }
        if (backup.highWater)
          await tx.runAsync(
            "INSERT OR IGNORE INTO invoices(id) VALUES (?)",
            backup.highWater,
          );
        for (const a of backup.audits)
          await tx.runAsync(
            "INSERT INTO audits(at,account,staff,action,related,previous,next,description) VALUES (?,?,?,?,?,?,?,?)",
            a.at,
            a.account,
            a.staff,
            a.action,
            a.related,
            a.previous,
            a.next,
            `[Imported log ${a.id}] ${a.description}`,
          );
        await audit(
          tx,
          account,
          "Backup imported",
          "",
          "",
          "",
          "",
          `Validated v${backup.version} backup from ${backup.exportedAt}. Local audit entries retained.`,
        );
      });
    });
    return true;
  } catch (error) {
    for (const path of created)
      await FS.deleteAsync(path, { idempotent: true }).catch(() => undefined);
    throw error;
  } finally {
    await FS.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
  }
}
