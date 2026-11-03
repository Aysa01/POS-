import * as SQLite from "expo-sqlite";
import * as Crypto from "expo-crypto";
import { schema, SCHEMA_VERSION, ordersTableSql } from "./schema";
import type {
  Audit,
  Data,
  Item,
  Order,
  Payment,
  Product,
  Status,
} from "../types";
import { canMove, totalItems } from "../utils/domain";

let connection: SQLite.SQLiteDatabase;
let queue: Promise<unknown> = Promise.resolve();
// Serializing reads and writes prevents UI refreshes observing partial work.
export function serialized<T>(work: () => Promise<T>): Promise<T> {
  const result = queue.then(work);
  queue = result.catch(() => undefined);
  return result;
}
export const db = () => {
  if (!connection) throw new Error("Database is not ready.");
  return connection;
};
// Call inside serialized(), except during startup before screens are mounted.
// Keep the configured connection: Expo's exclusive helper opens a new one,
// whose per-connection foreign_keys/busy_timeout pragmas would be reset.
export async function transaction(work: (tx: SQLite.SQLiteDatabase) => Promise<void>) {
  const connection = db();
  await connection.execAsync("BEGIN EXCLUSIVE");
  try {
    await work(connection);
    await connection.execAsync("COMMIT");
  } catch (error) {
    await connection.execAsync("ROLLBACK");
    throw error;
  }
}
export function initialize() {
  return serialized(async () => {
  const previous = connection;
  // Activity recreation can retain JS modules while invalidating native handles.
  // Never obtain a pooled handle from a previous Android activity/context.
  connection = await SQLite.openDatabaseAsync("pour.db", { useNewConnection: true });
  if (previous) await previous.closeAsync().catch(() => undefined);
  await connection.execAsync(
    "PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;",
  );
  const version = await connection.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  if ((version?.user_version ?? 0) > SCHEMA_VERSION)
    throw new Error(
      "This database needs a newer version of Rositrus. Install the newer APK to open it.",
    );
  const legacyOrders = (version?.user_version ?? 0) < 3 && !!await connection.getFirstAsync("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'");
  // SQLite requires foreign keys disabled outside the transaction when rebuilding
  // a referenced table. Keep paid items and every existing order ID unchanged.
  if (legacyOrders) await connection.execAsync('PRAGMA foreign_keys=OFF');
  try {
  await transaction(async (tx) => {
    if (legacyOrders) {
      await tx.execAsync(ordersTableSql('orders_next'));
      await tx.execAsync('INSERT INTO orders_next SELECT * FROM orders; DROP TABLE orders; ALTER TABLE orders_next RENAME TO orders;');
    }
    await tx.execAsync(schema);
    const columns = await tx.getAllAsync<{ name: string }>("PRAGMA table_info(products)");
    if (!columns.some(column => column.name === "deleted"))
      await tx.execAsync("ALTER TABLE products ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0 CHECK(deleted IN (0,1))");
    const seeded = await tx.getFirstAsync(
      "SELECT value FROM settings WHERE key = ?",
      "seeded",
    );
    if (!seeded) {
      for (let i = 1; i <= 2; i++)
        await tx.runAsync(
          "INSERT INTO products (id,name,description,price,available) VALUES (?,?,?,?,1)",
          `initial-${i}`,
          `Drink ${i}`,
          "Edit this drink to add your description and price.",
          0,
        );
      await tx.runAsync("INSERT INTO settings VALUES (?,?)", "seeded", "1");
    }
    await tx.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    if ((await tx.getAllAsync('PRAGMA foreign_key_check')).length)
      throw new Error('The database upgrade could not preserve its references. Existing records were retained.');
  });
  } finally {
    if (legacyOrders) await connection.execAsync('PRAGMA foreign_keys=ON');
  }
  });
}
export async function audit(
  tx: SQLite.SQLiteDatabase,
  account: string,
  action: string,
  related = "",
  previous = "",
  next = "",
  staff = "",
  description = "",
) {
  await tx.runAsync(
    "INSERT INTO audits (at,account,staff,action,related,previous,next,description) VALUES (?,?,?,?,?,?,?,?)",
    new Date().toISOString(),
    account,
    staff,
    action,
    related,
    previous,
    next,
    description,
  );
}
export const logEvent = (account: string, action: string, description = "") =>
  serialized(() => audit(db(), account, action, "", "", "", "", description));
