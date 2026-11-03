import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  initialize,
  readAll,
  checkout,
  saveProduct,
  reserveInvoice,
  changeStatus,
  deleteProduct,
} from "../src/database/db.ts";
import { exportBackup, importBackup } from "../src/services/backup.ts";
import {
  files,
  lastExport,
  writeAsStringAsync,
  readAsStringAsync,
} from "./file-adapter.ts";
import { select } from "./picker-adapter.ts";
import { gcm } from '@noble/ciphers/aes';
import { base64 } from '@scure/base';
import { utf8ToBytes, bytesToUtf8 } from '@noble/hashes/utils';
import { deriveKey } from '../src/services/keyDerivation.ts';
import { randomBytes } from 'node:crypto';

const passphrase = "keep this backup safely";
beforeEach(async () => {
  files.clear();
  select("");
  await initialize();
});
test("encrypted portable backup restores transactions, photos, audit trail and invoice sequence", async () => {
  await writeAsStringAsync(
    "file:///private/products/photo.jpg",
    "a local photo",
  );
  await saveProduct("owner", {
    id: "initial-1",
    name: "Drink 1",
    description: "",
    price: 6500,
    available: 1,
    image: "file:///private/products/photo.jpg",
  });
  const invoice = await reserveInvoice();
  await checkout({
    ...invoice,
    customer: "Customer",
    staff: "Counter",
    account: "owner",
    payment: "QR Payment",
    items: [
      { productId: "initial-1", name: "Drink 1", price: 6500, quantity: 2 },
    ],
  });
  for (const status of ["In Progress", "Ready", "Serving", "Done"] as const)
    await changeStatus("owner", invoice.id, status);
  const abandoned = await reserveInvoice();
  assert.equal(await exportBackup("owner", passphrase), true);
  const encrypted = await readAsStringAsync(lastExport);
  assert.equal(encrypted.includes("Customer"), false);
  assert.equal(encrypted.includes("a local photo"), false);
  await initialize();
  await writeAsStringAsync("file:///cache/restore.pour", encrypted);
  select("file:///cache/restore.pour");
  assert.equal(await importBackup("new-owner", passphrase), true);
  const restored = await readAll();
  assert.equal(restored.orders.length, 1);
  assert.equal(restored.orders[0].total, 13000);
  assert.equal(restored.orders[0].status, "Done");
  assert.equal(
    await readAsStringAsync(restored.products[0].image!),
    "a local photo",
  );
  assert.ok(
    restored.audits.some((a) => a.description.includes("[Imported log")),
  );
  assert.ok(
    restored.audits.some(
      (a) => a.action === "Backup imported" && a.account === "new-owner",
    ),
  );
  assert.ok((await reserveInvoice()).id > abandoned.id);
});
test("wrong backup passphrase cannot mutate the receiving database", async () => {
  await exportBackup("owner", passphrase);
  const encrypted = await readAsStringAsync(lastExport);
  await initialize();
  await writeAsStringAsync("file:///cache/wrong.pour", encrypted);
  select("file:///cache/wrong.pour");
  await assert.rejects(
    importBackup("owner", "the wrong passphrase"),
    /Incorrect passphrase/,
  );
  const data = await readAll();
  assert.equal(data.products.length, 2);
  assert.equal(data.orders.length, 0);
});

test('portable backup retains deleted products for paid receipts without restoring them to the menu', async () => {
  const product = (await readAll()).products[0];
  const reservation = await reserveInvoice();
  await checkout({ ...reservation, account: 'counter', customer: 'Guest', staff: 'Staff', payment: 'Cash', items: [{ productId: product.id, name: product.name, price: product.price, quantity: 1 }] });
  await deleteProduct('counter', product.id);
  await saveProduct('counter', { name: product.name, description: 'Replacement', price: 8000, available: 1, image: null });
  await exportBackup('counter', passphrase);
  const encrypted = await readAsStringAsync(lastExport);
  await initialize();
  await writeAsStringAsync('file:///cache/archive.pour', encrypted);
  select('file:///cache/archive.pour');
  await importBackup('counter', passphrase);
  const data = await readAll();
  assert.equal(data.products.length, 2);
  assert.equal(data.products.some(p => p.id === product.id), false);
  assert.equal(data.orders[0].items[0].name, product.name);
});

test('legacy version-one backups without removed-product flags still restore', async () => {
  await exportBackup('counter', passphrase);
  const envelope = JSON.parse(await readAsStringAsync(lastExport));
  const key = await deriveKey(passphrase, base64.decode(envelope.salt), 600000);
  const payload = JSON.parse(bytesToUtf8(gcm(key, base64.decode(envelope.nonce)).decrypt(base64.decode(envelope.ciphertext))));
  payload.version = 1;
  for (const product of payload.products) delete product.deleted;
  const nonce = randomBytes(12);
  envelope.nonce = base64.encode(nonce);
  envelope.ciphertext = base64.encode(gcm(key, nonce).encrypt(utf8ToBytes(JSON.stringify(payload))));
  await initialize();
  await writeAsStringAsync('file:///cache/legacy.pour', JSON.stringify(envelope));
  select('file:///cache/legacy.pour');
  await importBackup('counter', passphrase);
  assert.equal((await readAll()).products.length, 2);
});

test('serving orders survive encrypted backup and complete only after moving to Done', async () => {
  await saveProduct('counter', { id: 'initial-1', name: 'Drink 1', description: '', price: 6500, available: 1, image: null });
  const reservation = await reserveInvoice();
  await checkout({ ...reservation, account: 'counter', customer: 'Serving customer', staff: 'Staff', payment: 'Cash', items: [{ productId: 'initial-1', name: 'Drink 1', price: 6500, quantity: 1 }] });
  for (const status of ['In Progress', 'Ready', 'Serving'] as const) await changeStatus('counter', reservation.id, status);
  await exportBackup('counter', passphrase);
  const encrypted = await readAsStringAsync(lastExport);
  await initialize();
  await writeAsStringAsync('file:///cache/serving.pour', encrypted);
  select('file:///cache/serving.pour');
  await importBackup('counter', passphrase);
  const restored = (await readAll()).orders[0];
  assert.equal(restored.status, 'Serving');
  assert.equal(restored.completedAt, null);
  assert.equal(restored.total, 6500);
  await changeStatus('counter', restored.id, 'Done');
  assert.ok((await readAll()).orders[0].completedAt);
});
test("restore refuses to overwrite a customized counter", async () => {
  await exportBackup("owner", passphrase);
  const encrypted = await readAsStringAsync(lastExport);
  await saveProduct("owner", {
    id: "initial-1",
    name: "My drink",
    description: "",
    price: 5000,
    available: 1,
    image: null,
  });
  await writeAsStringAsync("file:///cache/existing.pour", encrypted);
  select("file:///cache/existing.pour");
  await assert.rejects(importBackup("owner", passphrase), /fresh device/);
  assert.equal((await readAll()).products[0].name, "My drink");
});
test("corrupt backup and cancelled picker leave local data alone", async () => {
  assert.equal(await importBackup("owner", passphrase), false);
  await writeAsStringAsync("file:///cache/broken.pour", "{broken");
  select("file:///cache/broken.pour");
  await assert.rejects(importBackup("owner", passphrase));
  assert.equal((await readAll()).orders.length, 0);
});
