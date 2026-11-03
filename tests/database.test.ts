import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  initialize,
  db,
  readAll,
  reserveInvoice,
  checkout,
  saveProduct,
  changeStatus,
  deleteProduct,
} from "../src/database/db.ts";
import { analytics } from "../src/utils/domain.ts";
import type { Item, Payment } from "../src/types/index.ts";
import { schema, ordersTableSql } from '../src/database/schema.ts';
import { mkdtempSync, unlinkSync, rmdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAll, useDatabaseFile } from "./sqlite-adapter.ts";

beforeEach(async () => {
  await initialize();
});
async function draft() {
  await saveProduct("owner", {
    id: "initial-1",
    name: "Drink 1",
    description: "",
    price: 7550,
    available: 1,
    image: null,
  });
  return {
    ...(await reserveInvoice()),
    items: [
      { productId: "initial-1", name: "Drink 1", price: 7550, quantity: 2 },
    ] as Item[],
    customer: "A customer",
    staff: "Counter staff",
    account: "owner",
    payment: "Cash" as Payment,
  };
}
test("initialization seeds exactly two products once and enables foreign keys", async () => {
  const data = await readAll();
  assert.equal(data.products.length, 2);
  assert.deepEqual(
    data.products.map((p) => p.name),
    ["Drink 1", "Drink 2"],
  );
  assert.equal(data.orders.length, 0);
  assert.equal(
    (await db().getFirstAsync<{ foreign_keys: number }>("PRAGMA foreign_keys"))
      ?.foreign_keys,
    1,
  );
});
test("checkout commits one order and both audit records despite repeated presses", async () => {
  const input = await draft();
  await Promise.all(Array.from({ length: 5 }, () => checkout(input)));
  const data = await readAll();
  assert.equal(data.orders.length, 1);
  assert.equal(data.orders[0].status, "In Queue");
  assert.equal(data.orders[0].total, 15100);
  assert.equal(
    data.audits.filter((a) => a.action === "Order created").length,
    1,
  );
  assert.equal(
    data.audits.filter((a) => a.action === "Payment recorded").length,
    1,
  );
  assert.equal(data.orders[0].account, "owner");
  assert.equal(data.orders[0].staff, "Counter staff");
});
test("an audit write failure rolls the payment and order back together", async () => {
  const input = await draft();
  await db().execAsync(
    "CREATE TRIGGER simulate_full BEFORE INSERT ON audits WHEN NEW.action='Payment recorded' BEGIN SELECT RAISE(ABORT, 'simulated disk full'); END;",
  );
  await assert.rejects(checkout(input), /simulated disk full/);
  let data = await readAll();
  assert.equal(data.orders.length, 0);
  assert.equal(
    data.audits.filter((a) => a.action === "Order created").length,
    0,
  );
  await db().execAsync("DROP TRIGGER simulate_full");
  await checkout(input);
  data = await readAll();
  assert.equal(data.orders.length, 1);
});
test("unavailable and repriced products cannot pass checkout", async () => {
  const input = await draft();
  await saveProduct("owner", {
    id: "initial-1",
    name: "Drink 1",
    description: "",
    price: 7550,
    available: 0,
    image: null,
  });
  await assert.rejects(checkout(input), /unavailable/);
  await saveProduct("owner", {
    id: "initial-1",
    name: "Drink 1",
    description: "",
    price: 9000,
    available: 1,
    image: null,
  });
  await assert.rejects(checkout(input), /changed/);
  assert.equal((await readAll()).orders.length, 0);
});
test("empty orders, missing names and invalid payments fail atomically", async () => {
  const input = await draft();
  await assert.rejects(checkout({ ...input, items: [] }));
  await assert.rejects(checkout({ ...input, customer: " " }));
  await assert.rejects(checkout({ ...input, payment: "Invalid" as Payment }));
  assert.equal((await readAll()).orders.length, 0);
});
test("discarded invoice reservations are never reused", async () => {
  const first = await reserveInvoice(),
    second = await reserveInvoice();
  assert.ok(second.id > first.id);
  assert.notEqual(first.invoice, second.invoice);
  const input = await draft();
  await checkout(input);
  const after = await reserveInvoice();
  assert.ok(after.id > input.id);
});
test("paid item snapshots survive product name and price changes", async () => {
  const input = await draft();
  await checkout(input);
  await saveProduct("owner", {
    id: "initial-1",
    name: "House drink",
    description: "New description",
    price: 9999,
    available: 0,
    image: null,
  });
  const receipt = (await readAll()).orders[0];
  assert.equal(receipt.items[0].name, "Drink 1");
  assert.equal(receipt.items[0].price, 7550);
  assert.equal(receipt.total, 15100);
});
test("pipeline enforces forward sequence and finalized Done receipts preserve completed sales", async () => {
  const input = await draft();
  await checkout(input);
  await assert.rejects(changeStatus("owner", input.id, "Done"));
  for (const status of ["In Progress", "Ready", "Serving", "Done"] as const)
    await changeStatus("owner", input.id, status);
  let data = await readAll();
  assert.ok(data.orders[0].completedAt);
  assert.equal(
    analytics(data.orders, { from: "2000-01-01", to: "2099-12-31" }).sales,
    15100,
  );
  await assert.rejects(changeStatus("owner", input.id, "In Progress"), /finalized/);
  data = await readAll();
  assert.ok(data.orders[0].completedAt);
  assert.equal(
    analytics(data.orders, { from: "2000-01-01", to: "2099-12-31" }).sales,
    15100,
  );
  assert.equal(
    data.audits.filter((a) => a.action === "Status changed").length,
    4,
  );
});
test("SQLite constraints protect append-only audits, receipts, quantities and status rules", async () => {
  const input = await draft();
  await checkout(input);
  await assert.rejects(db().runAsync("DELETE FROM audits"), /append-only/);
  await assert.rejects(
    db().runAsync("UPDATE audits SET action='changed'"),
    /append-only/,
  );
  await assert.rejects(
    db().runAsync("UPDATE order_items SET quantity=7"),
    /immutable/,
  );
  await assert.rejects(db().runAsync("UPDATE orders SET total=0"), /immutable/);
  await assert.rejects(
    db().runAsync("UPDATE orders SET status='Done',completedAt='2026-11-03'"),
    /one status/,
  );
});
test("new drinks and product edits are validated and audited", async () => {
  await saveProduct("owner", {
    name: "Calamansi soda",
    description: "Fresh citrus",
    price: 4500,
    available: 1,
    image: null,
  });
  assert.equal((await readAll()).products.length, 3);
  await assert.rejects(
    saveProduct("owner", {
      name: "calamansi soda",
      description: "",
      price: 4500,
      available: 1,
      image: null,
    }),
    /already/,
  );
  await assert.rejects(
    saveProduct("owner", {
      name: "Negative",
      description: "",
      price: -1,
      available: 1,
      image: null,
    }),
  );
  assert.ok(
    (await readAll()).audits.some(
      (a) => a.action === "Product created" && a.related === "Calamansi soda",
    ),
  );
});
test("Unicode drink names use the same uniqueness rules as portable backups", async () => {
  await saveProduct("owner", { name: "Pandán", description: "", price: 5000, available: 1, image: null });
  await assert.rejects(saveProduct("owner", { name: "PANDÁN", description: "", price: 5000, available: 1, image: null }), /already/);
});

