export const SCHEMA_VERSION = 4;
export const ordersTableSql = (name = 'orders') => `CREATE TABLE IF NOT EXISTS ${name} (
  id INTEGER PRIMARY KEY REFERENCES invoices(id), invoice TEXT UNIQUE NOT NULL,
  customer TEXT NOT NULL CHECK(length(trim(customer)) BETWEEN 1 AND 100),
  staff TEXT NOT NULL CHECK(length(trim(staff)) BETWEEN 1 AND 100), account TEXT NOT NULL,
  payment TEXT NOT NULL CHECK(payment IN ('Cash','Debit/Credit Card','QR Payment')),
  status TEXT NOT NULL CHECK(status IN ('In Queue','In Progress','Ready','Serving','Done')),
  total INTEGER NOT NULL CHECK(total BETWEEN 0 AND 999999999 AND typeof(total) = 'integer'),
  paid INTEGER NOT NULL CHECK(paid = 1), createdAt TEXT NOT NULL, completedAt TEXT,
  CHECK((status = 'Done' AND completedAt IS NOT NULL) OR (status != 'Done' AND completedAt IS NULL))
);`;
export const schema = `
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY, name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 80),
  description TEXT NOT NULL DEFAULT '', price INTEGER NOT NULL CHECK(price BETWEEN 0 AND 999999999 AND typeof(price) = 'integer'),
  available INTEGER NOT NULL CHECK(available IN (0,1)), image TEXT,
  deleted INTEGER NOT NULL DEFAULT 0 CHECK(deleted IN (0,1))
);
CREATE TABLE IF NOT EXISTS invoices (id INTEGER PRIMARY KEY AUTOINCREMENT);
${ordersTableSql()}
CREATE TABLE IF NOT EXISTS order_items (
  orderId INTEGER NOT NULL REFERENCES orders(id), productId TEXT NOT NULL REFERENCES products(id),
  name TEXT NOT NULL, price INTEGER NOT NULL CHECK(price >= 0 AND typeof(price) = 'integer'),
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 999 AND typeof(quantity) = 'integer'),
  PRIMARY KEY(orderId, productId)
);
CREATE TABLE IF NOT EXISTS audits (
  id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, account TEXT NOT NULL,
  staff TEXT NOT NULL DEFAULT '', action TEXT NOT NULL, related TEXT NOT NULL DEFAULT '',
  previous TEXT NOT NULL DEFAULT '', next TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS orders_status_date ON orders(status, completedAt);
CREATE INDEX IF NOT EXISTS audits_date ON audits(at);
CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audits BEGIN SELECT RAISE(ABORT, 'Audit records are append-only'); END;
CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audits BEGIN SELECT RAISE(ABORT, 'Audit records are append-only'); END;
CREATE TRIGGER IF NOT EXISTS order_step BEFORE UPDATE OF status ON orders
WHEN (CASE NEW.status WHEN 'In Queue' THEN 0 WHEN 'In Progress' THEN 1 WHEN 'Ready' THEN 2 WHEN 'Serving' THEN 3 ELSE 4 END) >
     (CASE OLD.status WHEN 'In Queue' THEN 0 WHEN 'In Progress' THEN 1 WHEN 'Ready' THEN 2 WHEN 'Serving' THEN 3 ELSE 4 END) + 1
BEGIN SELECT RAISE(ABORT, 'Move forward one status at a time'); END;
CREATE TRIGGER IF NOT EXISTS order_receipt_immutable BEFORE UPDATE OF invoice,customer,staff,account,payment,total,paid,createdAt ON orders
BEGIN SELECT RAISE(ABORT, 'Paid transaction details are immutable'); END;
CREATE TRIGGER IF NOT EXISTS order_done_final BEFORE UPDATE OF status,completedAt ON orders
WHEN OLD.status = 'Done' AND (NEW.status != OLD.status OR NEW.completedAt IS NOT OLD.completedAt)
BEGIN SELECT RAISE(ABORT, 'Completed orders are finalized and cannot be moved'); END;
CREATE TRIGGER IF NOT EXISTS items_no_update BEFORE UPDATE ON order_items BEGIN SELECT RAISE(ABORT, 'Receipt items are immutable'); END;
CREATE TRIGGER IF NOT EXISTS items_no_delete BEFORE DELETE ON order_items BEGIN SELECT RAISE(ABORT, 'Receipt items are immutable'); END;
`;