export const getSetting = (key: string) =>
  serialized(
    async () =>
      (
        await db().getFirstAsync<{ value: string }>(
          "SELECT value FROM settings WHERE key=?",
          key,
        )
      )?.value,
  );
export const putSetting = (key: string, value: string) =>
  db().runAsync(
    "INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    key,
    value,
  );
export async function readAll(): Promise<Data> {
  return serialized(async () => {
    const products = await db().getAllAsync<Product>(
      "SELECT * FROM products WHERE deleted=0 ORDER BY rowid",
    );
    const rows = await db().getAllAsync<Omit<Order, "items">>(
      "SELECT * FROM orders ORDER BY id DESC",
    );
    const items = await db().getAllAsync<Item & { orderId: number }>(
      "SELECT * FROM order_items",
    );
    const byOrder = new Map<number, Item[]>();
    for (const item of items)
      byOrder.set(item.orderId, [...(byOrder.get(item.orderId) ?? []), item]);
    const orders: Order[] = rows.map((o) => ({
      ...o,
      items: byOrder.get(o.id) ?? [],
    }));
    const audits = await db().getAllAsync<Audit>(
      "SELECT * FROM audits ORDER BY id DESC",
    );
    return { products, orders, audits };
  });
}
export function reserveInvoice(): Promise<{ id: number; invoice: string }> {
  return serialized(async () => {
    const result = await db().runAsync("INSERT INTO invoices DEFAULT VALUES");
    return {
      id: result.lastInsertRowId,
      invoice: `POS-${String(result.lastInsertRowId).padStart(6, "0")}`,
    };
  });
}
export async function saveProduct(
  account: string,
  input: Omit<Product, "id"> & { id?: string },
) {
  return serialized(async () =>
    transaction(async (tx) => {
      const name = input.name.trim();
      if (!name || name.length > 80 || input.description.length > 500)
        throw new Error(
          "Use a drink name of 1–80 characters and a description up to 500 characters.",
        );
      if (
        !Number.isSafeInteger(input.price) ||
        input.price < 0 ||
        input.price > 999999999
      )
        throw new Error("Enter a valid price.");
      // SQLite lower() only folds ASCII by default. Match backup validation
      // for Unicode names as well, so every valid menu can be restored.
      const names = await tx.getAllAsync<Pick<Product, "id" | "name">>("SELECT id,name FROM products WHERE deleted=0");
      const conflict = names.find(p => p.id !== input.id && p.name.toLowerCase() === name.toLowerCase());
      if (conflict) throw new Error("Another drink already has that name.");
      const old = input.id
        ? await tx.getFirstAsync<Product>(
            "SELECT * FROM products WHERE id=?",
            input.id,
          )
        : null;
      if (input.id && (!old || old.deleted))
        throw new Error("This product no longer exists. Reopen the menu.");
      const id = input.id ?? Crypto.randomUUID();
      await tx.runAsync(
        `INSERT INTO products(id,name,description,price,available,image) VALUES (?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,price=excluded.price,available=excluded.available,image=excluded.image`,
        id,
        name,
        input.description.trim(),
        input.price,
        input.available ? 1 : 0,
        input.image,
      );
      await audit(
        tx,
        account,
        old ? "Product edited" : "Product created",
        name,
        old ? JSON.stringify(old) : "",
        JSON.stringify({ ...input, id }),
      );
      if (old && old.price !== input.price)
        await audit(
          tx,
          account,
          "Price changed",
          name,
          String(old.price),
          String(input.price),
        );
      if (old && old.available !== input.available)
        await audit(
          tx,
          account,
          "Availability changed",
          name,
          String(old.available),
          String(input.available),
        );
    }),
  );
}
// Retain the row and its photo so paid item references and backup history stay valid.
export function deleteProduct(account: string, id: string) {
  return serialized(() => transaction(async tx => {
    const old = await tx.getFirstAsync<Product>("SELECT * FROM products WHERE id=?", id);
    if (!old || old.deleted) throw new Error("This drink is already removed from the menu.");
    await tx.runAsync("UPDATE products SET deleted=1,available=0 WHERE id=?", id);
    await audit(tx, account, "Product deleted", old.name, JSON.stringify(old), "Removed from menu; historical records retained");
  }));
}
export function checkout(input: {
  id: number;
  invoice: string;
  items: Item[];
  customer: string;
  staff: string;
  payment: Payment;
  account: string;
}): Promise<void> {
  return serialized(async () =>
    transaction(async (tx) => {
      const existing = await tx.getFirstAsync(
        "SELECT id FROM orders WHERE id=?",
        input.id,
      );
      if (existing) return; // Reservation is the persisted idempotency key.
      if (input.invoice !== `POS-${String(input.id).padStart(6, "0")}`)
        throw new Error("Invalid invoice reservation.");
      const reservation = await tx.getFirstAsync(
        "SELECT id FROM invoices WHERE id=?",
        input.id,
      );
      if (!reservation)
        throw new Error("Invoice was not reserved. Reopen checkout.");
      if (
        !input.customer.trim() ||
        !input.staff.trim() ||
        input.customer.trim().length > 100 ||
        input.staff.trim().length > 100
      )
        throw new Error(
          "Customer and staff names are required (up to 100 characters).",
        );
      const total = totalItems(input.items);
      for (const item of input.items) {
        const product = await tx.getFirstAsync<Product>(
          "SELECT * FROM products WHERE id=?",
          item.productId,
        );
        if (!product?.available || product.deleted)
          throw new Error(
            `${item.name} is unavailable. Remove it from this order.`,
          );
        if (product.price !== item.price || product.name !== item.name)
          throw new Error(
            `${item.name} changed. Remove and reselect it to confirm the current price.`,
          );
      }
      await tx.runAsync(
        `INSERT INTO orders(id,invoice,customer,staff,account,payment,status,total,paid,createdAt) VALUES (?,?,?,?,?,?,'In Queue',?,1,?)`,
        input.id,
        input.invoice,
        input.customer.trim(),
        input.staff.trim(),
        input.account,
        input.payment,
        total,
        new Date().toISOString(),
      );
      for (const item of input.items)
        await tx.runAsync(
          "INSERT INTO order_items(orderId,productId,name,price,quantity) VALUES (?,?,?,?,?)",
          input.id,
          item.productId,
          item.name,
          item.price,
          item.quantity,
        );
      await audit(
        tx,
        input.account,
        "Order created",
        input.invoice,
        "",
        "In Queue",
        input.staff,
      );
      await audit(
        tx,
        input.account,
        "Payment recorded",
        input.invoice,
        "",
        `${input.payment}: ${total} centavos`,
        input.staff,
        "Operator confirmed payment received; no remote payment processing.",
      );
    }),
  );
}
export function changeStatus(account: string, id: number, next: Status) {
  return serialized(async () =>
    transaction(async (tx) => {
      const old = await tx.getFirstAsync<Order>(
        "SELECT * FROM orders WHERE id=?",
        id,
      );
      if (!old) throw new Error("Order no longer exists.");
      if (old.status === next) return;
      if (old.status === 'Done') throw new Error('This receipt is finalized and cannot be moved.');
      if (!canMove(old.status, next))
        throw new Error(
          "Move forward one stage at a time. You may move backward when needed.",
        );
      await tx.runAsync(
        "UPDATE orders SET status=?,completedAt=? WHERE id=?",
        next,
        next === "Done" ? new Date().toISOString() : null,
        id,
      );
      await audit(
        tx,
        account,
        "Status changed",
        old.invoice,
        old.status,
        next,
        old.staff,
      );
    }),
  );
}