test("removing a sold drink preserves history and blocks stale carts; failed audit rolls removal back", async () => {
  const input = await draft();
  await checkout(input);
  await db().execAsync("CREATE TRIGGER fail_delete_audit BEFORE INSERT ON audits WHEN NEW.action='Product deleted' BEGIN SELECT RAISE(ABORT, 'audit failure'); END;");
  await assert.rejects(deleteProduct('owner', 'initial-1'), /audit failure/);
  assert.equal((await readAll()).products.length, 2);
  await db().execAsync('DROP TRIGGER fail_delete_audit');
  await deleteProduct('owner', 'initial-1');
  const data = await readAll();
  assert.equal(data.products.length, 1);
  assert.equal(data.orders[0].items[0].name, 'Drink 1');
  assert.equal(data.orders[0].total, 15100);
  assert.ok(data.audits.some(event => event.action === 'Product deleted'));
  await assert.rejects(checkout({ ...input, ...await reserveInvoice() }), /unavailable/);
  await assert.rejects(saveProduct('owner', { ...data.products[0], id: 'initial-1', name: 'Removed drink' }), /no longer exists/);
  await saveProduct('owner', { name: 'Drink 1', description: 'Replacement product', price: 8000, available: 1, image: null });
  assert.equal((await readAll()).products.length, 2);
  assert.equal((await readAll()).orders[0].total, 15100);
});

test("version-one database upgrades without losing orders, audit records or invoice sequence", async () => {
  const directory = mkdtempSync(join(tmpdir(), 'pour-migration-'));
  const file = join(directory, 'legacy.db');
  useDatabaseFile(file);
  try {
    await initialize();
    const input = await draft();
    await checkout(input);
    const before = await readAll();
    await db().execAsync('ALTER TABLE products DROP COLUMN deleted; PRAGMA user_version=1;');
    closeAll();
    await initialize();
    assert.deepEqual(await readAll(), before);
    assert.equal((await db().getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version, 4);
    assert.ok((await reserveInvoice()).id > input.id);
  } finally {
    closeAll(); useDatabaseFile(null);
    for (const suffix of ['', '-wal', '-shm']) if (existsSync(file + suffix)) unlinkSync(file + suffix);
    rmdirSync(directory);
  }
});
test("database reopen preserves sales, item snapshots, logs and invoice sequence without reseeding", async () => {
  const directory = mkdtempSync(join(tmpdir(), "pour-persistence-"));
  const file = join(directory, "pour-test.db");
  useDatabaseFile(file);
  try {
    await initialize();
    const input = await draft();
    await checkout(input);
    await changeStatus("owner", input.id, "In Progress");
    const before = await readAll();
    closeAll();
    await initialize();
    const after = await readAll();
    assert.deepEqual(after, before);
    assert.equal(after.products.length, 2);
    assert.ok((await reserveInvoice()).id > input.id);
  } finally {
    closeAll();
    useDatabaseFile(null);
    for (const suffix of ["", "-wal", "-shm"])
      if (existsSync(file + suffix)) unlinkSync(file + suffix);
    rmdirSync(directory);
  }
});


test('version-two four-stage database upgrades with paid item references and historical completion intact', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'rositrus-serving-migration-'));
  const file = join(directory, 'legacy.db');
  useDatabaseFile(file);
  try {
    await initialize();
    const first = await draft(); await checkout(first);
    const second = await draft(); await checkout(second);
    for (const input of [first, second]) {
      await changeStatus('counter', input.id, 'In Progress');
      await changeStatus('counter', input.id, 'Ready');
    }
    const legacyTable = ordersTableSql('orders_legacy').replace("'Ready','Serving','Done'", "'Ready','Done'");
    const legacySchema = schema.replace("'Ready','Serving','Done'", "'Ready','Done'").replaceAll("WHEN 'Serving' THEN 3 ELSE 4", 'ELSE 3');
    await db().execAsync('PRAGMA foreign_keys=OFF; BEGIN EXCLUSIVE; ' + legacyTable + ' INSERT INTO orders_legacy SELECT * FROM orders; DROP TABLE orders; ALTER TABLE orders_legacy RENAME TO orders; ' + legacySchema + ' PRAGMA user_version=2; COMMIT; PRAGMA foreign_keys=ON;');
    await db().runAsync("UPDATE orders SET status='Done',completedAt=? WHERE id=?", '2026-11-03T05:00:00.000Z', second.id);
    const before = await readAll();
    closeAll(); await initialize();
    assert.deepEqual(await readAll(), before);
    assert.equal((await db().getFirstAsync<{foreign_keys:number}>('PRAGMA foreign_keys'))?.foreign_keys, 1);
    assert.deepEqual(await db().getAllAsync('PRAGMA foreign_key_check'), []);
    await assert.rejects(changeStatus('counter', first.id, 'Done'));
    await assert.rejects(db().runAsync("UPDATE orders SET status='Done',completedAt=? WHERE id=?", '2026-11-03T06:00:00.000Z', first.id), /one status/);
    await changeStatus('counter', first.id, 'Serving');
    let serving = (await readAll()).orders.find(order => order.id === first.id)!;
    assert.equal(serving.completedAt, null);
    assert.equal(analytics([serving], {from:'2000-01-01',to:'2099-12-31'}).sales, 0);
    await changeStatus('counter', first.id, 'Done');
    await assert.rejects(changeStatus('counter', first.id, 'Serving'), /finalized/);
    serving = (await readAll()).orders.find(order => order.id === first.id)!;
    assert.ok(serving.completedAt);
    assert.equal(serving.items[0].price, 7550);
    assert.ok((await reserveInvoice()).id > second.id);
    await assert.rejects(db().runAsync('DELETE FROM order_items'), /immutable/);
    await assert.rejects(db().runAsync('UPDATE orders SET total=0'), /immutable/);
  } finally {
    closeAll(); useDatabaseFile(null);
    for (const suffix of ['', '-wal', '-shm']) if (existsSync(file + suffix)) unlinkSync(file + suffix);
    rmdirSync(directory);
  }
});

test('version-three Done receipts become final without changing completion dates, sales or audits', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'rositrus-final-migration-'));
  const file = join(directory, 'legacy.db');
  useDatabaseFile(file);
  try {
    await initialize();
    const input = await draft(); await checkout(input);
    for (const stage of ['In Progress', 'Ready', 'Serving', 'Done'] as const) await changeStatus('counter', input.id, stage);
    await db().execAsync('DROP TRIGGER order_done_final; PRAGMA user_version=3;');
    const before = await readAll();
    closeAll(); await initialize();
    assert.deepEqual(await readAll(), before);
    for (const stage of ['In Queue', 'In Progress', 'Ready', 'Serving'] as const) {
      await assert.rejects(changeStatus('counter', input.id, stage), /finalized/);
      await assert.rejects(db().runAsync('UPDATE orders SET status=?,completedAt=NULL WHERE id=?', stage, input.id), /finalized/);
    }
    await assert.rejects(db().runAsync('UPDATE orders SET completedAt=? WHERE id=?', '2026-11-03T09:00:00.000Z', input.id), /finalized/);
    await changeStatus('counter', input.id, 'Done');
    assert.deepEqual(await readAll(), before);
    assert.equal((await db().getFirstAsync<{user_version:number}>('PRAGMA user_version'))?.user_version, 4);
  } finally {
    closeAll(); useDatabaseFile(null);
    for (const suffix of ['', '-wal', '-shm']) if (existsSync(file + suffix)) unlinkSync(file + suffix);
    rmdirSync(directory);
  }
});
